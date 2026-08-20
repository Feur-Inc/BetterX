import type { BetterXContext, SettingsTab } from "@betterx/core";

// ─── Desktop Settings Tab ─────────────────────────────────────────────────────

function makeSection(title: string): HTMLElement {
  const section = document.createElement("div");
  section.className = "betterx-dev-section";
  const h3 = document.createElement("h3");
  h3.textContent = title;
  section.appendChild(h3);
  return section;
}

function makeToggleRow(
  label: string,
  description: string,
  checked: boolean,
  requiresRestart: boolean,
  onChange: (v: boolean) => void
): HTMLElement {
  const row = document.createElement("div");
  row.className = "betterx-option";

  const labelGroup = document.createElement("div");
  labelGroup.className = "betterx-option-label-group";

  const labelEl = document.createElement("div");
  labelEl.className = requiresRestart ? "betterx-option-label-badged" : "betterx-option-label";
  labelEl.textContent = label;

  if (requiresRestart) {
    const badge = document.createElement("span");
    badge.className = "betterx-restart-badge";
    badge.textContent = "restart required";
    labelEl.appendChild(badge);
  }

  const descEl = document.createElement("div");
  descEl.className = "betterx-option-description";
  descEl.textContent = description;

  labelGroup.append(labelEl, descEl);

  const toggle = document.createElement("label");
  toggle.className = "betterx-toggle";
  const input = document.createElement("input");
  input.type = "checkbox";
  input.checked = checked;
  const slider = document.createElement("span");
  slider.className = "betterx-toggle-slider";
  toggle.append(input, slider);
  input.addEventListener("change", () => onChange(input.checked));

  const control = document.createElement("div");
  control.className = "betterx-option-control";
  control.appendChild(toggle);

  row.append(labelGroup, control);
  return row;
}

export const DesktopTab: SettingsTab = {
  id: "desktop",
  name: "Desktop",
  priority: 25,

  initialize(container: HTMLElement, ctx: BetterXContext): void {
    container.innerHTML = "";

    const api = window.electronAPI;

    // ── App Behaviour ──────────────────────────────────────────────────────────
    const appSection = makeSection("App Behaviour");

    api.settings
      .getAll()
      .then((settings) => {
        const rows: Array<{ key: string; label: string; desc: string; restart?: boolean }> = [
          {
            key: "minimizeToTray",
            label: "Minimize to tray on close",
            desc: "Clicking × hides the window to the system tray instead of quitting.",
          },
          {
            key: "startMinimized",
            label: "Start minimized",
            desc: "Launch BetterX in the background without showing the window.",
          },
          {
            key: "autoStart",
            label: "Launch at login",
            desc: "Start BetterX automatically when you sign in.",
          },
          {
            key: "enableTransparency",
            label: "Window transparency",
            desc: "Makes the window background transparent.",
            restart: true,
          },
          {
            key: "enableDiscordRPC",
            label: "Discord Rich Presence",
            desc: "Show your current X activity as Discord status.",
          },
        ];

        for (const { key, label, desc, restart } of rows) {
          const row = makeToggleRow(
            label,
            desc,
            (settings[key] as boolean) ?? false,
            restart ?? false,
            (val) => {
              api.settings.set(key, val).catch(console.error);
            }
          );
          appSection.appendChild(row);
        }
      })
      .catch(() => {
        const err = document.createElement("p");
        err.className = "betterx-option-description";
        err.textContent = "Failed to load settings.";
        appSection.appendChild(err);
      });

    // ── Bundle ─────────────────────────────────────────────────────────────────
    const bundleSection = makeSection("Bundle");

    const pathDisplay = document.createElement("div");
    pathDisplay.className = "betterx-bundle-path";
    pathDisplay.textContent = "Loading…";

    api.settings
      .get("bundlePath")
      .then((p) => {
        pathDisplay.textContent = (p as string) || "(default built-in bundle)";
      })
      .catch(() => {});

    const bundleBtns = document.createElement("div");
    bundleBtns.className = "betterx-dev-actions";

    const chooseBtn = document.createElement("button");
    chooseBtn.className = "betterx-btn betterx-btn-secondary";
    chooseBtn.textContent = "Choose bundle…";
    chooseBtn.addEventListener("click", async () => {
      const path = await api.settings.chooseBundlePath();
      if (path) {
        pathDisplay.textContent = path;
        ctx.notifications.showSuccess("Bundle path updated. Restart to apply.", { duration: 4000 });
      }
    });

    const resetBundleBtn = document.createElement("button");
    resetBundleBtn.className = "betterx-btn betterx-btn-secondary";
    resetBundleBtn.textContent = "Reset to default";
    resetBundleBtn.addEventListener("click", async () => {
      await api.settings.set("bundlePath", "");
      pathDisplay.textContent = "(default built-in bundle)";
      ctx.notifications.showInfo("Reset to built-in bundle. Restart to apply.", { duration: 4000 });
    });

    bundleBtns.append(chooseBtn, resetBundleBtn);
    bundleSection.append(pathDisplay, bundleBtns);

    // ── Actions ────────────────────────────────────────────────────────────────
    const actionsSection = makeSection("Actions");
    const actionBtns = document.createElement("div");
    actionBtns.className = "betterx-dev-actions";

    const restartBtn = document.createElement("button");
    restartBtn.className = "betterx-btn betterx-btn-secondary";
    restartBtn.textContent = "Restart app";
    restartBtn.addEventListener("click", () => {
      api.restart?.();
    });

    actionBtns.append(restartBtn);
    actionsSection.appendChild(actionBtns);

    container.append(appSection, bundleSection, actionsSection);
  },
};
