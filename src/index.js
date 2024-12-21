import { PluginManager } from './plugin-manager.js';
import { UIManager } from './ui-manager.js';
import { ThemeManager } from './theme-manager.js';

async function initializeBetterX() {
  const pluginManager = new PluginManager();
  const themeManager = new ThemeManager();
  await pluginManager.loadPlugins();

  // Initialize and apply plugins
  pluginManager.plugins.forEach(plugin => {
    if (plugin.enabled && typeof plugin.start === 'function') {
      plugin.start();
    }
  });

  // Create and inject BetterX UI
  const uiManager = new UIManager(pluginManager);
  uiManager.themeManager = themeManager;
  uiManager.injectBetterXUI();

  window.BetterX = {
    plugins: pluginManager.plugins,
    themes: themeManager.themes,
    togglePlugin: (pluginName) => pluginManager.togglePlugin(pluginName),
    createTheme: (name, css) => themeManager.createTheme(name, css)
  };

  console.log("BetterX loaded with plugins:", pluginManager.plugins.map(p => `${p.name} (${p.enabled ? 'enabled' : 'disabled'})`));
}

// Initialize BetterX when the script loads
initializeBetterX();