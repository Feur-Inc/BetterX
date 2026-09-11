import { setTimeout as delay } from "node:timers/promises";
import type { BrowserWindow } from "electron";
import { extractSnapshot } from "../mcp/extract.js";
import { SessionIndex } from "../mcp/index-store.js";
import { type Command, type Snapshot, isReadablePage } from "../mcp/protocol.js";

export class AgentController {
  private index = new SessionIndex();
  constructor(private getWindow: () => BrowserWindow | null) {}
  clear() {
    this.index.clear();
  }

  private window() {
    const win = this.getWindow();
    if (!win || win.isDestroyed()) throw new Error("Open the BetterX main window first");
    return win;
  }

  private async read(signal: AbortSignal): Promise<Snapshot> {
    signal.throwIfAborted();
    const win = this.window();
    const expected = win.webContents.getURL();
    if (!isReadablePage(expected)) {
      this.clear();
      throw new Error(
        "This page is outside agent access. Open bookmarks or an X post; log in manually if needed."
      );
    }
    // Check again inside the renderer to close the navigation race.
    const code = `(() => { if (location.href !== ${JSON.stringify(expected)}) throw new Error('Page changed; retry'); return (${extractSnapshot.toString()})(document, location.href); })()`;
    const snapshot = (await win.webContents.executeJavaScriptInIsolatedWorld(1001, [
      { code },
    ])) as Snapshot;
    signal.throwIfAborted();
    if (snapshot.view === "unsupported") {
      this.clear();
      throw new Error("This tab is outside agent access. Select Bookmarks in History, not Likes.");
    }
    if (win.webContents.getURL() !== expected) {
      this.clear();
      throw new Error("Page changed during reading; retry");
    }
    this.index.observe(snapshot);
    return snapshot;
  }

  private async navigate(url: string, signal: AbortSignal) {
    signal.throwIfAborted();
    const win = this.window();
    const hasDraft = await win.webContents.executeJavaScriptInIsolatedWorld(1001, [
      {
        code: `Boolean(document.querySelector('[contenteditable="true"][data-testid^="tweetTextarea"]')?.textContent?.trim() || document.querySelector('[data-testid="attachments"]'))`,
      },
    ]);
    if (hasDraft) throw new Error("Finish or discard your draft manually before agent navigation");
    signal.throwIfAborted();
    const cancelLoad = () => {
      if (!win.isDestroyed()) win.webContents.stop();
    };
    signal.addEventListener("abort", cancelLoad, { once: true });
    try {
      await win.loadURL(url);
    } finally {
      signal.removeEventListener("abort", cancelLoad);
    }
    signal.throwIfAborted();
    if (url === "https://x.com/i/bookmarks") {
      // Select the known Bookmarks tab after X's redirect, never a caller-supplied target.
      const until = Date.now() + 5000;
      while (new URL(win.webContents.getURL()).pathname === "/i/history") {
        signal.throwIfAborted();
        const selected = await win.webContents.executeJavaScriptInIsolatedWorld(1001, [
          {
            code: `(() => { if(location.origin !== 'https://x.com' || location.pathname !== '/i/history') return false; const tab = Array.from(document.querySelectorAll('[role="tab"]')).find(el => el.textContent.trim() === 'Bookmarks'); if(!tab) return false; if(tab.getAttribute('aria-selected') !== 'true') tab.click(); return true; })()`,
          },
        ]);
        if (selected || Date.now() >= until) break;
        await delay(200, undefined, { signal });
      }
    }
    return this.waitForPosts(signal);
  }

  private async waitForPosts(signal: AbortSignal, previous?: string): Promise<Snapshot> {
    const until = Date.now() + (previous === undefined ? 10_000 : 4000);
    let snapshot: Snapshot;
    do {
      snapshot = await this.read(signal);
      if (snapshot.state === "login_required") return snapshot;
      const signature = snapshot.posts.map((post) => post.id).join(",");
      if (
        snapshot.account &&
        snapshot.posts.length &&
        (previous === undefined || signature !== previous)
      )
        return snapshot;
      await delay(200, undefined, { signal });
    } while (Date.now() < until);
    return snapshot;
  }

  private async scroll(direction: "up" | "down", signal: AbortSignal) {
    const before = await this.read(signal);
    if (!before.account || before.state === "login_required")
      throw new Error("Log in to BetterX manually before scrolling");
    const expected = this.window().webContents.getURL();
    const code = `(() => { if(location.href !== ${JSON.stringify(expected)}) throw new Error('Page changed'); window.scrollBy({top: Math.max(300, innerHeight * 0.8) * ${direction === "down" ? 1 : -1}, behavior: 'instant'}); })()`;
    await this.window().webContents.executeJavaScriptInIsolatedWorld(1001, [{ code }]);
    return this.waitForPosts(signal, before.posts.map((post) => post.id).join(","));
  }

  async execute(command: Command, signal: AbortSignal): Promise<unknown> {
    signal.throwIfAborted();
    switch (command.name) {
      case "get_status": {
        const url = this.window().webContents.getURL();
        const readable = isReadablePage(url);
        if (!readable) this.clear();
        return {
          enabled: true,
          readable,
          page: readable ? new URL(url).origin + new URL(url).pathname : "outside_read_scope",
          note: "Only bookmarks, home and individual post pages are readable. Login and account identity are checked when reading. No full-library guarantee.",
        };
      }
      case "open_bookmarks":
        return this.navigate("https://x.com/i/bookmarks", signal);
      case "open_thread":
        return this.navigate(command.args.url, signal);
      case "read_visible_posts":
        return this.read(signal);
      case "scroll_feed":
        return this.scroll(command.args.direction, signal);
      case "search_collected_posts": {
        const snapshot = await this.read(signal); // revoke old-account data before any search
        if (!snapshot.account)
          throw new Error("Cannot verify the current account; collected data cleared");
        return this.index.search(command.args.query, command.args.limit);
      }
      case "collect_bookmarks": {
        let snapshot = await this.navigate("https://x.com/i/bookmarks", signal);
        const account = snapshot.account;
        if (!account) throw new Error("Log in manually; BetterX could not verify the account");
        const posts = new Map(snapshot.posts.map((post) => [post.id, post]));
        let pagesRead = 1;
        let stoppedBecause = "page_limit";
        while (pagesRead < command.args.pages) {
          if (
            !["/i/bookmarks", "/i/history"].includes(
              new URL(this.window().webContents.getURL()).pathname
            )
          )
            throw new Error("Page changed; collection cancelled");
          snapshot = await this.scroll("down", signal);
          if (snapshot.account !== account) {
            this.clear();
            throw new Error("Account changed; collection cancelled and index cleared");
          }
          pagesRead++;
          const before = posts.size;
          for (const post of snapshot.posts) posts.set(post.id, post);
          if (posts.size === before) {
            stoppedBecause = "no_new_posts_loaded";
            break;
          }
        }
        return {
          ...snapshot,
          posts: [...posts.values()].slice(0, 200),
          pagesRead,
          stoppedBecause,
          complete: false,
          note: "Bounded collection of rendered posts. No new posts does not prove the end of bookmarks. Expand truncated posts manually or open their thread.",
        };
      }
    }
  }
}
