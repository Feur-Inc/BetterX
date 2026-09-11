import type { Post, Snapshot } from "./protocol.js";

// Self-contained: Electron serializes this function into an isolated world.
// Never return page HTML, cookies, storage, input values, or authentication URLs.
export function extractSnapshot(doc: Document, pageUrl: string): Snapshot {
  const page = new URL(pageUrl);
  const selectedTab = doc.querySelector('[role="tab"][aria-selected="true"]')?.textContent?.trim();
  const view: Snapshot["view"] =
    page.pathname === "/i/bookmarks"
      ? "bookmarks"
      : page.pathname === "/i/history"
        ? !selectedTab
          ? "pending"
          : selectedTab === "Bookmarks"
            ? "bookmarks"
            : "unsupported"
        : page.pathname === "/home"
          ? "home"
          : /^\/[A-Za-z0-9_]{1,15}\/status\/\d{1,25}$/.test(page.pathname)
            ? "thread"
            : "unsupported";
  const profile =
    doc.querySelector('a[data-testid="AppTabBar_Profile_Link"]')?.getAttribute("href") ?? "";
  const account = /^\/([A-Za-z0-9_]{1,15})$/.exec(profile)?.[1] ?? null;
  const posts: Post[] = [];
  const ids = new Set<string>();
  for (const article of Array.from(
    view === "unsupported" || view === "pending"
      ? []
      : doc.querySelectorAll('article[data-testid="tweet"]')
  ).slice(0, 80)) {
    const own = (selector: string) =>
      Array.from(article.querySelectorAll(selector)).filter(
        (node) =>
          node.closest('article[data-testid="tweet"]') === article &&
          !node.closest('[data-testid="quoteTweet"], div[role="link"]')
      );
    const permalink = own('a[href*="/status/"]').find((node) => node.querySelector("time"));
    const match = /^\/([A-Za-z0-9_]{1,15})\/status\/(\d{1,25})(?:\?.*)?$/.exec(
      permalink?.getAttribute("href") ?? ""
    );
    if (!match?.[1] || !match[2] || ids.has(match[2])) continue;
    const textNode = own('[data-testid="tweetText"]')[0];
    const text = textNode?.textContent ?? "";
    const links: string[] = [];
    for (const anchor of Array.from(textNode?.querySelectorAll("a[href]") ?? []).slice(0, 20)) {
      try {
        const link = new URL(anchor.getAttribute("href") ?? "", page.origin);
        if (["http:", "https:"].includes(link.protocol) && !link.username && !link.password)
          links.push(link.href.slice(0, 2048));
      } catch {
        /* malformed untrusted link */
      }
    }
    ids.add(match[2]);
    posts.push({
      id: match[2],
      author: match[1],
      url: `https://x.com/${match[1]}/status/${match[2]}`,
      text: text.slice(0, 20_000),
      publishedAt: permalink?.querySelector("time")?.getAttribute("datetime")?.slice(0, 64) ?? null,
      truncated:
        text.length > 20_000 || own('[data-testid="tweet-text-show-more-link"]').length > 0,
      links: [...new Set(links)],
      mediaDescriptions: own('[data-testid="tweetPhoto"] img[alt]')
        .slice(0, 4)
        .map((node) => (node.getAttribute("alt") ?? "").slice(0, 1000)),
    });
  }
  const login =
    page.pathname.startsWith("/i/flow/") ||
    (!account && !!doc.querySelector('a[href="/i/flow/login"]'));
  return {
    view,
    account,
    page: page.origin + page.pathname,
    capturedAt: new Date().toISOString(),
    state: login
      ? "login_required"
      : !account
        ? "unknown"
        : posts.length
          ? "ready"
          : doc.querySelector('[role="progressbar"]')
            ? "loading"
            : "ready",
    posts,
    complete: false,
    source: "rendered_dom",
  };
}
