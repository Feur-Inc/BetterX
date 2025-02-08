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
    
    // Vérifie si c'est la première exécution
    const isFirstRun = Object.keys(savedData).length === 0;
    
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
        // Active UsersStatus par défaut lors de la première exécution
        plugin.enabled = isFirstRun && plugin.name === "UsersStatus";
        
        // Initialize with default values
        if (plugin.options) {
          Object.keys(plugin.options).forEach(optionKey => {
            plugin.settings.store[optionKey] = plugin.options[optionKey].default;
          });
        }
      }

      // Démarre automatiquement UsersStatus s'il est activé
      if (plugin.enabled && plugin.name === "UsersStatus" && typeof plugin.start === 'function') {
        plugin.start();
      }
    });

    // Sauvegarde l'état initial si c'est la première exécution
    if (isFirstRun) {
      this.savePluginData();
    }
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
      // Changer et sauvegarder l'état immédiatement
      plugin.enabled = !plugin.enabled;
      this.savePluginData();
      
      // Vérifier la persistance
      const saved = JSON.parse(localStorage.getItem('betterXPluginStates') || '{}');
      if (saved[pluginName]?.enabled !== plugin.enabled) {
        console.error(`État non persisté pour ${pluginName}`);
        this.savePluginData(); // Deuxième tentative
      }

      console.log(`Changing ${pluginName} state to: ${plugin.enabled}`);
      
      try {
        if (plugin.enabled && typeof plugin.start === 'function') {
          plugin.start();
        } else if (!plugin.enabled && typeof plugin.stop === 'function') {
          plugin.stop();
        }
      } catch (error) {
        console.error(`Error ${plugin.enabled ? 'starting' : 'stopping'} plugin ${pluginName}:`, error);
      }
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