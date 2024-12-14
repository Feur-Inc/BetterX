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
    this.loadPluginData();
  }

  loadPluginData() {
    const savedData = JSON.parse(localStorage.getItem('betterXPluginStates')) || {};
    this.plugins.forEach(plugin => {
      plugin.settings = plugin.settings || {};
      plugin.settings.store = plugin.settings.store || {};
  
      if (savedData.hasOwnProperty(plugin.name)) {
        const pluginData = savedData[plugin.name];
        plugin.enabled = pluginData.enabled;
        
        // Merge saved settings with defaults
        if (plugin.options) {
          Object.keys(plugin.options).forEach(optionKey => {
            if (pluginData.settings && pluginData.settings.hasOwnProperty(optionKey)) {
              plugin.settings.store[optionKey] = pluginData.settings[optionKey];
            } else {
              plugin.settings.store[optionKey] = plugin.options[optionKey].default;
            }
          });
        }
      } else {
        plugin.enabled = false;
        // Initialize with default values
        if (plugin.options) {
          Object.keys(plugin.options).forEach(optionKey => {
            plugin.settings.store[optionKey] = plugin.options[optionKey].default;
          });
        }
      }
    });
  }
  

  savePluginData() {
    const data = {};
    this.plugins.forEach(plugin => {
      data[plugin.name] = {
        enabled: plugin.enabled,
        settings: plugin.settings?.store || {}
      };
    });
    localStorage.setItem('betterXPluginStates', JSON.stringify(data));
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
      this.savePluginData();
    }
  }

  updatePluginOption(pluginName, optionId, value) {
    const plugin = this.plugins.find(p => p.name === pluginName);
    if (plugin && plugin.settings && plugin.settings.store) {
      plugin.settings.store[optionId] = value;
      this.savePluginData();
    }
  }
}