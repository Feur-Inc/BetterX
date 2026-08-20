import { BETTERX_VERSION } from "../../utils/constants.js";
import { logger } from "../../utils/logger.js";
import type { BetterXContext, SettingsTab } from "../tab-registry.js";

// ─── Developer Tab ────────────────────────────────────────────────────────────

export const DeveloperTab: SettingsTab = {
  id: "developer",
  name: "Developer",
  priority: 30,

  initialize(container: HTMLElement, ctx: BetterXContext): void {
    container.innerHTML = "";

    // Plugin states debug
    const pluginSection = document.createElement("div");
    pluginSection.className = "betterx-dev-section";
    pluginSection.innerHTML = "<h3>Plugin States</h3>";

    const pluginList = document.createElement("div");
    pluginList.className = "betterx-dev-plugin-list";

    const updatePluginList = (): void => {
      const plugins = ctx.pluginManager.getAll();
      pluginList.innerHTML = plugins
        .map(
          (p) =>
            `<div class="betterx-dev-plugin-row"><strong class="betterx-dev-plugin-name">${p.name}</strong>: ${p.enabled ? "enabled" : "disabled"}</div>`
        )
        .join("");
    };
    updatePluginList();

    const refreshBtn = document.createElement("button");
    refreshBtn.className = "betterx-btn betterx-btn-secondary";
    refreshBtn.textContent = "Refresh";
    refreshBtn.addEventListener("click", updatePluginList);

    pluginSection.append(pluginList, refreshBtn);

    // Notification testing
    const notifSection = document.createElement("div");
    notifSection.className = "betterx-dev-section";
    notifSection.innerHTML = "<h3>Test Notifications</h3>";

    const actions = document.createElement("div");
    actions.className = "betterx-dev-actions";

    const types = [
      { label: "Info", fn: () => ctx.notifications.showInfo("This is an info notification") },
      { label: "Success", fn: () => ctx.notifications.showSuccess("Operation completed!") },
      { label: "Warning", fn: () => ctx.notifications.showWarning("Something might be wrong") },
      {
        label: "Error",
        fn: () => ctx.notifications.showError("An error occurred", { duration: 5000 }),
      },
    ];

    for (const { label, fn } of types) {
      const btn = document.createElement("button");
      btn.className = "betterx-btn betterx-btn-secondary";
      btn.textContent = label;
      btn.addEventListener("click", fn);
      actions.appendChild(btn);
    }

    notifSection.appendChild(actions);

    // Logger testing
    const logSection = document.createElement("div");
    logSection.className = "betterx-dev-section";
    logSection.innerHTML = "<h3>Logger</h3>";

    const logActions = document.createElement("div");
    logActions.className = "betterx-dev-actions";

    const logBtns = [
      { label: "Debug", fn: () => logger.debug("Debug message from Developer tab") },
      { label: "Info", fn: () => logger.info("Info message from Developer tab") },
      { label: "Warn", fn: () => logger.warn("Warning from Developer tab") },
      { label: "Error", fn: () => logger.error("Error from Developer tab") },
    ];

    for (const { label, fn } of logBtns) {
      const btn = document.createElement("button");
      btn.className = "betterx-btn betterx-btn-secondary";
      btn.textContent = label;
      btn.addEventListener("click", fn);
      logActions.appendChild(btn);
    }

    logSection.appendChild(logActions);

    container.append(pluginSection, notifSection, logSection);
  },
};
