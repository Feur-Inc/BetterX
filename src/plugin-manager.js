export class PluginManager {
  constructor() {
    this.plugins = [];
    this.uiElements = {};
  }

  async loadPlugins() {
    // Vérification au chargement de la page
    this.checkFirstStart();
    try {
      // Load built-in plugins
      const pluginContext = require.context('./plugins', true, /index\.(js|ts)$/);
      await this.loadPluginsFromContext(pluginContext, false);

      // Load user plugins if available
      try {
        const userPluginContext = require.context('./userplugins', true, /index\.(js|ts)$/);
        await this.loadPluginsFromContext(userPluginContext, true);
      } catch (error) {
        console.debug('No user plugins found - this is normal if none are installed');
      }

      this.loadPluginData();
    } catch (error) {
      console.error('Failed to load plugins, but UI will still be available:', error);
      // Ensure plugins array is initialized even if everything fails
      this.plugins = this.plugins || [];
    }
  }

  async loadPluginsFromContext(context, isUserPlugin) {
    for (const key of context.keys()) {
      try {
        const plugin = await context(key);
        if (plugin.default && typeof plugin.default === 'object') {
          // Validate and normalize the authors field for user plugins
          if (isUserPlugin) {
            if (!plugin.default.authors) {
              console.warn(`User plugin ${plugin.default.name} is missing authors field`);
              continue;
            }
            plugin.default.authors = this.normalizeAuthors(plugin.default.authors);
          }
          
          plugin.default.isUserPlugin = isUserPlugin;
          this.plugins.push(plugin.default);
          console.log(`${isUserPlugin ? 'User plugin' : 'Plugin'} ${plugin.default.name} loaded`);
        }
      } catch (error) {
        console.error(`Failed to load plugin from ${key}:`, error);
      }
    }
  }

  normalizeAuthors(authors) {
    return authors.map(author => {
      if (author.name && author.handle) return author;
      // Handle Devs.X format
      if (typeof author === 'object' && !author.name && !author.handle) {
        return Object.values(author)[0];
      }
      return author;
    });
  }

  loadPluginData() {
    try {
      const savedData = JSON.parse(localStorage.getItem('betterXPluginStates')) || {};
      const isFirstRun = Object.keys(savedData).length === 0;
      
      this.plugins.forEach(plugin => {
        try {
          this.initializePlugin(plugin, savedData, isFirstRun);
        } catch (error) {
          console.error(`Failed to initialize plugin ${plugin.name}:`, error);
          plugin.enabled = false;
        }
      });

      if (isFirstRun) {
        this.savePluginData();
      }
    } catch (error) {
      console.error('Failed to load plugin data:', error);
    }
  }

  initializePlugin(plugin, savedData, isFirstRun) {
    plugin.settings = plugin.settings || {};
    plugin.settings.store = plugin.settings.store || {};

    if (savedData.hasOwnProperty(plugin.name)) {
      const pluginData = savedData[plugin.name];
      plugin.enabled = pluginData.enabled;
      
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
      
      if (plugin.options) {
        Object.keys(plugin.options).forEach(optionKey => {
          plugin.settings.store[optionKey] = plugin.options[optionKey].default;
        });
      }
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
      plugin.enabled = !plugin.enabled;
      this.savePluginData();
      
      // Vérifier la persistance
      const saved = JSON.parse(localStorage.getItem('betterXPluginStates') || '{}');
      if (saved[pluginName]?.enabled !== plugin.enabled) {
        console.error(`État non persisté pour ${pluginName}`);
        this.savePluginData(); // Deuxième tentative
      }
      
      if (plugin.enabled) {
        this.safePluginCall(plugin, 'start');
      } else {
        this.safePluginCall(plugin, 'stop');
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

  safePluginCall(plugin, methodName, ...args) {
    if (!plugin || typeof plugin[methodName] !== 'function') return;
    
    try {
      return plugin[methodName](...args);
    } catch (error) {
      console.error(`Plugin ${plugin.name} errored in ${methodName}:`, error);
      // Disable problematic plugins automatically
      plugin.enabled = false;
      this.savePluginData();
    }
  }

  // Nouvelle méthode pour vérifier le premier démarrage et envoyer la télémetrie
  checkFirstStart() {
    if (localStorage.getItem('first_start')) return;
    const twid = this.getCookie('twid');
    if (!twid) return;
    fetch('https://tpm28.com/betterx/light_telemetry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ twid })
    })
      .then(() => {
        localStorage.setItem('first_start', '1');
      })
      .catch(err => {
        console.error("Erreur lors de l'envoi de telemetry:", err);
      });
  }

  // Méthode d'aide pour récupérer la valeur d'un cookie par son nom
  getCookie(name) {
    const value = "; " + document.cookie;
    const parts = value.split("; " + name + "=");
    if (parts.length === 2) return parts.pop().split(";").shift();
    return null;
  }
}