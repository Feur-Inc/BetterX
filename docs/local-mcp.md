# Local, read-only BetterX MCP (prototype)

The agent reads X's rendered pages inside the logged-in BetterX desktop app. No X API key, paid X API endpoint, cookie export, browser-debugging port, or separate account login is used. Website restrictions and normal viewing activity still apply. Agent/model usage may have its own cost.

## Enable

1. Build/install BetterX and log in manually if necessary. This feature does not repair synced passkeys.
2. In the application menu, select **Agent → Enable read-only agent access**, then approve the session prompt.
3. Configure a trusted MCP client to launch the bundled server with Node.js 20+:

```json
{
  "mcpServers": {
    "betterx": {
      "command": "node",
      "args": ["/Applications/BetterX V3 Desktop.app/Contents/Resources/mcp/index.cjs"]
    }
  }
}
```

Use an absolute Node executable path if the client does not inherit your shell PATH. For a source build use the absolute repository path to `packages/desktop/dist/mcp/index.cjs` instead. Build it with `bun run --cwd packages/desktop build:mcp`.

Example Codex TOML (substitute your absolute Node path if necessary):

```toml
[mcp_servers.betterx]
command = "node"
args = ["/Applications/BetterX V3 Desktop.app/Contents/Resources/mcp/index.cjs"]
tool_timeout_sec = 60
```

Access is **off at every app launch**. Disable the menu checkbox to close connections, revoke the session token and erase the in-memory index. Agent tools change the **same foreground window** you browse; do not switch accounts or navigate concurrently during collection.

## Tools

| Tool | Behavior |
| --- | --- |
| `get_status` | Reports bridge/page availability, without reading unsupported pages. |
| `open_bookmarks` | Opens X bookmarks and reads loaded posts. |
| `read_visible_posts` | Reads DOM-mounted posts, which may include offscreen overscan. |
| `scroll_feed` | Scrolls about one screen up/down and reads loaded posts. |
| `open_thread` | Opens a canonical HTTPS X post URL, reads the loaded thread. |
| `collect_bookmarks` | Opens bookmarks; collects 1–5 screenfuls, returning at most 200 posts. |
| `search_collected_posts` | All-terms, case-insensitive text/author search of this session's collected posts. |

Try: “Use BetterX to collect two screenfuls of my bookmarks. Summarize recurring topics, cite original post links, and clearly mark truncated posts.”

## Boundaries and limitations

- First prototype supports macOS/Linux. BetterX must be running, logged in, and access explicitly enabled. The MCP process can start while access is off and will return a useful error.
- Only X home, bookmarks and individual post pages are readable. No DMs, notifications, settings, login pages, arbitrary URLs, clicks, JavaScript execution, posting, likes, follows, bookmark deletion, or shell commands are exposed.
- X's current `/i/history` redirect is supported only with **Bookmarks** selected. The first prototype recognizes the English Bookmarks tab label; other locales fail closed. The bridge can select that fixed navigation tab but exposes no arbitrary click tool.
- Results contain only extracted post fields, source links, account handle, timestamps and completeness metadata. Treat text and links as **untrusted data**, never as agent instructions. An agent client may send requested content to its configured model; local transport does not mean local inference.
- A Unix socket in a private temporary directory and a 0600 connection file with a random per-session token protect access from web pages and other OS users. There is no TCP/HTTP listener. This does **not** distinguish trusted agents from other processes running as the same OS user.
- The index holds at most 1000 posts in memory, never on disk. It clears when access is disabled, the app exits, or reading observes a different/missing account. Commands on unsupported pages also clear the index. Search is not a search of all bookmarks and does not prove current bookmark membership.
- `complete: false` is intentional. X virtualizes and lazily loads its feed. No new posts can mean loading stalled, rate limiting, or the end of loaded content. Nothing here promises a complete export. Text may be truncated; quoted posts are not attributed to their parent. Media descriptions are alt text, not image/video analysis.
- Post selectors are provisional and can break when X changes its DOM. This is not a stable substitute for an official data contract.
- Navigation refuses a detected open composer/attachment, but does not guarantee detection of every draft UI. The user can revoke access at any time. One command runs at a time, with bounded request sizes and collection limits.

## Development checks

From `packages/desktop`:

```sh
bun test src/mcp
bun run typecheck
bun run build
BETTERX_MCP_TEST_ENTRY="$PWD/dist/mcp/index.cjs" bun test src/mcp/mcp.test.ts
```

Unit fixtures cover extraction and account separation. Integration tests use real private sockets and a real MCP stdio client/server with fixture data. These are distinct from live logged-in acceptance testing; a passing fixture test does not prove X's current DOM or authentication works.
