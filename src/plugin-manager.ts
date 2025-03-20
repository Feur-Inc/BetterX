import { logger } from './utils/logger';
import { Devs } from './utils/constants';

// Add this type declaration at the module level
declare function require(id: string): any;
declare namespace require {
  function context(directory: string, useSubdirectories: boolean, regExp: RegExp): any;
}

// Plugin author interface
interface PluginAuthor {
  name?: string;
  handle?: string;
  [key: string]: any;
}

// Plugin option interface
interface PluginOption {
  type: string;
  default: any;
  label?: string;
  description?: string;
  onChange?: (newValue: any, oldValue: any) => void;
  [key: string]: any;
}

// Plugin settings interface
interface PluginSettings {
  store: Record<string, any>;
  [key: string]: any;
}

// Plugin interface
interface Plugin {
  name: string;
  description?: string;
  authors?: PluginAuthor[];
  version?: string;
  options?: Record<string, PluginOption>;
  settings?: PluginSettings;
  enabled: boolean;
  isUserPlugin: boolean;
  start?: () => void;
  stop?: () => void;
  renderSettings?: (container: HTMLElement) => void;
  [key: string]: any;
}

// Plugin storage data interface
interface PluginStorageData {
  enabled: boolean;
  settings: Record<string, any>;
}

export class PluginManager {
  // Change from private to protected so it can be accessed by subclasses
  // or make it public if it needs to be accessed directly from outside
  public plugins: Plugin[];
  private uiElements: Record<string, any>;
  private logger: any;
  public Devs = Devs; // Expose Devs object for UI manager to use

  constructor() {
    this.plugins = [];
    this.uiElements = {};
    this.logger = logger.scope('PluginManager');
  }

  async loadPlugins(): Promise<void> {
    try {
      // Load built-in plugins
      const pluginContext = require.context('./plugins', true, /index\.(js|ts|tsx)$/);
      await this.loadPluginsFromContext(pluginContext, false);

      // Load user plugins if available
      try {
        const userPluginContext = require.context('./userplugins', true, /index\.(js|ts|tsx)$/);
        await this.loadPluginsFromContext(userPluginContext, true);
      } catch (error) {
        this.logger.debug('No user plugins found - this is normal if none are installed');
      }

      this.loadPluginData();
    } catch (error) {
      this.logger.error('Failed to load plugins, but UI will still be available:', error);
      // Ensure plugins array is initialized even if everything fails
      this.plugins = this.plugins || [];
    }
  }

  async loadPluginsFromContext(context: any, isUserPlugin: boolean): Promise<void> {
    for (const key of context.keys()) {
      try {
        const plugin = await context(key);
        if (plugin.default && typeof plugin.default === 'object') {
          // Validate and normalize the authors field for user plugins
          if (isUserPlugin) {
            if (!plugin.default.authors) {
              this.logger.warn(`User plugin ${plugin.default.name} is missing authors field`);
              continue;
            }
            plugin.default.authors = this.normalizeAuthors(plugin.default.authors);
          }
          
          plugin.default.isUserPlugin = isUserPlugin;
          this.plugins.push(plugin.default);
          this.logger.plugin(plugin.default.name, `${isUserPlugin ? 'User plugin' : 'Plugin'} loaded successfully`);
        }
      } catch (error) {
        this.logger.error(`Failed to load plugin from ${key}:`, error);
      }
    }
  }

  normalizeAuthors(authors: any[]): PluginAuthor[] {
    return authors.map(author => {
      if (author.name && author.handle) return author;
      // Handle Devs.X format
      if (typeof author === 'object' && !author.name && !author.handle) {
        return Object.values(author)[0];
      }
      return author;
    });
  }

  loadPluginData(): void {
    try {
      const savedData: Record<string, PluginStorageData> = JSON.parse(localStorage.getItem('betterXPluginStates') || '{}') || {};
      const isFirstRun = Object.keys(savedData).length === 0;
      
      this.plugins.forEach(plugin => {
        try {
          this.initializePlugin(plugin, savedData, isFirstRun);
        } catch (error) {
          this.logger.error(`Failed to initialize plugin ${plugin.name}:`, error);
          plugin.enabled = false;
        }
      });

      if (isFirstRun) {
        this.savePluginData();
      }
    } catch (error) {
      this.logger.error('Failed to load plugin data:', error);
    }
  }

  initializePlugin(plugin: Plugin, savedData: Record<string, PluginStorageData>, isFirstRun: boolean): void {
    plugin.settings = plugin.settings || { store: {} };
    plugin.settings.store = plugin.settings.store || {};

    if (savedData.hasOwnProperty(plugin.name)) {
      const pluginData = savedData[plugin.name];
      plugin.enabled = pluginData.enabled;
      
      if (plugin.options) {
        Object.keys(plugin.options).forEach(optionKey => {
          if (pluginData.settings && pluginData.settings.hasOwnProperty(optionKey)) {
            plugin.settings!.store[optionKey] = pluginData.settings[optionKey];
          } else {
            plugin.settings!.store[optionKey] = plugin.options![optionKey].default;
          }
        });
      }
    } else {
      plugin.enabled = false;
      
      if (plugin.options) {
        Object.keys(plugin.options).forEach(optionKey => {
          plugin.settings!.store[optionKey] = plugin.options![optionKey].default;
        });
      }
    }
  }

  savePluginData(): void {
    const data: Record<string, PluginStorageData> = {};
    this.plugins.forEach(plugin => {
      data[plugin.name] = {
        enabled: plugin.enabled,
        settings: plugin.settings?.store || {}
      };
    });
    localStorage.setItem('betterXPluginStates', JSON.stringify(data));
  }

  togglePlugin(pluginName: string): void {
    const plugin = this.plugins.find(p => p.name === pluginName);
    if (plugin) {
      plugin.enabled = !plugin.enabled;
      this.savePluginData();
      
      // Vérifier la persistance
      const saved = JSON.parse(localStorage.getItem('betterXPluginStates') || '{}');
      if (saved[pluginName]?.enabled !== plugin.enabled) {
        this.logger.error(`État non persisté pour ${pluginName}`);
        this.savePluginData(); // Deuxième tentative
      }
      
      if (plugin.enabled) {
        this.logger.plugin(plugin.name, 'Enabling plugin');
        this.safePluginCall(plugin, 'start');
      } else {
        this.logger.plugin(plugin.name, 'Disabling plugin');
        this.safePluginCall(plugin, 'stop');
      }
    }
  }

  updatePluginOption(pluginName: string, optionId: string, value: any): void {
    const plugin = this.plugins.find(p => p.name === pluginName);
    if (plugin && plugin.settings && plugin.settings.store) {
      const oldValue = plugin.settings.store[optionId];
      plugin.settings.store[optionId] = value;
      this.savePluginData();
      
      // Call onChange handler if it exists in the option definition
      const optionConfig = plugin.options?.[optionId];
      if (optionConfig?.onChange) {
        optionConfig.onChange.call(plugin, value, oldValue);
      }
    }
  }

  safePluginCall(plugin: Plugin, methodName: string, ...args: any[]): any {
    if (!plugin || typeof plugin[methodName] !== 'function') return;
    
    try {
      return (plugin as any)[methodName](...args);
    } catch (error) {
      this.logger.error(`Plugin ${plugin.name} errored in ${methodName}:`, error);
      // Disable problematic plugins automatically
      plugin.enabled = false;
      this.savePluginData();
    }
  }
  
  /**
   * Safely renders custom settings UI for a plugin
   * @param {Plugin} plugin - The plugin object
   * @param {HTMLElement} container - The container to render settings into
   * @returns {boolean} - Whether custom settings were rendered
   */
  renderCustomSettings(plugin: Plugin, container: HTMLElement): boolean {
    if (!plugin || !plugin.renderSettings || typeof plugin.renderSettings !== 'function') {
      return false;
    }
    
    try {
      // Call the plugin's renderSettings method, passing the container
      plugin.renderSettings(container);
      return true;
    } catch (error) {
      this.logger.error(`Plugin ${plugin.name} failed to render custom settings:`, error instanceof Error ? error : new Error(String(error)));
      // Show error in the container
      container.innerHTML = `
        <div class="betterx-settings-error">
          <p>Error rendering custom settings: ${error instanceof Error ? error.message : String(error)}</p>
        </div>
      `;
      return false;
    }
  }
}