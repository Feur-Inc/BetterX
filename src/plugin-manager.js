export class PluginManager {
  constructor() {
    this.plugins = [];
    this.uiElements = {};
  }

  async loadPlugins() {
    const pluginContext = require.context('./plugins', true, /index\.(js|ts)$/);
    for (const key of pluginContext.keys()) {
      const plugin = await pluginContext(key);
      if (plugin.default && typeof plugin.default === 'object') {
        this.plugins.push(plugin.default);
        console.log(plugin.default.name, "loaded");
      }
    }
    this.loadPluginStates();
    this.loadPluginSettings();
  }

  loadPluginStates() {
    const savedStates = JSON.parse(localStorage.getItem('betterXPluginStates')) || {};
    this.plugins.forEach(plugin => {
      if (savedStates.hasOwnProperty(plugin.name)) {
        plugin.enabled = savedStates[plugin.name];
      }
    });
  }

  savePluginStates() {
    const states = {};
    this.plugins.forEach(plugin => {
      states[plugin.name] = plugin.enabled;
    });
    localStorage.setItem('betterXPluginStates', JSON.stringify(states));
  }

  loadPluginSettings() {
    const savedSettings = JSON.parse(localStorage.getItem('betterXPluginSettings')) || {};
    this.plugins.forEach(plugin => {
      if (savedSettings.hasOwnProperty(plugin.name)) {
        plugin.settings = plugin.settings || {};
        plugin.settings.store = savedSettings[plugin.name];
      } else {
        plugin.settings = plugin.settings || {};
        plugin.settings.store = {};
        // Initialize with default values if available
        if (plugin.options) {
          Object.keys(plugin.options).forEach(optionKey => {
            plugin.settings.store[optionKey] = plugin.options[optionKey].default;
          });
        }
      }
    });
  }

  savePluginSettings() {
    const settings = {};
    this.plugins.forEach(plugin => {
      if (plugin.settings && plugin.settings.store) {
        settings[plugin.name] = plugin.settings.store;
      }
    });
    localStorage.setItem('betterXPluginSettings', JSON.stringify(settings));
  }

  togglePlugin(pluginName) {
    const plugin = this.plugins.find(p => p.name === pluginName);
    if (plugin) {
      plugin.enabled = !plugin.enabled;
      if (plugin.enabled && typeof plugin.start === 'function') {
        plugin.start();
      } else if (!plugin.enabled && typeof plugin.stop === 'function') {
        plugin.stop();
      }
      this.savePluginStates();
    }
  }

  updatePluginOption(pluginName, optionId, value) {
    const plugin = this.plugins.find(p => p.name === pluginName);
    if (plugin && plugin.settings && plugin.settings.store) {
      plugin.settings.store[optionId] = value;
      this.savePluginSettings();
      console.log(`Updated ${pluginName} option ${optionId} to:`, value);
    }
  }
}