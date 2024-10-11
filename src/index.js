import { PluginManager } from './plugin-manager.js';
import { UIManager } from './ui-manager.js';

async function initializeBetterX() {
  const pluginManager = new PluginManager();
  await pluginManager.loadPlugins();

  // Initialize and apply plugins
  pluginManager.plugins.forEach(plugin => {
    if (plugin.enabled && typeof plugin.start === 'function') {
      plugin.start();
    }
    if (plugin.enabled && Array.isArray(plugin.patches)) {
      pluginManager.applyPatches(plugin.patches);
    }
  });

  // Create and inject BetterX UI
  const uiManager = new UIManager(pluginManager);
  uiManager.injectBetterXUI();

  window.BetterX = {
    plugins: pluginManager.plugins,
    togglePlugin: (pluginName) => pluginManager.togglePlugin(pluginName)
  };

  console.log("BetterX loaded with plugins:", pluginManager.plugins.map(p => `${p.name} (${p.enabled ? 'enabled' : 'disabled'})`));
}

// Initialize BetterX when the script loads
initializeBetterX();