import { BETTERX_VERSION, Devs } from "../../utils/constants.js";
import { openContributorModal } from "../contributor-modal.js";
import type { BetterXContext, SettingsTab } from "../tab-registry.js";

// ─── About Tab ────────────────────────────────────────────────────────────────

function escHtml(str: string): string {
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
}

export const AboutTab: SettingsTab = {
  id: "about",
  name: "About",
  priority: 40,

  initialize(container: HTMLElement, ctx: BetterXContext): void {
    container.innerHTML = "";

    const contributors = Object.values(Devs);

    const html = `
      <div class="betterx-about">
        ${ctx.logoUrl ? `<img class="betterx-about-logo" src="${ctx.logoUrl}" alt="BetterX" />` : ""}
        <h2>BetterX</h2>
        <div class="betterx-about-version">Version ${escHtml(BETTERX_VERSION)}</div>
        <p class="betterx-about-description">
          An open-source enhancement tool for X (formerly Twitter).
          Made with ❤️ by the community.
        </p>

        <div class="betterx-about-contributors-section">
          <h3 class="betterx-about-contributors-title">Contributors</h3>
          <div class="betterx-about-contributors" id="about-contributors"></div>
        </div>

        <div class="betterx-about-actions">
          <a href="https://github.com/feur-inc/BetterX"
             target="_blank" rel="noopener noreferrer"
             class="betterx-btn betterx-btn-secondary">
            GitHub
          </a>
        </div>
      </div>
    `;
    container.innerHTML = html;

    // Build contributor cards as buttons that open the contributor modal
    const contributorsEl = container.querySelector<HTMLElement>("#about-contributors");
    if (contributorsEl) {
      for (const dev of contributors) {
        const btn = document.createElement("button");
        btn.className = "betterx-author-badge betterx-about-contributor-btn";

        const avatar = document.createElement("img");
        avatar.className = "betterx-author-avatar betterx-about-contributor-avatar";
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

        const info = document.createElement("div");
        const nameEl = document.createElement("div");
        nameEl.className = "betterx-contributor-name";
        nameEl.textContent = dev.name;
        const handleEl = document.createElement("div");
        handleEl.textContent = `@${dev.handle}`;
        info.append(nameEl, handleEl);

        btn.append(avatar, info);
        btn.addEventListener("click", () => openContributorModal(dev, ctx));
        contributorsEl.appendChild(btn);
      }
    }
  },
};
