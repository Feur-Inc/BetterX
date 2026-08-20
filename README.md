<p align="center">
  <img src="betterx_full.png" alt="BetterX" width="600">
</p>

<p align="center">
  <strong>Enhance your X experience.</strong><br>
  A modular plugin system for X (formerly Twitter) - available as a browser extension and a desktop app.
</p>

<p align="center">
  <a href="#installation">Installation</a> &bull;
  <a href="#plugins">Plugins</a> &bull;
  <a href="#development">Development</a> &bull;
  <a href="#creating-a-plugin">Create a Plugin</a> &bull;
  <a href="#contributing">Contributing</a>
</p>

---

## Installation

### Browser Extension

> Chrome Web Store and Firefox Add-ons listings coming soon.

**Manual install (Chrome/Chromium):**

1. Clone and build (see [Development](#development))
2. Go to `chrome://extensions`, enable **Developer mode**
3. Click **Load unpacked** and select `packages/extension/dist/chrome`

### Desktop App

Packaged desktop releases are still in development. For now, build and run the desktop app from
source using the instructions below.

The desktop app includes everything the extension offers, plus exclusive features like Discord Rich Presence, system tray integration, and window transparency. Updates are delivered through packaged app releases.

---

## Plugins

BetterX ships with many plugins - all toggleable at runtime from the settings panel. Here are some highlights:

- **AdBlocker** - hide sponsored posts and ads from your feed
- **BringTwitterBack** - revert X branding back to Twitter (logo, buttons, labels)
- **FixUpX** - auto-convert copied tweet URLs to FixupX / vxTwitter embeds
- **GifFavorites** - add a favorites category to the GIF picker, like Discord
- **MeowAd** - replace ads with cute cats :3
- **QuickEmoji** - Discord-style `:emoji:` syntax in the tweet composer
- **TweetScreenshot** - one-click screenshot button on every tweet

...and more. Open the BetterX settings panel to browse and configure all of them.

---

## Development

### Prerequisites

- [Bun](https://bun.sh) (package manager & runtime)
- [Node.js](https://nodejs.org) 20+ (for Electron)

### Setup

```bash
git clone https://github.com/Feur-Inc/BetterX.git
cd BetterX
bun install
```

### Project Structure

```
packages/
  core/        # Shared plugin API, UI components, theme engine
  plugins/     # All built-in plugins
  extension/   # Chrome/Firefox browser extension (MV3)
  desktop/     # Electron desktop app
  android/     # Android WebView app
  cloud-sync/  # Optional cloud settings service
```

### Build

```bash
# Build everything
bun run build

# Build individual packages
bun run build:core
bun run build:plugins
bun run build:extension
bun run build:desktop
bun run build:android
```

### Building the Firefox Extension (for AMO)

Requirements:
- [Bun](https://bun.sh) 1.x (`curl -fsSL https://bun.sh/install | bash`)
- Linux, macOS, or Windows (WSL)

Steps:

```bash
git clone https://github.com/Feur-Inc/BetterX.git
cd BetterX
bun install
cd packages/extension
bun run build:firefox   # outputs to dist/firefox/
bun run pack:firefox    # creates dist/betterx-firefox.zip
```

The resulting `dist/betterx-firefox.zip` is the exact file submitted to AMO.

### Dev Mode (Desktop)

```bash
# Full dev experience with hot-reload
cd packages/desktop
bun run dev:all
```

---

## Creating a Plugin

```typescript
import { definePlugin, Devs, OptionType } from "@betterx/core";

export default definePlugin({
  name: "MyPlugin",
  description: "Does something cool",
  authors: [Devs.YourName],

  // Optional: restrict to a platform
  // platform: "desktop",

  options: {
    someToggle: {
      type: OptionType.BOOLEAN,
      default: true,
      description: "Enable the cool thing",
    },
  },

  start() {
    // Plugin enabled - set up observers, inject UI, etc.
    const value = this.settings.store.someToggle;
  },

  stop() {
    // Plugin disabled - clean up
  },
});
```

Add your plugin to `packages/plugins/src/MyPlugin/index.ts`, then import it and add it to
`allPlugins` in `packages/plugins/src/index.ts`. It will then appear on every compatible platform.

### Fetching External Resources

X enforces a strict Content Security Policy that blocks most external requests from page scripts. BetterX provides two proxy helpers that route requests through a CSP-exempt context (the extension background service worker, or Electron's main process on desktop):

```typescript
import { proxyImage, proxyFetch } from "@betterx/core";
```

#### `proxyImage(url)`

Fetches an image and returns a `data:` URL safe to use anywhere a URL is accepted.

```typescript
// In a plugin's start():
const src = await proxyImage("https://example.com/sprite.png");
el.style.backgroundImage = `url('${src}')`;
myImg.src = src;
```

#### `proxyFetch(url, init?)`

Fetches any URL and returns `{ ok, status, text, json }`.

```typescript
// GET
const { ok, json } = await proxyFetch("https://api.example.com/data");

// POST
const res = await proxyFetch("https://api.example.com/save", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ key: "value" }),
});
if (res.ok) console.log(res.json);
```

> **Note:** Never use raw `fetch()` or hardcode external URLs in `<img src>` / `background-image` - they will be blocked by X's CSP in the extension. Always go through `proxyImage` / `proxyFetch`.

---

## Contributing

Contributions are welcome! Whether it's a new plugin, a bug fix, or an improvement to the core - feel free to open a PR.

1. Fork the repo
2. Create a feature branch (`git checkout -b my-feature`)
3. Make your changes and test on both extension and desktop
4. Submit a pull request

---

## Acknowledgements

- Inspired by [Vencord](https://github.com/Vendicated/Vencord)
- Thanks to [SauceyRed](https://github.com/SauceyRed) for the original Bring Twitter Back concept
- Thanks to all [contributors](https://github.com/Feur-Inc/BetterX/graphs/contributors)

## License

BetterX is released under the [GNU General Public License v3.0](LICENSE).
