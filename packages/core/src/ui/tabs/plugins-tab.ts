import type { Plugin, PluginOptionDef } from "../../types/plugin.js";
import { OptionType } from "../../types/plugin.js";
import { openContributorModal } from "../contributor-modal.js";
import type { BetterXContext, SettingsTab } from "../tab-registry.js";

let _openDetailFn: ((plugin: Plugin, onBack?: () => void) => void) | null = null;
export function openPluginDetail(plugin: Plugin, onBack?: () => void): void {
  _openDetailFn?.(plugin, onBack);
}

// ─── Plugins Tab ──────────────────────────────────────────────────────────────

function escHtml(str: string): string {
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
}

function renderOptions(container: HTMLElement, plugin: Plugin, ctx: BetterXContext): void {
  if (!plugin.options || Object.keys(plugin.options).length === 0) return;

  const optContainer = document.createElement("div");
  optContainer.className = "betterx-plugin-options";

  for (const [key, opt] of Object.entries(plugin.options) as [string, PluginOptionDef][]) {
    if (opt.hidden) continue;

    const row = document.createElement("div");
    row.className = "betterx-option";

    const labelGroup = document.createElement("div");
    labelGroup.className = "betterx-option-label-group";
    const label = document.createElement("div");
    label.className = "betterx-option-label";
    label.textContent = opt.label ?? key;
    labelGroup.appendChild(label);

    if (opt.description) {
      const desc = document.createElement("div");
      desc.className = "betterx-option-description";
      desc.textContent = opt.description;
      labelGroup.appendChild(desc);
    }

    const control = document.createElement("div");
    control.className = "betterx-option-control";

    const currentValue = (plugin.settings.store as Record<string, unknown>)[key];

    if (opt.type === OptionType.BOOLEAN) {
      const label_ = document.createElement("label");
      label_.className = "betterx-toggle";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.checked = currentValue as boolean;
      const slider = document.createElement("span");
      slider.className = "betterx-toggle-slider";
      label_.append(input, slider);
      input.addEventListener("change", () => {
        ctx.pluginManager.updateOption(plugin.name, key, input.checked).catch(console.error);
      });
      control.appendChild(label_);
    } else if (opt.type === OptionType.SELECT && opt.options) {
      const select = document.createElement("select");
      select.className = "betterx-select";
      for (const o of opt.options) {
        const option = document.createElement("option");
        option.value = o.value;
        option.textContent = o.label;
        if (o.value === currentValue) option.selected = true;
        select.appendChild(option);
      }
      select.addEventListener("change", () => {
        ctx.pluginManager.updateOption(plugin.name, key, select.value).catch(console.error);
      });
      control.appendChild(select);
    } else if (opt.type === OptionType.STRING) {
      const input = document.createElement("input");
      input.type = "text";
      input.className = "betterx-input-text";
      input.value = currentValue as string;
      input.addEventListener("change", () => {
        ctx.pluginManager.updateOption(plugin.name, key, input.value).catch(console.error);
      });
      control.appendChild(input);
    } else if (opt.type === OptionType.NUMBER) {
      const input = document.createElement("input");
      input.type = "number";
      input.className = "betterx-input-number";
      input.value = String(currentValue as number);
      if (opt.min !== undefined) input.min = String(opt.min);
      if (opt.max !== undefined) input.max = String(opt.max);
      if (opt.step !== undefined) input.step = String(opt.step);
      input.addEventListener("change", () => {
        const next = input.valueAsNumber;
        ctx.pluginManager.updateOption(plugin.name, key, next).catch(() => {
          input.value = String(plugin.settings.store[key] as number);
        });
      });
      control.appendChild(input);
    } else if (opt.type === OptionType.COLOR) {
      const wrapper = document.createElement("div");
      wrapper.className = "betterx-color-picker";
      const colorInput = document.createElement("input");
      colorInput.type = "color";
      colorInput.className = "betterx-input-color";
      colorInput.value = (currentValue as string) || "#1d9bf0";
      const hexInput = document.createElement("input");
      hexInput.type = "text";
      hexInput.className = "betterx-input-text betterx-input-color-hex";
      hexInput.value = (currentValue as string) || "#1d9bf0";
      hexInput.maxLength = 7;
      colorInput.addEventListener("input", () => {
        hexInput.value = colorInput.value;
        ctx.pluginManager.updateOption(plugin.name, key, colorInput.value).catch(console.error);
      });
      hexInput.addEventListener("change", () => {
        const v = hexInput.value.trim();
        if (/^#[0-9a-f]{6}$/i.test(v)) {
          colorInput.value = v;
          ctx.pluginManager.updateOption(plugin.name, key, v).catch(console.error);
        }
      });
      wrapper.append(colorInput, hexInput);
      control.appendChild(wrapper);
    }

    row.append(labelGroup, control);
    optContainer.appendChild(row);
  }

  container.appendChild(optContainer);
}

function platformLabel(platform: string): string {
  if (platform === "desktop") return "Desktop only";
  if (platform === "extension") return "Extension only";
  if (platform === "android") return "Android only";
  return platform;
}

// Renders authors + settings into an arbitrary container (reused by inline body and detail panel)
export function renderPluginBody(
  container: HTMLElement,
  plugin: Plugin,
  ctx: BetterXContext
): void {
  if (plugin.authors && plugin.authors.length > 0) {
    const authors = document.createElement("div");
    authors.className = "betterx-plugin-authors";
    for (const author of plugin.authors) {
      const badge = document.createElement("button");
      badge.className = "betterx-author-badge";
      badge.innerHTML = `
        <img class="betterx-author-avatar" alt="${escHtml(author.name)}">
        @${escHtml(author.handle)}
      `;
      badge.addEventListener("click", () => openContributorModal(author, ctx));
      const avatar = badge.querySelector<HTMLImageElement>("img");
      if (avatar) {
        avatar.addEventListener("error", () => {
          avatar.style.display = "none";
        });
        const url = `https://unavatar.io/twitter/${author.handle}`;
        if (ctx.proxyImage) {
          ctx
            .proxyImage(url)
            .then((src) => {
              avatar.src = src;
            })
            .catch(() => {
              avatar.src = url;
            });
        } else {
          avatar.src = url;
        }
      }
      authors.appendChild(badge);
    }
    container.appendChild(authors);
  }

  if (plugin.renderSettings) {
    plugin.renderSettings(container);
  } else {
    renderOptions(container, plugin, ctx);
  }
}

// Full-panel detail view — shown when any plugin card is clicked
function renderDetailPanel(
  detailView: HTMLElement,
  plugin: Plugin,
  ctx: BetterXContext,
  onBack: () => void,
  openDetail: (plugin: Plugin) => void
): void {
  detailView.innerHTML = "";

  const backBtn = document.createElement("button");
  backBtn.className = "betterx-detail-back";
  backBtn.innerHTML = `<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3L5 8l5 5"/></svg> Plugins`;
  backBtn.addEventListener("click", onBack);

  const hero = document.createElement("div");
  hero.className = "betterx-detail-hero";

  const heroTop = document.createElement("div");
  heroTop.className = "betterx-detail-hero-top";

  const nameEl = document.createElement("div");
  nameEl.className = "betterx-detail-name";
  nameEl.textContent = plugin.name;

  if (plugin.unavailable && plugin.platform) {
    const badge = document.createElement("span");
    badge.className = "betterx-platform-badge";
    badge.textContent = platformLabel(plugin.platform);
    nameEl.appendChild(badge);
  }

  if (plugin.isLibrary) {
    const autoBadge = document.createElement("span");
    autoBadge.className = plugin.enabled
      ? "betterx-auto-badge betterx-auto-badge-on"
      : "betterx-auto-badge betterx-auto-badge-off";
    autoBadge.textContent = plugin.enabled ? "Active" : "Standby";
    heroTop.append(nameEl, autoBadge);
  } else if (plugin.isMeta) {
    if (plugin.version) {
      const vBadge = document.createElement("span");
      vBadge.className = "betterx-version-badge";
      vBadge.textContent = `v${plugin.version}`;
      heroTop.append(nameEl, vBadge);
    } else {
      heroTop.append(nameEl);
    }
  } else {
    const toggle = document.createElement("label");
    toggle.className = "betterx-toggle";
    const toggleInput = document.createElement("input");
    toggleInput.type = "checkbox";
    toggleInput.checked = plugin.enabled;
    toggleInput.disabled = !!plugin.unavailable;
    const toggleSlider = document.createElement("span");
    toggleSlider.className = "betterx-toggle-slider";
    toggle.append(toggleInput, toggleSlider);
    toggleInput.addEventListener("change", () => {
      ctx.pluginManager.toggle(plugin.name).catch(console.error);
    });
    heroTop.append(nameEl, toggle);
  }
  hero.appendChild(heroTop);

  if (plugin.description) {
    const descEl = document.createElement("div");
    descEl.className = "betterx-detail-description";
    descEl.textContent = plugin.description;
    hero.appendChild(descEl);
  }

  const body = document.createElement("div");
  body.className = "betterx-detail-body";

  // ── Dependency info ────────────────────────────────────────────────────────
  const deps = plugin.dependencies ?? [];
  const dependents = ctx.pluginManager.getDependents(plugin.name);

  if (deps.length > 0 || dependents.length > 0) {
    const depSection = document.createElement("div");
    depSection.className = "betterx-detail-deps";

    const makeBadge = (name: string, label: string) => {
      const target = ctx.pluginManager.get(name);
      const btn = document.createElement("button");
      btn.className = `betterx-dep-badge${target?.enabled ? " betterx-dep-badge-on" : " betterx-dep-badge-off"}`;
      btn.textContent = label;
      if (target) {
        btn.addEventListener("click", () => openDetail(target));
      } else {
        btn.disabled = true;
        btn.title = "Plugin not found";
      }
      return btn;
    };

    if (deps.length > 0) {
      const row = document.createElement("div");
      row.className = "betterx-detail-deps-row";
      const lbl = document.createElement("span");
      lbl.className = "betterx-detail-deps-label";
      lbl.textContent = "Requires";
      row.appendChild(lbl);
      for (const d of deps) row.appendChild(makeBadge(d, d));
      depSection.appendChild(row);
    }

    if (dependents.length > 0) {
      const row = document.createElement("div");
      row.className = "betterx-detail-deps-row";
      const lbl = document.createElement("span");
      lbl.className = "betterx-detail-deps-label";
      lbl.textContent = "Required by";
      row.appendChild(lbl);
      for (const d of dependents) row.appendChild(makeBadge(d, d));
      depSection.appendChild(row);
    }

    body.appendChild(depSection);
  }

  renderPluginBody(body, plugin, ctx);

  detailView.append(backBtn, hero, body);
}

function renderPlugin(
  plugin: Plugin,
  ctx: BetterXContext,
  onOpenDetail: (plugin: Plugin) => void
): HTMLElement {
  const item = document.createElement("div");
  item.className = plugin.unavailable
    ? "betterx-plugin-item betterx-plugin-item-unavailable"
    : plugin.isMeta
      ? "betterx-plugin-item betterx-plugin-item-meta"
      : plugin.isLibrary
        ? "betterx-plugin-item betterx-plugin-item-library"
        : "betterx-plugin-item";
  item.dataset.pluginName = plugin.name;

  const header = document.createElement("div");
  header.className = "betterx-plugin-header";

  const info = document.createElement("div");
  info.className = "betterx-plugin-info";

  const nameRow = document.createElement("div");
  nameRow.className = "betterx-plugin-name";
  nameRow.textContent = plugin.name;

  if (plugin.unavailable && plugin.platform) {
    const badge = document.createElement("span");
    badge.className = "betterx-platform-badge";
    badge.textContent = platformLabel(plugin.platform);
    nameRow.appendChild(badge);
  }

  const desc = document.createElement("div");
  desc.className = "betterx-plugin-description";
  desc.textContent = plugin.description ?? "";

  info.append(nameRow, desc);

  if (plugin.isLibrary) {
    const autoBadge = document.createElement("span");
    autoBadge.className = plugin.enabled
      ? "betterx-auto-badge betterx-auto-badge-on"
      : "betterx-auto-badge betterx-auto-badge-off";
    autoBadge.textContent = plugin.enabled ? "Active" : "Standby";
    header.append(info, autoBadge);
  } else if (plugin.isMeta) {
    if (plugin.version) {
      const vBadge = document.createElement("span");
      vBadge.className = "betterx-version-badge";
      vBadge.textContent = `v${plugin.version}`;
      header.append(info, vBadge);
    } else {
      header.append(info);
    }
  } else {
    const toggle = document.createElement("label");
    toggle.className = "betterx-toggle";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = plugin.enabled;
    input.disabled = !!plugin.unavailable;
    const slider = document.createElement("span");
    slider.className = "betterx-toggle-slider";
    toggle.append(input, slider);
    input.addEventListener("change", () => {
      ctx.pluginManager.toggle(plugin.name).catch(console.error);
    });
    header.append(info, toggle);
  }

  item.appendChild(header);

  const hasDetails =
    (plugin.authors && plugin.authors.length > 0) ||
    (plugin.options && Object.keys(plugin.options).length > 0) ||
    plugin.renderSettings;

  if (hasDetails) {
    // Inline body — only shown in list mode
    const body = document.createElement("div");
    body.className = "betterx-plugin-body";
    body.style.display = "none";

    if (plugin.authors && plugin.authors.length > 0) {
      const authors = document.createElement("div");
      authors.className = "betterx-plugin-authors";
      for (const author of plugin.authors) {
        const badge = document.createElement("a");
        badge.className = "betterx-author-badge";
        badge.href = `https://x.com/${author.handle}`;
        badge.target = "_blank";
        badge.rel = "noopener noreferrer";
        badge.innerHTML = `
          <img class="betterx-author-avatar"
               alt="${escHtml(author.name)}">
          @${escHtml(author.handle)}
        `;
        const avatar = badge.querySelector<HTMLImageElement>("img");
        if (avatar) {
          avatar.addEventListener("error", () => {
            avatar.style.display = "none";
          });
          const url = `https://unavatar.io/twitter/${author.handle}`;
          if (ctx.proxyImage) {
            ctx
              .proxyImage(url)
              .then((src) => {
                avatar.src = src;
              })
              .catch(() => {
                avatar.src = url;
              });
          } else {
            avatar.src = url;
          }
        }
        authors.appendChild(badge);
      }
      body.appendChild(authors);
    }

    if (plugin.options && Object.keys(plugin.options).length > 0) {
      renderOptions(body, plugin, ctx);
    }

    if (plugin.renderSettings) {
      plugin.renderSettings(body);
    }

    item.appendChild(body);

    header.style.cursor = "pointer";
    header.addEventListener("click", (e) => {
      if ((e.target as HTMLElement).closest(".betterx-toggle")) return;
      onOpenDetail(plugin);
    });
  }

  return item;
}

export const PluginsTab: SettingsTab = {
  id: "plugins",
  name: "Plugins",
  priority: 10,

  initialize(container: HTMLElement, ctx: BetterXContext): void {
    container.innerHTML = "";

    // ── List view ────────────────────────────────────────────────────────────
    const listView = document.createElement("div");
    listView.className = "betterx-plugin-list-view";

    const toolbar = document.createElement("div");
    toolbar.className = "betterx-plugins-toolbar";

    const search = document.createElement("input");
    search.type = "search";
    search.className = "betterx-search-bar";
    search.placeholder = "Search plugins…";

    const viewToggle = document.createElement("div");
    viewToggle.className = "betterx-view-toggle";

    const isGrid = localStorage.getItem("betterx_plugins_view") === "grid";

    const listBtn = document.createElement("button");
    listBtn.className = `betterx-view-btn${isGrid ? "" : " betterx-view-btn-active"}`;
    listBtn.title = "List view";
    listBtn.innerHTML = `<svg viewBox="0 0 16 16" fill="currentColor" width="16" height="16"><rect x="0" y="1" width="16" height="2.5" rx="1"/><rect x="0" y="6.75" width="16" height="2.5" rx="1"/><rect x="0" y="12.5" width="16" height="2.5" rx="1"/></svg>`;

    const gridBtn = document.createElement("button");
    gridBtn.className = `betterx-view-btn${isGrid ? " betterx-view-btn-active" : ""}`;
    gridBtn.title = "Grid view";
    gridBtn.innerHTML = `<svg viewBox="0 0 16 16" fill="currentColor" width="16" height="16"><rect x="0" y="0" width="7" height="7" rx="1"/><rect x="9" y="0" width="7" height="7" rx="1"/><rect x="0" y="9" width="7" height="7" rx="1"/><rect x="9" y="9" width="7" height="7" rx="1"/></svg>`;

    viewToggle.append(listBtn, gridBtn);
    toolbar.append(search, viewToggle);

    const list = document.createElement("div");
    list.className = `betterx-plugin-list${isGrid ? " betterx-grid-view" : ""}`;

    // ── Detail view ──────────────────────────────────────────────────────────
    const detailView = document.createElement("div");
    detailView.className = "betterx-plugin-detail";
    detailView.style.display = "none";

    const openDetail = (plugin: Plugin, customOnBack?: () => void) => {
      listView.style.display = "none";
      renderDetailPanel(
        detailView,
        plugin,
        ctx,
        customOnBack ??
          (() => {
            detailView.style.display = "none";
            listView.style.display = "";
          }),
        openDetail
      );
      detailView.style.display = "";
    };
    _openDetailFn = openDetail;

    // ── Render plugins ───────────────────────────────────────────────────────
    const plugins = ctx.pluginManager.getAll();
    const meta = plugins.filter((p) => p.isMeta);
    const regular = plugins.filter((p) => !p.isMeta && !p.isLibrary);
    const libraries = plugins.filter((p) => p.isLibrary);

    const items: { plugin: Plugin; el: HTMLElement }[] = [];

    for (const p of meta) {
      const el = renderPlugin(p, ctx, openDetail);
      items.push({ plugin: p, el });
      list.appendChild(el);
    }

    for (const p of regular) {
      const el = renderPlugin(p, ctx, openDetail);
      items.push({ plugin: p, el });
      list.appendChild(el);
    }

    let libSep: HTMLElement | null = null;
    if (libraries.length > 0) {
      libSep = document.createElement("div");
      libSep.className = "betterx-library-section-label";
      libSep.textContent = "Libraries";
      list.appendChild(libSep);
      for (const p of libraries) {
        const el = renderPlugin(p, ctx, openDetail);
        items.push({ plugin: p, el });
        list.appendChild(el);
      }
    }

    listBtn.addEventListener("click", () => {
      list.classList.remove("betterx-grid-view");
      listBtn.classList.add("betterx-view-btn-active");
      gridBtn.classList.remove("betterx-view-btn-active");
      localStorage.setItem("betterx_plugins_view", "list");
    });

    gridBtn.addEventListener("click", () => {
      list.classList.add("betterx-grid-view");
      gridBtn.classList.add("betterx-view-btn-active");
      listBtn.classList.remove("betterx-view-btn-active");
      localStorage.setItem("betterx_plugins_view", "grid");
    });

    search.addEventListener("input", () => {
      const q = search.value.toLowerCase();
      let anyLibVisible = false;
      for (const { plugin, el } of items) {
        const match =
          plugin.isMeta ||
          plugin.name.toLowerCase().includes(q) ||
          (plugin.description?.toLowerCase().includes(q) ?? false);
        el.style.display = match ? "" : "none";
        if (plugin.isLibrary && match) anyLibVisible = true;
      }
      if (libSep) libSep.style.display = anyLibVisible ? "" : "none";
    });

    listView.append(toolbar, list);
    container.append(listView, detailView);
  },

  onActivate(container: HTMLElement, ctx: BetterXContext): void {
    const items = container.querySelectorAll<HTMLElement>(".betterx-plugin-item");
    items.forEach((item) => {
      const name = item.dataset.pluginName;
      if (!name) return;
      const p = ctx.pluginManager.get(name);
      if (!p) return;
      const input = item.querySelector<HTMLInputElement>(".betterx-toggle input");
      if (input) input.checked = p.enabled;
    });
  },
};
