import { OptionType } from "@utils/types";
import { EditorView, basicSetup } from "codemirror";
import { css } from "@codemirror/lang-css";
import { oneDark } from '@codemirror/theme-one-dark';

export class UIManager {
  constructor(pluginManager) {
    this.pluginManager = pluginManager;
    this.observer = null;
  }

  createUIElement(elementType, properties) {
    const element = document.createElement(elementType);
    Object.assign(element, properties);
    return element;
  }

  createSettingsModal() {
    const modal = this.createUIElement('div', {
      id: 'betterx-settings-modal',
      className: 'betterx-modal',
      innerHTML: `
        <div class="betterx-modal-content">
          <div class="betterx-modal-header">
            <h2>BetterX Settings</h2>
            <span class="betterx-close">&times;</span>
          </div>
          <div class="betterx-modal-body">
                        <div class="betterx-tabs">
              <button class="betterx-tab active" data-tab="plugin">Plugins</button>
              <button class="betterx-tab" data-tab="theme">Themes</button>
            </div>
            <div id="betterx-plugin-list" class="betterx-tab-content active"></div>
            <div id="betterx-theme-list" class="betterx-tab-content">
              <div class="betterx-theme-controls">
                <button class="betterx-button" id="new-theme">New Theme</button>
              </div>
              <div class="betterx-themes-container"></div>
            </div>
          </div>
        </div>
      `
    });

    // Add tab switching logic after the modal is created
    const setupTabs = () => {
      const tabs = modal.querySelectorAll('.betterx-tab');
      const contents = modal.querySelectorAll('.betterx-tab-content');

      tabs.forEach(tab => {
        tab.addEventListener('click', () => {
          // Remove active class from all tabs and contents
          tabs.forEach(t => t.classList.remove('active'));
          contents.forEach(c => c.classList.remove('active'));

          // Add active class to clicked tab and corresponding content
          tab.classList.add('active');
          const contentId = `betterx-${tab.dataset.tab}-list`;
          const content = modal.querySelector(`#${contentId}`);
          if (content) {
            content.classList.add('active');
          }
        });
      });
    };
    // Set up tabs after a short delay to ensure DOM is ready
    setTimeout(setupTabs, 0);
    // Initialize theme UI
    this.initializeThemeUI(modal);


    // Add event listeners for the modal
    const closeBtn = modal.querySelector('.betterx-close');
    closeBtn.onclick = () => {
      modal.style.display = 'none';
    };

    window.onclick = (event) => {
      if (event.target == modal) {
        modal.style.display = 'none';
      }
    };

    this.populatePluginList(modal.querySelector('#betterx-plugin-list'));

    return modal;
  }

  initializeThemeUI(modal) {
    const themesContainer = modal.querySelector('.betterx-themes-container');
    const newThemeButton = modal.querySelector('#new-theme');
    newThemeButton.addEventListener('click', () => {
      this.showThemeEditor();
    });
    this.refreshThemesList(themesContainer);
  }
  refreshThemesList(container) {
    container.innerHTML = '';
    this.themeManager.themes.forEach(theme => {
      const themeElement = this.createUIElement('div', {
        className: 'betterx-theme-item',
        innerHTML: `
          <div class="betterx-theme-header">
            <h3>${theme.name}</h3>
            <div class="betterx-theme-controls">
              <label class="betterx-switch">
                <input type="checkbox" ${theme === this.themeManager.activeTheme ? 'checked' : ''}>
                <span class="betterx-slider"></span>
              </label>
              <button class="betterx-button edit">Edit</button>
              <button class="betterx-button delete">Delete</button>
            </div>
          </div>
        `
      });
      const toggle = themeElement.querySelector('input[type="checkbox"]');
      toggle.addEventListener('change', () => {
        if (toggle.checked) {
          this.themeManager.applyTheme(theme);
        } else {
          this.themeManager.disableTheme();
        }
      });
      themeElement.querySelector('.edit').addEventListener('click', () => {
        this.showThemeEditor(theme);
      });
      themeElement.querySelector('.delete').addEventListener('click', () => {
        if (confirm('Are you sure you want to delete this theme?')) {
          this.themeManager.deleteTheme(theme.id);
          this.refreshThemesList(container);
        }
      });
      container.appendChild(themeElement);
    });
  }
  showThemeEditor(theme = null) {
    const editor = this.createUIElement('div', {
      className: 'betterx-theme-editor',
      innerHTML: `
        <div class="betterx-editor-header">
          <div class="betterx-editor-title">
            <h3>${theme ? 'Edit Theme' : 'Create New Theme'}</h3>
            <input type="text" class="betterx-input" placeholder="Theme name" value="${theme?.name || ''}" maxlength="50">
          </div>
          <div class="betterx-editor-controls">
            <button class="betterx-button secondary cancel">Cancel</button>
            <button class="betterx-button primary save">Save Theme</button>
          </div>
        </div>
        <div class="betterx-editor-main">
          <div class="betterx-editor-toolbar">
            <span class="betterx-editor-info">CSS Editor</span>
            <div class="betterx-editor-actions">
              <button class="betterx-button mini format">Format</button>
              <button class="betterx-button mini clear">Clear</button>
            </div>
          </div>
          <div class="betterx-codemirror-wrapper"></div>
        </div>
      `
    });

    const overlay = this.createUIElement('div', {
      className: 'betterx-editor-overlay'
    });
    overlay.appendChild(editor);
    document.body.appendChild(overlay);

    const nameInput = editor.querySelector('input');
    const editorContainer = editor.querySelector('.betterx-codemirror-wrapper');
    
    // Initialize CodeMirror
    const view = new EditorView({
      doc: theme?.css || '',
      extensions: [
        basicSetup,
        css(),
        oneDark,
        EditorView.theme({
          "&": {
            height: "100%",
            fontSize: "14px"
          },
          ".cm-content": {
            fontFamily: "monospace"
          },
          ".cm-line": {
            padding: "0 3px",
            lineHeight: "1.6"
          }
        })
      ],
      parent: editorContainer
    });

    editor.querySelector('.save').addEventListener('click', () => {
      const css = view.state.doc.toString();
      if (theme) {
        this.themeManager.updateTheme(theme.id, nameInput.value, css);
      } else {
        this.themeManager.createTheme(nameInput.value, css);
      }
      this.refreshThemesList(this.settingsModal.querySelector('.betterx-themes-container'));
      view.destroy();
      overlay.remove();
    });

    editor.querySelector('.cancel').addEventListener('click', () => {
      view.destroy();
      overlay.remove();
    });

    // Add format button functionality
    editor.querySelector('.format').addEventListener('click', () => {
      try {
        const css = view.state.doc.toString();
        const formatted = this.formatCSS(css);
        view.dispatch({
          changes: {from: 0, to: view.state.doc.length, insert: formatted}
        });
      } catch (e) {
        console.error('Failed to format CSS:', e);
      }
    });

    // Add clear button functionality
    editor.querySelector('.clear').addEventListener('click', () => {
      if (confirm('Are you sure you want to clear all CSS?')) {
        view.dispatch({
          changes: {from: 0, to: view.state.doc.length, insert: ''}
        });
      }
    });
  }

  formatCSS(css) {
    // Simple CSS formatter
    return css
      .replace(/\s*{\s*/g, ' {\n  ')
      .replace(/\s*}\s*/g, '\n}\n')
      .replace(/;\s*/g, ';\n  ')
      .replace(/\/\*\s*/g, '\n/* ')
      .replace(/\s*\*\//g, ' */\n')
      .replace(/\n\s*\n/g, '\n')
      .trim();
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
    if (!option || typeof option !== 'object') {
      console.warn(`Invalid option for plugin ${plugin.name}:`, option);
      return null;
    }

    let optionElement;
    const optionType = option.type || OptionType.STRING;
    const currentValue = plugin.settings.store[option.id];

    const updateOptionValue = (value) => {
      this.pluginManager.updatePluginOption(plugin.name, option.id, value);
    };

    switch (optionType) {
      case OptionType.BOOLEAN:
        optionElement = this.createUIElement('label', {
          className: 'betterx-switch',
          innerHTML: `
            <input type="checkbox" ${currentValue ? 'checked' : ''}>
            <span class="betterx-slider"></span>
          `
        });
        const checkbox = optionElement.querySelector('input');
        checkbox.addEventListener('change', () => {
          updateOptionValue(checkbox.checked);
        });
        break;

      case OptionType.SELECT:
        optionElement = this.createUIElement('select', {
          className: 'betterx-select'
        });
        if (Array.isArray(option.options)) {
          option.options.forEach(selectOption => {
            const optionEl = document.createElement('option');
            optionEl.value = selectOption.value;
            optionEl.textContent = selectOption.label;
            optionEl.selected = selectOption.value === currentValue;
            optionElement.appendChild(optionEl);
          });
        } else {
          console.warn(`SELECT option for ${option.id} has no valid options array.`);
        }
        optionElement.addEventListener('change', (e) => {
          updateOptionValue(e.target.value);
        });
        break;

      case OptionType.NUMBER:
        optionElement = this.createUIElement('input', {
          type: 'number',
          className: 'betterx-input betterx-number-input',
          value: currentValue,
          min: option.min,
          max: option.max,
          step: option.step || 1
        });
        optionElement.addEventListener('change', (e) => {
          const value = parseFloat(e.target.value);
          if (!isNaN(value)) {
            updateOptionValue(value);
          }
        });
        break;

      case OptionType.STRING:
      default:
        optionElement = this.createUIElement('input', {
          type: 'text',
          className: 'betterx-input',
          value: currentValue
        });
        optionElement.addEventListener('change', (e) => {
          updateOptionValue(e.target.value);
        });
        break;
    }

    const wrapper = this.createUIElement('div', {
      className: 'betterx-option-wrapper',
      innerHTML: `
        <label class="betterx-option-label">${option.name || option.id || 'Unnamed Option'}</label>
        <p class="betterx-option-description">${option.description || ''}</p>
      `
    });
    wrapper.appendChild(optionElement);

    return wrapper;
  }


  populatePluginList(container) {
    this.pluginManager.plugins.forEach(plugin => {
      const authorNames = this.getAuthorNames(plugin.authors);

      const pluginElement = this.createUIElement('div', {
        className: 'betterx-plugin-item',
        innerHTML: `
          <div class="betterx-plugin-header">
            <div class="betterx-plugin-info">
              <h3>${plugin.name}</h3>
              <p>${plugin.description || 'No description available.'}</p>
            </div>
            <div class="betterx-plugin-controls">
              <label class="betterx-switch">
                <input type="checkbox" ${plugin.enabled ? 'checked' : ''}>
                <span class="betterx-slider"></span>
              </label>
              <button class="betterx-details-toggle">
                <svg viewBox="0 0 24 24" class="betterx-arrow-icon">
                  <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"></path>
                </svg>
              </button>
            </div>
          </div>
          <div class="betterx-plugin-details" style="display: none;">
            <p>Author${plugin.authors.length > 1 ? 's' : ''}: ${authorNames}</p>
            <div class="betterx-plugin-options"></div>
          </div>
        `
      });

      const checkbox = pluginElement.querySelector('input[type="checkbox"]');
      checkbox.addEventListener('change', () => {
        this.pluginManager.togglePlugin(plugin.name);
      });

      const detailsToggle = pluginElement.querySelector('.betterx-details-toggle');
      const detailsSection = pluginElement.querySelector('.betterx-plugin-details');
      detailsToggle.addEventListener('click', () => {
        detailsSection.style.display = detailsSection.style.display === 'none' ? 'block' : 'none';
        detailsToggle.classList.toggle('rotated');
      });

      const optionsContainer = pluginElement.querySelector('.betterx-plugin-options');
      if (plugin.options && typeof plugin.options === 'object') {
        Object.entries(plugin.options).forEach(([optionId, option]) => {
          const optionElement = this.createOptionElement(plugin, { id: optionId, ...option });
          if (optionElement) {
            optionsContainer.appendChild(optionElement);
          }
        });
      }

      container.appendChild(pluginElement);
    });
  }

  createBetterXTab() {
    const newDiv = document.createElement('div');
    newDiv.setAttribute('class', 'css-175oi2r');
    newDiv.setAttribute('data-testid', 'BetterX');

    const newLink = document.createElement('a');
    newLink.setAttribute('href', '#');
    newLink.setAttribute('role', 'tab');
    newLink.setAttribute('aria-selected', 'false');
    newLink.setAttribute('class', 'css-175oi2r r-1wtj0ep r-16x9es5 r-1mmae3n r-o7ynqc r-6416eg r-1ny4l3l r-1loqt21');
    newLink.style.paddingRight = '16px';
    newLink.style.paddingLeft = '16px';

    const linkContainer = document.createElement('div');
    linkContainer.setAttribute('class', 'css-175oi2r r-1awozwy r-18u37iz r-16y2uox');

    const textContainer = document.createElement('div');
    textContainer.setAttribute('class', 'css-175oi2r r-16y2uox r-1wbh5a2');

    const textDiv = document.createElement('div');
    textDiv.setAttribute('dir', 'ltr');
    textDiv.setAttribute('class', 'css-146c3p1 r-bcqeeo r-1ttztb7 r-qvutc0 r-37j5jr r-a023e6 r-rjixqe r-16dba41');
    textDiv.style.textOverflow = 'unset';
    textDiv.style.color = 'rgb(231, 233, 234)';

    const textSpan = document.createElement('span');
    textSpan.setAttribute('class', 'css-1jxf684 r-bcqeeo r-1ttztb7 r-qvutc0 r-poiln3');
    textSpan.style.textOverflow = 'unset';
    textSpan.textContent = 'BetterX';

    const svgIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svgIcon.setAttribute('viewBox', '0 0 24 24');
    svgIcon.setAttribute('aria-hidden', 'true');
    svgIcon.setAttribute('class', 'r-4qtqp9 r-yyyyoo r-1xvli5t r-dnmrzs r-bnwqim r-lrvibr r-m6rgpd r-1bwzh9t r-1q142lx r-2dysd3');

    const svgPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    svgPath.setAttribute('d', 'M14.586 12L7.543 4.96l1.414-1.42L17.414 12l-8.457 8.46-1.414-1.42L14.586 12z');

    svgIcon.appendChild(svgPath);
    textDiv.appendChild(textSpan);
    textContainer.appendChild(textDiv);
    linkContainer.appendChild(textContainer);
    linkContainer.appendChild(svgIcon);
    newLink.appendChild(linkContainer);
    newDiv.appendChild(newLink);

    return newDiv;
  }

  addBetterXTab() {
    const activeRouteContainer = document.querySelector('div[class="css-175oi2r"][role="tablist"]');

    if (activeRouteContainer && !document.querySelector('[data-testid="BetterX"]')) {
      const betterXTab = this.createBetterXTab();
      activeRouteContainer.appendChild(betterXTab);

      // Add click event to the BetterX tab to open the modal
      betterXTab.querySelector('a').addEventListener('click', (e) => {
        e.preventDefault();
        this.settingsModal.style.display = 'block';
      });
    }
  }

  injectBetterXUI() {
    // Create the settings modal
    this.settingsModal = this.createSettingsModal();
    document.body.appendChild(this.settingsModal);

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
    const styles = this.createUIElement('style', {
      textContent: `
        .betterx-modal {
          display: none;
          position: fixed;
          z-index: 10000;
          left: 0;
          top: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(91, 112, 131, 0.4);
          font-family: "Segoe UI", Arial, sans-serif;
          overflow-y: auto;
          scrollbar-width: none; /* Firefox */
          -ms-overflow-style: none; /* IE and Edge */
        }
        .betterx-modal::-webkit-scrollbar {
          display: none; /* Chrome, Safari and Opera */
        }
        .betterx-modal-content {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background-color: #15202b;
          border: 1px solid #38444d;
          border-radius: 16px;
          width: 90%;
          max-width: 600px;
          max-height: 90vh;
          overflow-y: auto;
          color: #ffffff;
          scrollbar-width: none;
          -ms-overflow-style: none;
          z-index: 10001;
        }
        .betterx-modal-content::-webkit-scrollbar {
          display: none;
        }
        .betterx-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          position: sticky;
          top: 0;
          background-color: #15202b;
          padding: 20px;
          border-bottom: 1px solid #38444d;
          z-index: 2;
        }
        .betterx-modal-body {
          padding: 20px;
        }
        .betterx-plugin-item {
          border-bottom: 1px solid #38444d;
          padding: 15px 0;
        }
        .betterx-plugin-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .betterx-plugin-info {
          flex-grow: 1;
        }
        .betterx-plugin-info h3 {
          margin: 0 0 5px 0;
          font-size: 16px;
        }
        .betterx-plugin-info p {
          margin: 0;
          font-size: 14px;
          color: #8899a6;
        }
        .betterx-plugin-controls {
          display: flex;
          align-items: center;
        }
        .betterx-switch {
          position: relative;
          display: inline-block;
          width: 48px;
          height: 24px;
          flex-shrink: 0;
          margin-right: 10px;
        }
        .betterx-switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }
        .betterx-slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #38444d;
          transition: .4s;
          border-radius: 24px;
        }
        .betterx-slider:before {
          position: absolute;
          content: "";
          height: 18px;
          width: 18px;
          left: 3px;
          bottom: 3px;
          background-color: #15202b;
          transition: .4s;
          border-radius: 50%;
        }
        input:checked + .betterx-slider {
          background-color: #1da1f2;
        }
        input:checked + .betterx-slider:before {
          transform: translateX(24px);
        }
        .betterx-details-toggle {
          background: none;
          border: none;
          cursor: pointer;
          padding: 5px;
        }
          .betterx-arrow-icon {
          width: 24px;
          height: 24px;
          fill: #8899a6;
          transition: transform 0.3s ease;
        }
        .betterx-details-toggle.rotated .betterx-arrow-icon {
          transform: rotate(180deg);
        }
        .betterx-plugin-details {
          margin-top: 10px;
          padding: 10px;
          background-color: #192734;
          border-radius: 8px;
        }
        .betterx-plugin-details p {
          margin: 5px 0;
          font-size: 14px;
        }
        .betterx-option-wrapper {
          margin-top: 10px;
        }
        .betterx-option-label {
          display: block;
          margin-bottom: 5px;
          font-weight: bold;
        }
        .betterx-option-description {
          font-size: 12px;
          color: #8899a6;
          margin-bottom: 5px;
        }
        .betterx-select,
        .betterx-input {
          width: 100%;
          padding: 8px;
          border-radius: 4px;
          border: 1px solid #38444d;
          background-color: #192734;
          color: #ffffff;
          font-size: 14px;
        }
        .betterx-select:focus,
        .betterx-input:focus {
          outline: none;
          border-color: #1da1f2;
        }

        @media screen and (max-width: 480px) {
          .betterx-modal-content {
            width: 95%;
            padding: 15px;
          }
          .betterx-modal-header h2 {
            font-size: 18px;
          }
          .betterx-plugin-info h3 {
            font-size: 14px;
          }
          .betterx-plugin-info p {
            font-size: 12px;
          }
        }

        @media screen and (max-height: 600px) {
          .betterx-modal-content {
            max-height: 96vh;
          }
        }
                  .betterx-tabs {
          display: flex;
          border-bottom: 1px solid #38444d;
          margin: -20px -20px 20px -20px;
          padding: 0 20px;
        }
        
        .betterx-tab {
          background: none;
          border: none;
          color: #8899a6;
          padding: 10px 20px;
          cursor: pointer;
          border-bottom: 2px solid transparent;
        }
        
        .betterx-tab.active {
          color: #1da1f2;
          border-bottom-color: #1da1f2;
        }
        
        .betterx-tab-content {
          display: none;
        }
        
        .betterx-tab-content.active {
          display: block;
        }
        
        .betterx-theme-item {
          background: #192734;
          border-radius: 8px;
          padding: 15px;
          margin-bottom: 10px;
        }
        
        .betterx-theme-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .betterx-theme-controls {
          display: flex;
          gap: 10px;
          align-items: center;
        }
        
        .betterx-button {
          background: #1da1f2;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
        }
        
        .betterx-button:hover {
          background: #1a91da;
        }
        
        .betterx-editor-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.85);
          z-index: 10001;
          display: flex;
          align-items: center;
          justify-content: center;
          backdrop-filter: blur(5px);
        }
        
        .betterx-theme-editor {
          background: #15202b;
          padding: 20px;
          border-radius: 12px;
          width: 90%;
          max-width: 900px;
          height: 85vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 8px 24px rgba(0,0,0,0.4);
          border: 1px solid #38444d;
        }
        
        .betterx-editor-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 20px;
          gap: 20px;
        }

        .betterx-editor-title {
          flex: 1;
        }

        .betterx-editor-title h3 {
          margin: 0 0 10px 0;
          font-size: 18px;
          color: #fff;
        }

        .betterx-editor-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          background: #192734;
          border-radius: 8px;
          overflow: hidden;
          border: 1px solid #38444d;
        }

        .betterx-editor-toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          background: #22303c;
          border-bottom: 1px solid #38444d;
        }

        .betterx-editor-info {
          font-size: 12px;
          color: #8899a6;
          font-weight: 500;
        }

        .betterx-editor-actions {
          display: flex;
          gap: 8px;
        }

        .betterx-button.primary {
          background: #1da1f2;
        }

        .betterx-button.secondary {
          background: transparent;
          border: 1px solid #38444d;
        }

        .betterx-button.mini {
          padding: 4px 8px;
          font-size: 12px;
          background: transparent;
          border: 1px solid #38444d;
        }

        .betterx-button.mini:hover {
          background: rgba(29, 161, 242, 0.1);
          border-color: #1da1f2;
        }
        
        .betterx-codemirror-wrapper {
          flex: 1;
          overflow: hidden;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .betterx-codemirror-wrapper::-webkit-scrollbar {
          display: none;
        }
        .betterx-codemirror-wrapper .cm-scroller {
          padding: 8px 0;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .betterx-codemirror-wrapper .cm-scroller::-webkit-scrollbar {
          display: none;
        }

        .betterx-input {
          width: 100%;
          max-width: 300px;
        }

        .betterx-editor-controls {
          display: flex;
          gap: 12px;
          align-items: center;
        }
        .betterx-author-link {
          color: #1da1f2;
          text-decoration: none;
        }
        .betterx-author-link:hover {
          text-decoration: underline;
        }
      `
    });
    document.head.appendChild(styles);
  }
}