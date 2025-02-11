import { PluginManager } from './plugin-manager.js';
import { UIManager } from './ui-manager.js';
import { ThemeManager, applyTheme } from './theme-manager.js';

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
  // Attendre 1 seconde
  console.log("Waiting 1 second...");
  await new Promise(resolve => setTimeout(resolve, 1000));
  console.log("1 second passed!");
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