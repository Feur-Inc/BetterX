import type { Theme } from "../../types/theme.js";
import type { BetterXContext, SettingsTab } from "../tab-registry.js";

// ─── Themes Tab ───────────────────────────────────────────────────────────────

const EDITOR_OVERLAY_ID = "betterx-editor-overlay";

const SPLIT_STYLE_ID = "betterx-split-constraint";
let activeEditorCleanup: (() => boolean) | null = null;

type EditorMode = "full" | "split" | "window";

function openEditorModal(theme: Theme, ctx: BetterXContext): void {
  if (activeEditorCleanup && !activeEditorCleanup()) return;

  const overlay = document.createElement("div");
  overlay.id = EDITOR_OVERLAY_ID;

  const modal = document.createElement("div");
  modal.className = "betterx-editor-modal";

  // Header
  const header = document.createElement("div");
  header.className = "betterx-editor-modal-header";

  const title = document.createElement("div");
  title.className = "betterx-editor-modal-title";
  title.textContent = theme.name;

  const actions = document.createElement("div");
  actions.className = "betterx-editor-modal-actions";

  // Live reload toggle (reuses BetterX toggle style)
  const liveWrap = document.createElement("div");
  liveWrap.className = "betterx-editor-live-toggle";
  liveWrap.title = "Apply changes as you type";
  const liveText = document.createElement("span");
  liveText.textContent = "Live";
  const liveToggle = document.createElement("label");
  liveToggle.className = "betterx-toggle";
  const liveCheck = document.createElement("input");
  liveCheck.type = "checkbox";
  const liveSlider = document.createElement("span");
  liveSlider.className = "betterx-toggle-slider";
  liveToggle.append(liveCheck, liveSlider);
  liveWrap.append(liveText, liveToggle);

  // Mode selector (Full | Split | Window)
  const modeGroup = document.createElement("div");
  modeGroup.className = "betterx-editor-mode-group";

  const modes: { key: EditorMode; label: string }[] = [
    { key: "full", label: "Full" },
    { key: "split", label: "Split" },
    { key: "window", label: "Window" },
  ];
  const modeBtns = new Map<EditorMode, HTMLButtonElement>();
  for (const m of modes) {
    const btn = document.createElement("button");
    btn.className = `betterx-editor-mode-btn${m.key === "full" ? " betterx-editor-mode-active" : ""}`;
    btn.textContent = m.label;
    btn.dataset.mode = m.key;
    modeBtns.set(m.key, btn);
    modeGroup.appendChild(btn);
  }

  const saveBtn = document.createElement("button");
  saveBtn.className = "betterx-btn betterx-btn-primary";
  saveBtn.textContent = "Save";

  const closeBtn = document.createElement("button");
  closeBtn.className = "betterx-editor-modal-close";
  closeBtn.setAttribute("aria-label", "Close editor");
  closeBtn.textContent = "✕";

  actions.append(liveWrap, modeGroup, saveBtn, closeBtn);
  header.append(title, actions);

  // Editor area
  const editorEl = document.createElement("div");
  editorEl.className = "betterx-editor-modal-body";

  // Resize handle
  const resizeHandle = document.createElement("div");
  resizeHandle.className = "betterx-editor-resize-handle";

  modal.append(resizeHandle, header, editorEl);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  let currentCSS = theme.css;
  let editorView: { destroy(): void } | null = null;
  let mode: EditorMode = "full";
  let liveReload = false;
  let liveTimer: ReturnType<typeof setTimeout> | null = null;
  let splitWidth = 50; // percentage of viewport
  let closed = false;
  let activeDragCleanup: (() => void) | null = null;

  // Style element that constrains page content in split mode
  const splitStyle = document.createElement("style");
  splitStyle.id = SPLIT_STYLE_ID;

  // ── Mode helpers ────────────────────────────────

  const applySplitWidth = (): void => {
    const w = splitWidth;
    modal.style.width = `${w}vw`;
    modal.style.maxWidth = `${w}vw`;
    splitStyle.textContent = `body > #react-root { max-width: ${100 - w}vw !important; overflow-x: hidden !important; }`;
  };

  const clearInlineSize = (): void => {
    modal.style.width = "";
    modal.style.maxWidth = "";
    modal.style.height = "";
    modal.style.maxHeight = "";
    modal.style.left = "";
    modal.style.top = "";
  };

  const setActiveBtn = (m: EditorMode): void => {
    for (const [key, btn] of modeBtns) {
      btn.classList.toggle("betterx-editor-mode-active", key === m);
    }
  };

  const enterFull = (): void => {
    overlay.classList.remove("betterx-split-mode", "betterx-window-mode");
    clearInlineSize();
    splitStyle.remove();
  };

  const enterSplit = (): void => {
    overlay.classList.remove("betterx-window-mode");
    overlay.classList.add("betterx-split-mode");
    clearInlineSize();
    applySplitWidth();
    document.head.appendChild(splitStyle);
  };

  const enterWindow = (): void => {
    overlay.classList.remove("betterx-split-mode");
    overlay.classList.add("betterx-window-mode");
    splitStyle.remove();
    // If no inline position set yet, center it
    if (!modal.style.left) {
      const w = 700;
      const h = Math.round(window.innerHeight * 0.6);
      modal.style.width = `${w}px`;
      modal.style.maxWidth = `${w}px`;
      modal.style.height = `${h}px`;
      modal.style.maxHeight = `${h}px`;
      modal.style.left = `${Math.round((window.innerWidth - w) / 2)}px`;
      modal.style.top = `${Math.round((window.innerHeight - h) / 2)}px`;
    }
  };

  const switchMode = (m: EditorMode): void => {
    if (m === mode) return;
    mode = m;
    setActiveBtn(m);
    if (m === "full") enterFull();
    else if (m === "split") enterSplit();
    else enterWindow();
  };

  // Mode button clicks
  for (const [key, btn] of modeBtns) {
    btn.addEventListener("click", () => switchMode(key));
  }

  // ── Resize drag logic ───────────────────────────
  resizeHandle.addEventListener("mousedown", (e: MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const startW = modal.offsetWidth;
    const startH = modal.offsetHeight;

    const onMove = (ev: MouseEvent): void => {
      if (mode === "split") {
        const dx = startX - ev.clientX;
        const newW = Math.max(300, Math.min(window.innerWidth - 200, startW + dx));
        splitWidth = (newW / window.innerWidth) * 100;
        applySplitWidth();
      } else {
        const newW = Math.max(400, startW + (ev.clientX - startX));
        const newH = Math.max(300, startH + (ev.clientY - startY));
        modal.style.width = `${newW}px`;
        modal.style.maxWidth = `${newW}px`;
        modal.style.height = `${newH}px`;
        modal.style.maxHeight = `${newH}px`;
      }
    };

    const onUp = (): void => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      activeDragCleanup = null;
    };

    document.body.style.cursor = mode === "split" ? "ew-resize" : "nwse-resize";
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    activeDragCleanup = onUp;
  });

  // ── Window drag (title bar) ─────────────────────
  header.addEventListener("mousedown", (e: MouseEvent) => {
    if (mode !== "window") return;
    // Only drag from the header itself or title, not from buttons
    const target = e.target as HTMLElement;
    if (target.closest("button, label, input, .betterx-editor-mode-group")) return;

    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const startLeft = modal.offsetLeft;
    const startTop = modal.offsetTop;

    const onMove = (ev: MouseEvent): void => {
      modal.style.left = `${startLeft + ev.clientX - startX}px`;
      modal.style.top = `${startTop + ev.clientY - startY}px`;
    };

    const onUp = (): void => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      modal.style.opacity = "";
      activeDragCleanup = null;
    };

    modal.style.opacity = "0.75";
    document.body.style.cursor = "grabbing";
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    activeDragCleanup = onUp;
  });

  const closeModal = (force = false): boolean => {
    if (closed) return true;
    if (!force && !liveReload && currentCSS !== theme.css) {
      if (!window.confirm("Discard unsaved theme changes?")) return false;
    }
    closed = true;
    if (liveTimer) clearTimeout(liveTimer);
    activeDragCleanup?.();
    editorView?.destroy();
    clearInlineSize();
    splitStyle.remove();
    overlay.remove();
    document.removeEventListener("keydown", onKey);
    if (activeEditorCleanup === cleanup) activeEditorCleanup = null;
    return true;
  };

  const cleanup = (): boolean => closeModal();
  activeEditorCleanup = cleanup;

  // Live reload toggle
  liveCheck.addEventListener("change", () => {
    liveReload = liveCheck.checked;
    if (liveReload) {
      void ctx.themeManager.update(theme.id, currentCSS);
    }
  });

  // Close on overlay background click (full mode only)
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay && mode === "full") closeModal();
  });

  // Close on Escape
  const onKey = (e: KeyboardEvent): void => {
    if (e.key === "Escape") {
      closeModal();
    }
  };
  document.addEventListener("keydown", onKey);

  closeBtn.addEventListener("click", () => closeModal());

  saveBtn.addEventListener("click", async () => {
    await ctx.themeManager.update(theme.id, currentCSS);
    ctx.notifications.showSuccess(`Theme "${theme.name}" saved.`);
  });

  // Ctrl+S / Cmd+S to save
  const onSaveKey = (e: KeyboardEvent): void => {
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      e.stopPropagation();
      void ctx.themeManager.update(theme.id, currentCSS).then(() => {
        ctx.notifications.showSuccess(`Theme "${theme.name}" saved.`);
      });
    }
  };
  overlay.addEventListener("keydown", onSaveKey);

  // Debounced live-reload apply
  const applyLive = (): void => {
    if (!liveReload) return;
    if (liveTimer) clearTimeout(liveTimer);
    liveTimer = setTimeout(() => {
      void ctx.themeManager.update(theme.id, currentCSS);
    }, 300);
  };

  // Lazy load CodeMirror
  Promise.all([
    import("codemirror"),
    import("@codemirror/lang-css"),
    import("@codemirror/theme-one-dark"),
  ])
    .then(([{ EditorView, basicSetup }, { css }, { oneDark }]) => {
      if (closed || !editorEl.isConnected) return;
      const view = new EditorView({
        doc: theme.css,
        extensions: [
          basicSetup,
          css(),
          oneDark,
          EditorView.theme({
            "&": { height: "100%", fontSize: "13px" },
            ".cm-scroller": { overflow: "auto" },
          }),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              currentCSS = update.state.doc.toString();
              applyLive();
            }
          }),
        ],
        parent: editorEl,
      });

      editorView = view;

      // Focus editor
      view.focus();
    })
    .catch((error) => {
      if (closed) return;
      ctx.notifications.showError("Could not load the theme editor.");
      console.error("[BetterX] Theme editor failed to load", error);
    });
}

export const ThemesTab: SettingsTab = {
  id: "themes",
  name: "Themes",
  priority: 20,

  initialize(container: HTMLElement, ctx: BetterXContext): void {
    this.render(container, ctx);
  },

  onActivate(container: HTMLElement, ctx: BetterXContext): void {
    this.render(container, ctx);
  },

  render(container: HTMLElement, ctx: BetterXContext): void {
    container.innerHTML = "";

    const themes = ctx.themeManager.getAll();

    // Toolbar
    const toolbar = document.createElement("div");
    toolbar.className = "betterx-themes-toolbar";

    const newBtn = document.createElement("button");
    newBtn.className = "betterx-btn betterx-btn-primary";
    newBtn.textContent = "+ New Theme";
    newBtn.addEventListener("click", () => {
      const input = document.createElement("input");
      input.type = "text";
      input.placeholder = "Theme name…";
      input.className = "betterx-theme-new-input";

      const confirmBtn = document.createElement("button");
      confirmBtn.className = "betterx-btn betterx-btn-primary";
      confirmBtn.textContent = "Create";

      const cancelBtn = document.createElement("button");
      cancelBtn.className = "betterx-btn betterx-btn-secondary";
      cancelBtn.textContent = "Cancel";

      toolbar.replaceChild(input, newBtn);
      toolbar.appendChild(confirmBtn);
      toolbar.appendChild(cancelBtn);
      input.focus();

      const restore = () => {
        toolbar.replaceChild(newBtn, input);
        confirmBtn.remove();
        cancelBtn.remove();
      };

      const confirm = async () => {
        const name = input.value.trim();
        if (!name) {
          restore();
          return;
        }
        restore();
        await ctx.themeManager.create(name);
        this.render(container, ctx);
      };

      confirmBtn.addEventListener("click", () => void confirm());
      cancelBtn.addEventListener("click", restore);
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") void confirm();
        if (e.key === "Escape") restore();
      });
    });

    toolbar.appendChild(newBtn);

    // Open Themes Folder button (desktop only)
    if (ctx.openThemesFolder) {
      const openFolderBtn = document.createElement("button");
      openFolderBtn.className = "betterx-btn betterx-btn-secondary";
      openFolderBtn.style.display = "inline-flex";
      openFolderBtn.style.alignItems = "center";
      openFolderBtn.style.gap = "5px";
      openFolderBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg><span>Open Folder</span>`;
      openFolderBtn.addEventListener("click", () => ctx.openThemesFolder?.());
      toolbar.appendChild(openFolderBtn);
    }

    container.appendChild(toolbar);

    // Drop zone for .css files
    const dropZone = document.createElement("div");
    dropZone.className = "betterx-drop-zone";
    dropZone.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg><span>Drop .css files here to import themes</span>`;

    const handleDragOver = (e: DragEvent): void => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.add("betterx-drop-zone-active");
    };
    const handleDragLeave = (e: DragEvent): void => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.remove("betterx-drop-zone-active");
    };
    const handleDrop = async (e: DragEvent): Promise<void> => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.remove("betterx-drop-zone-active");

      const files = e.dataTransfer?.files;
      if (!files || files.length === 0) return;
      const cssFiles = Array.from(files).filter((file) => file.name.toLowerCase().endsWith(".css"));
      if (cssFiles.length > 100 || themes.length + cssFiles.length > 100) {
        ctx.notifications.showError("A maximum of 100 themes is supported.");
        return;
      }
      if (cssFiles.some((file) => file.size > 2_000_000)) {
        ctx.notifications.showError("Each theme must be 2 MB or smaller.");
        return;
      }
      if (cssFiles.reduce((total, file) => total + file.size, 0) > 5_000_000) {
        ctx.notifications.showError("The imported themes are too large.");
        return;
      }

      let imported = 0;
      try {
        for (const file of cssFiles) {
          const css = await file.text();
          const name = file.name.replace(/\.css$/i, "");
          await ctx.themeManager.create(name, css);
          imported++;
        }
      } catch (error) {
        ctx.notifications.showError(
          error instanceof Error ? error.message : "Theme import failed."
        );
      }

      if (imported > 0) {
        ctx.notifications.showSuccess(`Imported ${imported} theme${imported > 1 ? "s" : ""}.`);
        this.render(container, ctx);
      } else {
        ctx.notifications.showWarning("No .css files found in drop.");
      }
    };

    dropZone.addEventListener("dragover", handleDragOver);
    dropZone.addEventListener("dragleave", handleDragLeave);
    dropZone.addEventListener("drop", (e) => void handleDrop(e));
    container.appendChild(dropZone);

    if (themes.length === 0) {
      const empty = document.createElement("div");
      empty.className = "betterx-empty-state";
      empty.textContent = "No themes yet. Create one or drop a .css file above.";
      container.appendChild(empty);
      return;
    }

    const list = document.createElement("div");
    list.className = "betterx-theme-list";

    for (const theme of themes) {
      list.appendChild(this.buildThemeItem(theme, ctx, () => this.render(container, ctx)));
    }

    container.appendChild(list);
  },

  buildThemeItem(theme: Theme, ctx: BetterXContext, onRefresh: () => void): HTMLElement {
    const item = document.createElement("div");
    item.className = "betterx-theme-item";
    item.dataset.themeId = theme.id;

    const drag = document.createElement("span");
    drag.textContent = "⠿";
    drag.className = "betterx-drag-handle";

    const name = document.createElement("span");
    name.className = "betterx-theme-name";
    name.textContent = theme.name;

    // Toggle
    const toggle = document.createElement("label");
    toggle.className = "betterx-toggle";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = theme.enabled;
    const slider = document.createElement("span");
    slider.className = "betterx-toggle-slider";
    toggle.append(input, slider);
    input.addEventListener("change", () => {
      ctx.themeManager.toggle(theme.id).catch(console.error);
    });

    const editBtn = document.createElement("button");
    editBtn.className = "betterx-btn betterx-btn-secondary";
    editBtn.textContent = "Edit";
    editBtn.addEventListener("click", () => openEditorModal(theme, ctx));

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "betterx-btn betterx-btn-danger";
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", async () => {
      if (!confirm(`Delete "${theme.name}"?`)) return;
      await ctx.themeManager.delete(theme.id);
      onRefresh();
    });

    item.append(drag, name, toggle, editBtn, deleteBtn);
    return item;
  },
} as SettingsTab & {
  render(container: HTMLElement, ctx: BetterXContext): void;
  buildThemeItem(theme: Theme, ctx: BetterXContext, onRefresh: () => void): HTMLElement;
};
