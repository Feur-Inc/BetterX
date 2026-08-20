import type { Developer, Plugin } from "../types/plugin.js";
import { getSettingsModal } from "./modal.js";
import type { BetterXContext } from "./tab-registry.js";
import { renderPluginBody } from "./tabs/plugins-tab.js";

// ─── Contributor Modal ────────────────────────────────────────────────────────

const OVERLAY_ID = "bx-contributor-overlay";

function escHtml(str: string): string {
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
}

function platformLabel(platform: string): string {
  if (platform === "desktop") return "Desktop only";
  if (platform === "extension") return "Extension only";
  return platform;
}

function buildPluginCard(
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
  item.style.marginBottom = "0";

  const header = document.createElement("div");
  header.className = "betterx-plugin-header";
  header.style.cursor = "pointer";

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

  header.addEventListener("click", (e) => {
    if ((e.target as HTMLElement).closest(".betterx-toggle")) return;
    onOpenDetail(plugin);
  });

  return item;
}

export function openContributorModal(dev: Developer, ctx: BetterXContext): void {
  document.getElementById(OVERLAY_ID)?.remove();

  const plugins = ctx.pluginManager
    .getAll()
    .filter((p) => p.authors?.some((a) => a.handle === dev.handle));

  // Hide the BetterX modal while this one is open
  const bxModal = getSettingsModal();
  bxModal?.hide();

  const overlay = document.createElement("div");
  overlay.id = OVERLAY_ID;
  overlay.className = "bx-cm-overlay";

  // If BetterX modal closes while contributor modal is open → remove contributor too
  const unsubClose = bxModal?.onClose(() => {
    overlay.remove();
    document.removeEventListener("keydown", onKey);
  });

  const closeSelf = (restoreBx = true) => {
    overlay.remove();
    document.removeEventListener("keydown", onKey);
    unsubClose?.();
    if (restoreBx) bxModal?.show();
  };

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeSelf();
  });

  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") closeSelf();
  };
  document.addEventListener("keydown", onKey);

  const modal = document.createElement("div");
  modal.className = "bx-cm-modal";

  // ── Header ────────────────────────────────────────────────────────────────
  const header = document.createElement("div");
  header.className = "bx-cm-header";

  const avatar = document.createElement("img");
  avatar.className = "bx-cm-avatar";
  avatar.alt = dev.name;
  avatar.addEventListener("error", () => {
    avatar.style.display = "none";
  });
  const avatarUrl = `https://unavatar.io/twitter/${dev.handle}`;
  if (ctx.proxyImage) {
    ctx
      .proxyImage(avatarUrl)
      .then((src) => {
        avatar.src = src;
      })
      .catch(() => {
        avatar.src = avatarUrl;
      });
  } else {
    avatar.src = avatarUrl;
  }

  const headerInfo = document.createElement("div");
  const devNameEl = document.createElement("div");
  devNameEl.className = "bx-cm-name";
  devNameEl.textContent = dev.name;
  const handleEl = document.createElement("div");
  handleEl.className = "bx-cm-handle";
  handleEl.textContent = `@${dev.handle}`;
  headerInfo.append(devNameEl, handleEl);
  header.append(avatar, headerInfo);

  // ── Plugins section ───────────────────────────────────────────────────────
  const pluginsSection = document.createElement("div");
  pluginsSection.className = "bx-cm-section";

  const sectionLabel = document.createElement("div");
  sectionLabel.className = "bx-cm-section-label";
  sectionLabel.textContent = "Plugins";

  const pluginList = document.createElement("div");
  pluginList.className = "bx-cm-plugin-list";

  pluginsSection.append(sectionLabel, pluginList);

  const showDetail = (plugin: Plugin) => {
    const pdOverlay = document.createElement("div");
    pdOverlay.className = "bx-pd-overlay";

    const pdModal = document.createElement("div");
    pdModal.className = "bx-pd-modal";

    // Header
    const pdHeader = document.createElement("div");
    pdHeader.className = "bx-pd-header";

    const backBtn = document.createElement("button");
    backBtn.className = "betterx-detail-back";
    backBtn.innerHTML = `<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3L5 8l5 5"/></svg> ${escHtml(dev.name)}`;
    backBtn.addEventListener("click", () => pdOverlay.remove());

    const closeBtn = document.createElement("button");
    closeBtn.className = "betterx-modal-close";
    closeBtn.setAttribute("aria-label", "Close");
    closeBtn.textContent = "✕";
    closeBtn.addEventListener("click", () => pdOverlay.remove());

    pdHeader.append(backBtn, closeBtn);

    // Hero
    const hero = document.createElement("div");
    hero.className = "betterx-detail-hero";

    const heroTop = document.createElement("div");
    heroTop.className = "betterx-detail-hero-top";

    const pluginNameEl = document.createElement("div");
    pluginNameEl.className = "betterx-detail-name";
    pluginNameEl.textContent = plugin.name;

    if (plugin.unavailable && plugin.platform) {
      const badge = document.createElement("span");
      badge.className = "betterx-platform-badge";
      badge.textContent = platformLabel(plugin.platform);
      pluginNameEl.appendChild(badge);
    }

    if (plugin.isLibrary) {
      const autoBadge = document.createElement("span");
      autoBadge.className = plugin.enabled
        ? "betterx-auto-badge betterx-auto-badge-on"
        : "betterx-auto-badge betterx-auto-badge-off";
      autoBadge.textContent = plugin.enabled ? "Active" : "Standby";
      heroTop.append(pluginNameEl, autoBadge);
    } else if (plugin.isMeta) {
      heroTop.append(pluginNameEl);
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
      heroTop.append(pluginNameEl, toggle);
    }
    hero.appendChild(heroTop);

    if (plugin.description) {
      const desc = document.createElement("div");
      desc.className = "betterx-detail-description";
      desc.textContent = plugin.description;
      hero.appendChild(desc);
    }

    // Body (hero + content together so padding is consistent)
    const body = document.createElement("div");
    body.className = "bx-pd-body";
    body.appendChild(hero);
    renderPluginBody(body, plugin, ctx);

    pdModal.append(pdHeader, body);
    pdOverlay.appendChild(pdModal);
    document.body.appendChild(pdOverlay);

    pdOverlay.addEventListener("click", (e) => {
      if (e.target === pdOverlay) pdOverlay.remove();
    });
    const onPdKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        pdOverlay.remove();
        document.removeEventListener("keydown", onPdKey);
      }
    };
    document.addEventListener("keydown", onPdKey);
    pdOverlay.addEventListener("remove", () => document.removeEventListener("keydown", onPdKey));
  };

  if (plugins.length > 0) {
    for (const plugin of plugins) {
      const card = buildPluginCard(plugin, ctx, showDetail);
      pluginList.appendChild(card);
    }
  } else {
    const empty = document.createElement("div");
    empty.className = "bx-cm-empty";
    empty.textContent = "No plugins found.";
    pluginList.appendChild(empty);
  }

  // ── Footer ────────────────────────────────────────────────────────────────
  const footer = document.createElement("div");
  footer.className = "bx-cm-footer";

  const closeBtn = document.createElement("button");
  closeBtn.className = "betterx-button";
  closeBtn.textContent = "Close";
  closeBtn.addEventListener("click", () => closeSelf());

  const twitterBtn = document.createElement("a");
  twitterBtn.className = "betterx-button betterx-button-primary";
  twitterBtn.href = `https://x.com/${dev.handle}`;
  twitterBtn.textContent = "View on X →";
  twitterBtn.addEventListener("click", (e) => {
    e.preventDefault();
    closeSelf(false); // navigate away — don't restore BetterX modal
    location.href = `https://x.com/${dev.handle}`;
  });

  footer.append(closeBtn, twitterBtn);
  modal.append(header, pluginsSection, footer);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
}
