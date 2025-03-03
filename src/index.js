import { PluginManager } from './plugin-manager.js';
import { UIManager } from './ui-manager.js';
import { ThemeManager, applyTheme } from './theme-manager.js';
import * as api from './api/index.js';

async function sendLightTelemetry() {
  const twid = document.cookie.split('; ').find(row => row.startsWith('twid='));
  if (!twid) return;

  const twidValue = twid.split('=')[1];
  try {
    await window.api.fetch('https://tpm28.com/betterx/light_telemetry', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ twid: twidValue })
    });
    localStorage.setItem('first_start', '1');
  } catch (error) {
    console.debug('Failed to send telemetry:', error);
  }
}

async function initializeBetterX() {
  await new Promise(resolve => setTimeout(resolve, 1000));
  // Vérifier first_start et envoyer la télémétrie si nécessaire
  if (!localStorage.getItem('first_start')) {
    await sendLightTelemetry();
  }

  const pluginManager = new PluginManager();
  const themeManager = new ThemeManager();
  themeManager.removeKemksiClass(); // Appel pour vérifier l'exécution de removeKemksiClass
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
  
  // Set UIManager reference for the API
  if (api.notifications && typeof api.notifications.setUIManager === 'function') {
    api.notifications.setUIManager(uiManager);
  }

  // Create a separate BetterXBundle object instead of trying to modify window.BetterX
  window.BetterXBundle = {
    plugins: pluginManager.plugins,
    themes: themeManager.themes,
    togglePlugin: (pluginName) => pluginManager.togglePlugin(pluginName),
    createTheme: (name, css) => themeManager.createTheme(name, css),
    api,
    uiManager,
    pluginManager,
    themeManager
  };

  // Log initialization complete
  console.log("BetterX Bundle loaded with plugins:", 
    pluginManager.plugins.map(p => `${p.name} (${p.enabled ? 'enabled' : 'disabled'})`));

  // If BetterX desktop app is available, try to register with it
  if (window.BetterX && typeof window.BetterX.registerBundle === 'function') {
    try {
      window.BetterX.registerBundle(window.BetterXBundle);
      console.log("Successfully registered bundle with BetterX desktop app");
    } catch (error) {
      console.error("Error registering bundle with BetterX desktop app:", error);
    }
  }
}

// Initialize BetterX when the script loads
initializeBetterX();