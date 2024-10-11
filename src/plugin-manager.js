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
  
    applyPatches(patches) {
      console.log("Applying patches:", patches);
      // Implement patch application logic here
    }
  }