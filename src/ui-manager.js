import { OptionType } from "@utils/types";
import { EditorView, basicSetup } from "codemirror";
import { css } from "@codemirror/lang-css";
import { oneDark } from '@codemirror/theme-one-dark';
import { ThemeManager } from './theme-manager.js';
import { createSettingsModal } from './ui/settings-modal.js';
import { createBetterXTab, addBetterXTab } from './ui/tab-creator.js';
import { createThemeEditor, formatCSS } from './ui/theme-editor.js';
import { populatePluginList, createOptionElement } from './ui/plugin-list.js';
import { injectFooterLink } from './ui/footer-mod.js';
import { injectUIStyles } from './ui/styles.js';

export class UIManager {
  constructor(pluginManager) {
    this.pluginManager = pluginManager;
    this.observer = null;
    // Instancier ThemeManager pour gérer les thèmes
    this.themeManager = new ThemeManager();
    this.initialActiveThemes = new Set();
    this.themeTabVisited = false;
    this.initialPluginStates = new Map();
    this.createBetterXTab = createBetterXTab;
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
        if (plugin.needsRestart) {
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
    const dialog = this.createUIElement('div', {
      className: 'betterx-restart-dialog',
      innerHTML: `
        <div class="betterx-restart-content">
          <h3>These plugins require a restart:</h3>
          <ul class="betterx-changed-plugins">
            ${changedPlugins.map(name => `<li>${name}</li>`).join('')}
          </ul>
          <div class="betterx-restart-buttons">
            <button class="betterx-button secondary close">Close</button>
            <button class="betterx-button primary restart">Restart Now</button>
          </div>
        </div>
      `
    });

    document.body.appendChild(dialog);

    dialog.querySelector('.close').addEventListener('click', () => {
      dialog.remove();
    });

    dialog.querySelector('.restart').addEventListener('click', () => {
      window.location.reload();
    });
  }

  handleModalClose(modal) {
    const changedPlugins = this.getChangedPlugins();
    modal.style.display = 'none';
    this.themeTabVisited = false;

    if (changedPlugins.length > 0) {
      this.createRestartDialog(changedPlugins);
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
  }

  addBetterXTab() {
    addBetterXTab(this);
  }

  injectBetterXUI() {
    // Create the settings modal
    this.settingsModal = this.createSettingsModal();
    document.body.appendChild(this.settingsModal);

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

    // Add styles
    injectUIStyles();
  }
}