import { OptionType } from "@utils/types";
import { EditorView, basicSetup } from "codemirror";
import { css } from "@codemirror/lang-css";
import { oneDark } from '@codemirror/theme-one-dark';
import { ThemeManager } from './theme-manager.js';
import { NotificationManager } from './notification-manager.js';
import { createSettingsModal } from './ui/settings-modal.js';
import { createBetterXTab, addBetterXTab } from './ui/tab-creator.js';
import { createThemeEditor, formatCSS } from './ui/theme-editor.js';
import { populatePluginList, createOptionElement } from './ui/plugin-list.js';
import { populateDeveloperSettings, createNotificationTester } from './ui/developer-settings.js';
import { injectFooterLink, registerFooterThemeUpdater, updateFooterLinkColors } from './ui/footer-mod.js';
import { injectUIStyles } from './ui/styles.js';
import { watchThemeChanges, applyThemeColors } from './utils/theme-detector.js';
import { getAccentColor } from './utils/accent-color.js';

export class UIManager {
  constructor(pluginManager) {
    this.pluginManager = pluginManager;
    this.observer = null;
    this.themeManager = new ThemeManager();
    this.notifications = new NotificationManager();
    this.initialActiveThemes = new Set();
    this.themeTabVisited = false;
    this.developerTabVisited = false;
    this.initialPluginStates = new Map();
    this.createBetterXTab = createBetterXTab; // Reference the function directly
    this.notificationTesterModal = null;
    this.themeObserver = null;
    this.themeChangeCallbacks = [];
  }

  createUIElement(elementType, properties) {
    const element = document.createElement(elementType);
    Object.assign(element, properties);
    return element;
  }

  createSettingsModal() {
    return createSettingsModal(this);
  }

  captureInitialPluginStates() {
    this.initialPluginStates.clear();
    this.pluginManager.plugins.forEach(plugin => {
      this.initialPluginStates.set(plugin.name, {
        enabled: plugin.enabled,
        settings: JSON.stringify(plugin.settings.store)
      });
    });
  }

  getChangedPlugins() {
    const changedPlugins = [];
    this.pluginManager.plugins.forEach(plugin => {
      const initial = this.initialPluginStates.get(plugin.name);
      if (!initial) return;

      const currentSettings = JSON.stringify(plugin.settings.store);
      if (initial.enabled !== plugin.enabled || initial.settings !== currentSettings) {
        // Only add plugins that need a restart
        if (plugin.requiresRestart) {
          changedPlugins.push(plugin.name);
        } else if (initial.enabled !== plugin.enabled) {
          // If the plugin was toggled but doesn't need restart,
          // trigger the start/stop method directly
          if (plugin.enabled) {
            this.pluginManager.safePluginCall(plugin, 'start');
          } else {
            this.pluginManager.safePluginCall(plugin, 'stop');
          }
        }
      }
    });
    return changedPlugins;
  }

  createRestartDialog(changedPlugins) {
    // Add debugging to ensure we're reaching this point
    
    // Ensure notifications manager is initialized
    if (!this.notifications) {
      console.error('Notification manager not initialized');
      return;
    }

    // Create notification with higher visibility
    this.notifications.createNotification({
      title: 'Restart Required',
      message: `The following plugins require a restart to apply changes: <strong>${changedPlugins.join(', ')}</strong>`,
      type: 'warning',
      duration: 0, // Stay until dismissed
      html: true, // Allow HTML in message
      progress: false,
      actions: [
        { 
          label: 'Later',
          callback: () => {},
          autoClose: true
        },
        {
          label: 'Restart Now',
          callback: () => {
            window.location.reload();
          }
        }
      ]
    });
  }

  handleModalClose(modal) {
    // Get changed plugins that require restart
    const changedPlugins = this.getChangedPlugins();
    
    // Hide the modal
    modal.style.display = 'none';
    this.themeTabVisited = false;

    // Show restart dialog if necessary
    if (changedPlugins.length > 0) {
      // Small delay to ensure modal closing animation completes first
      setTimeout(() => this.createRestartDialog(changedPlugins), 100);
    }
  }

  initializeThemeUI(modal) {
    const themesContainer = modal.querySelector('.betterx-themes-container');
    const newThemeButton = modal.querySelector('#new-theme');
    newThemeButton.addEventListener('click', async () => {
      // Afficher l'éditeur pour créer un nouveau thème
      await this.showThemeEditor(null);
      // Une fois terminé, relire les thèmes et rafraîchir l'affichage
      await this.themeManager.initializeThemes();
      this.refreshThemesList(themesContainer);
    });
    this.refreshThemesList(themesContainer);
  }

  refreshThemesList(container) {
    container.innerHTML = '';
    this.themeManager.themes.forEach(theme => {
      const themeElement = this.createUIElement('div', {
        className: 'betterx-theme-item',
        draggable: true,
        innerHTML: `
          <div class="betterx-theme-header">
            <div class="betterx-drag-handle">
              <svg viewBox="0 0 24 24" width="16" height="16">
                <path fill="currentColor" d="M3 8h18v2H3V8zm0 5h18v2H3v-2zm0 5h18v2H3v-2z"/>
              </svg>
            </div>
            <h3>${theme.name}</h3>
            <div class="betterx-theme-controls">
              <label class="betterx-switch">
                <input type="checkbox" ${theme.enabled ? 'checked' : ''}>
                <span class="betterx-slider"></span>
              </label>
              <button class="betterx-button edit">Edit</button>
              <button class="betterx-button delete">Delete</button>
            </div>
          </div>
        `
      });

      // Add drag and drop event listeners
      themeElement.dataset.themeId = theme.id;
      
      themeElement.addEventListener('dragstart', (e) => {
        e.target.classList.add('dragging');
        e.dataTransfer.setData('text/plain', theme.id);
        e.dataTransfer.effectAllowed = 'move';
      });

      themeElement.addEventListener('dragend', (e) => {
        e.target.classList.remove('dragging');
      });

      themeElement.addEventListener('dragover', (e) => {
        e.preventDefault();
        const draggingElement = container.querySelector('.dragging');
        if (draggingElement !== themeElement) {
          const box = themeElement.getBoundingClientRect();
          const offsetY = e.clientY - box.top - box.height / 2;
          
          if (offsetY < 0) {
            themeElement.parentNode.insertBefore(draggingElement, themeElement);
          } else {
            themeElement.parentNode.insertBefore(draggingElement, themeElement.nextSibling);
          }
        }
      });

      // Update theme toggle handler
      const toggle = themeElement.querySelector('input[type="checkbox"]');
      toggle.addEventListener('change', () => {
        this.themeManager.toggleTheme(theme.id, toggle.checked);
      });

      themeElement.querySelector('.edit').addEventListener('click', () => {
        this.showThemeEditor(theme);
      });

      themeElement.querySelector('.delete').addEventListener('click', async () => {
        if (confirm('Are you sure you want to delete this theme?')) {
          await this.themeManager.deleteTheme(theme.id);
          this.refreshThemesList(container);
        }
      });

      container.appendChild(themeElement);
    });

    // Add drop event listener to container
    container.addEventListener('dragend', () => {
      const newOrder = Array.from(container.querySelectorAll('.betterx-theme-item'))
        .map(item => item.dataset.themeId);
      this.themeManager.reorderThemes(newOrder);
    });
  }

  showThemeEditor(theme = null) {
    const editor = createThemeEditor(theme, this);
    
    const overlay = this.createUIElement('div', {
      className: 'betterx-editor-overlay'
    });
    overlay.appendChild(editor.element);
    document.body.appendChild(overlay);
    
    return editor.initialize();
  }

  formatCSS(css) {
    return formatCSS(css);
  }

  getAuthorNames(authors) {
    if (!authors || authors.length === 0) return 'Unknown';

    return authors.map(author => {
      let authorName, handle;
      if (typeof author === 'string') {
        authorName = this.pluginManager.Devs[author]?.name || author;
        handle = this.pluginManager.Devs[author]?.handle;
      } else {
        authorName = author.name || 'Unknown';
        handle = author.handle;
      }

      return handle ? 
        `<a href="https://twitter.com/${handle}" target="_blank" class="betterx-author-link">${authorName}</a>` : 
        authorName;
    }).join(', ');
  }

  createOptionElement(plugin, option) {
    return createOptionElement(plugin, option, this.pluginManager);
  }

  populatePluginList(container) {
    populatePluginList(container, this);
    
    // Ensure search input event listener is attached
    const searchInput = document.getElementById('plugin-search');
    if (searchInput && !searchInput.dataset.listenerAttached) {
      searchInput.addEventListener('input', () => {
        this.populatePluginList(container);
      });
      searchInput.dataset.listenerAttached = 'true';
    }
  }

  addBetterXTab() {
    addBetterXTab(this);
  }

  /**
   * Show a notification
   * @param {Object} options Notification options
   * @returns {string} Notification ID
   */
  notify(options = {}) {
    return this.notifications.createNotification(options);
  }

  /**
   * Show an info notification
   * @param {string} message The message to show
   * @param {Object} options Additional options
   * @returns {string} Notification ID
   */
  notifyInfo(message, options = {}) {
    return this.notifications.info(message, options);
  }

  /**
   * Show a success notification
   * @param {string} message The message to show
   * @param {Object} options Additional options
   * @returns {string} Notification ID
   */
  notifySuccess(message, options = {}) {
    return this.notifications.success(message, options);
  }

  /**
   * Show a warning notification
   * @param {string} message The message to show
   * @param {Object} options Additional options
   * @returns {string} Notification ID
   */
  notifyWarning(message, options = {}) {
    return this.notifications.warning(message, options);
  }

  /**
   * Show an error notification
   * @param {string} message The message to show
   * @param {Object} options Additional options
   * @returns {string} Notification ID
   */
  notifyError(message, options = {}) {
    return this.notifications.error(message, options);
  }

  /**
   * Update an existing notification
   * @param {string} id Notification ID
   * @param {Object} options New options
   * @returns {boolean} Success
   */
  updateNotification(id, options = {}) {
    return this.notifications.updateNotification(id, options);
  }

  /**
   * Remove a notification
   * @param {string} id Notification ID
   * @returns {boolean} Success
   */
  removeNotification(id) {
    return this.notifications.removeNotification(id);
  }

  /**
   * Initialize the developer tab UI
   * @param {HTMLElement} modal - The settings modal
   */
  initializeDeveloperUI(modal) {
    const developerContainer = modal.querySelector('#betterx-developer-tab');
    populateDeveloperSettings(developerContainer, this);
    this.developerTabVisited = true;
  }

  async injectBetterXUI() {
    // Add styles first
    injectUIStyles();
    
    // Get initial accent color
    const accentColor = await getAccentColor();
    
    // Initialize theme detection and apply the appropriate theme
    this.themeObserver = watchThemeChanges((themeMode, accentColor) => {
      applyThemeColors(themeMode, accentColor);
      
      // Call all registered theme change callbacks
      this.themeChangeCallbacks.forEach(callback => {
        try {
          callback(themeMode, accentColor);
        } catch (e) {
          console.error('Error in theme change callback:', e);
        }
      });
    });
    
    // Register footer theme updater
    registerFooterThemeUpdater(this);
    
    // Initialize the footer link
    injectFooterLink();
    updateFooterLinkColors(); // Apply colors immediately
    setInterval(() => {
      injectFooterLink();
      updateFooterLinkColors(); // Check colors periodically as well
    }, 1000);
    
    // Create the settings modal
    this.settingsModal = this.createSettingsModal();
    document.body.appendChild(this.settingsModal);
    
    // Add escape key event listener to close modal
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.settingsModal.style.display === 'block') {
        this.handleModalClose(this.settingsModal);
      }
    });

    // Initialize the footer link
    injectFooterLink();
    setInterval(injectFooterLink, 1000); // Check periodically in case footer is dynamically loaded

    // Attempt to add the BetterX tab immediately and every second
    this.addBetterXTab();
    setInterval(() => this.addBetterXTab(), 1000);

    // Set up MutationObserver to watch for changes in the DOM
    this.observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          this.addBetterXTab();
        }
      });
    });

    // Start observing the body for changes
    this.observer.observe(document.body, { childList: true, subtree: true });

    // Make BetterX instance accessible globally for debugging and plugins
    if (window.betterX) {
      // If betterX already exists in the global scope, extend it
      window.betterX.uiManager = this;
    } else {
      // Create the global betterX object
      window.betterX = { 
        uiManager: this,
        version: "1.0.0",
        buildDate: new Date().toLocaleDateString(),
        debugging: false,
        verbose: true,
        pluginLogs: true
      };
    }
    
    // Welcome notification
  }
  
  // Clean up resources when BetterX is disabled
  cleanup() {
    if (this.themeObserver) {
      this.themeObserver(); // Call the cleanup function
    }
    
    if (this.observer) {
      this.observer.disconnect();
    }
    
    // ...existing code...
  }
}