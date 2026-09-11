import { logger } from "@betterx/core";
import { BrowserWindow, Menu, clipboard, shell } from "electron";
import type { ContextMenuParams, MenuItemConstructorOptions, WebContents } from "electron";
import { parseExternalHttpUrl } from "./ipc/security.js";

// ─── Context Menu ─────────────────────────────────────────────────────────────

// Electron ships no default context menu for page content, so the whole menu is
// built here from the params Chromium reports for the click target.

const MAX_SPELLING_SUGGESTIONS = 5;
const SEPARATOR: MenuItemConstructorOptions = { type: "separator" };

/**
 * Normalize a URL that came from the renderer before it reaches the clipboard,
 * a download, or the user's browser. Anything that is not plain HTTP(S) - such
 * as javascript:, blob:, or data: - is dropped rather than offered.
 */
function safeExternalUrl(rawUrl: string): string | null {
  if (!rawUrl) return null;
  try {
    return parseExternalHttpUrl(rawUrl).toString();
  } catch {
    return null;
  }
}

function openExternal(url: string): void {
  shell.openExternal(url).catch((error) => {
    logger.error("Failed to open link externally:", error);
  });
}

function spellcheckItems(
  webContents: WebContents,
  params: ContextMenuParams
): MenuItemConstructorOptions[] {
  const { misspelledWord } = params;
  if (!params.isEditable || !misspelledWord) return [];

  const suggestions = params.dictionarySuggestions
    .slice(0, MAX_SPELLING_SUGGESTIONS)
    .map<MenuItemConstructorOptions>((word) => ({
      label: word,
      click: () => webContents.replaceMisspelling(word),
    }));

  return [
    ...(suggestions.length > 0
      ? suggestions
      : [{ label: "No spelling suggestions", enabled: false }]),
    SEPARATOR,
    {
      label: "Add to Dictionary",
      click: () => webContents.session.addWordToSpellCheckerDictionary(misspelledWord),
    },
    SEPARATOR,
  ];
}

function editItems(params: ContextMenuParams): MenuItemConstructorOptions[] {
  const { editFlags } = params;
  if (!params.isEditable) {
    if (!params.selectionText.trim()) return [];
    return [{ label: "Copy", role: "copy", enabled: editFlags.canCopy }, SEPARATOR];
  }

  return [
    { label: "Undo", role: "undo", enabled: editFlags.canUndo },
    { label: "Redo", role: "redo", enabled: editFlags.canRedo },
    SEPARATOR,
    { label: "Cut", role: "cut", enabled: editFlags.canCut },
    { label: "Copy", role: "copy", enabled: editFlags.canCopy },
    { label: "Paste", role: "paste", enabled: editFlags.canPaste },
    { label: "Paste as Plain Text", role: "pasteAndMatchStyle", enabled: editFlags.canPaste },
    { label: "Select All", role: "selectAll", enabled: editFlags.canSelectAll },
    SEPARATOR,
  ];
}

function linkItems(params: ContextMenuParams): MenuItemConstructorOptions[] {
  const url = safeExternalUrl(params.linkURL);
  if (!url) return [];
  return [
    { label: "Open Link in Browser", click: () => openExternal(url) },
    { label: "Copy Link Address", click: () => clipboard.writeText(url) },
    SEPARATOR,
  ];
}

function mediaItems(
  webContents: WebContents,
  params: ContextMenuParams
): MenuItemConstructorOptions[] {
  const src = safeExternalUrl(params.srcURL);

  if (params.mediaType === "image") {
    // copyImageAt works for data: and blob: images too, so it is offered even
    // when the source URL itself is not something we are willing to hand out.
    const items: MenuItemConstructorOptions[] = [
      { label: "Copy Image", click: () => webContents.copyImageAt(params.x, params.y) },
    ];
    if (src) {
      items.push(
        { label: "Copy Image Address", click: () => clipboard.writeText(src) },
        { label: "Save Image As…", click: () => webContents.downloadURL(src) },
        { label: "Open Image in Browser", click: () => openExternal(src) }
      );
    }
    items.push(SEPARATOR);
    return items;
  }

  if ((params.mediaType === "video" || params.mediaType === "audio") && src) {
    const noun = params.mediaType === "video" ? "Video" : "Audio";
    return [
      { label: `Copy ${noun} Address`, click: () => clipboard.writeText(src) },
      { label: `Open ${noun} in Browser`, click: () => openExternal(src) },
      SEPARATOR,
    ];
  }

  return [];
}

function navigationItems(
  webContents: WebContents,
  params: ContextMenuParams
): MenuItemConstructorOptions[] {
  const history = webContents.navigationHistory;
  const items: MenuItemConstructorOptions[] = [
    { label: "Back", enabled: history.canGoBack(), click: () => history.goBack() },
    { label: "Forward", enabled: history.canGoForward(), click: () => history.goForward() },
    { label: "Reload", click: () => webContents.reload() },
  ];

  if (process.env.BETTERX_DEV === "1") {
    items.push(SEPARATOR, {
      label: "Inspect Element",
      click: () => webContents.inspectElement(params.x, params.y),
    });
  }

  return items;
}

/** Drop leading, trailing, and doubled separators left behind by empty groups. */
function trimSeparators(template: MenuItemConstructorOptions[]): MenuItemConstructorOptions[] {
  return template.filter((item, index) => {
    if (item.type !== "separator") return true;
    if (index === 0 || index === template.length - 1) return false;
    return template[index - 1]?.type !== "separator";
  });
}

export function buildContextMenuTemplate(
  webContents: WebContents,
  params: ContextMenuParams
): MenuItemConstructorOptions[] {
  return trimSeparators([
    ...spellcheckItems(webContents, params),
    ...editItems(params),
    ...linkItems(params),
    ...mediaItems(webContents, params),
    ...navigationItems(webContents, params),
  ]);
}

export function attachContextMenu(webContents: WebContents): void {
  webContents.on("context-menu", (_event, params) => {
    const template = buildContextMenuTemplate(webContents, params);
    if (template.length === 0) return;

    const window = BrowserWindow.fromWebContents(webContents);
    Menu.buildFromTemplate(template).popup(window ? { window } : undefined);
  });
}
