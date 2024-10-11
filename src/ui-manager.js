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
              <div id="betterx-plugin-list"></div>
            </div>
          </div>
        `
      });
  
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

    getAuthorNames(authors) {
        if (!authors || authors.length === 0) return 'Unknown';
        
        return authors.map(author => {
          if (typeof author === 'string') {
            return this.pluginManager.Devs[author]?.name || author;
          } else {
            return author.name || 'Unknown';
          }
        }).join(', ');
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
          }
          .betterx-modal-content {
            background-color: #15202b;
            margin: 5vh auto;
            padding: 20px;
            border: 1px solid #38444d;
            border-radius: 16px;
            width: 90%;
            max-width: 600px;
            max-height: 90vh;
            overflow-y: auto;
            color: #ffffff;
          }
          .betterx-modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            position: sticky;
            top: 0;
            background-color: #15202b;
            padding: 10px 0;
            z-index: 1;
          }
          .betterx-modal-header h2 {
            margin: 0;
            font-size: 20px;
            font-weight: bold;
          }
          .betterx-close {
            color: #8899a6;
            font-size: 28px;
            font-weight: bold;
            cursor: pointer;
          }
          .betterx-close:hover {
            color: #ffffff;
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
  
          @media screen and (max-width: 480px) {
            .betterx-modal-content {
              width: 95%;
              margin: 2vh auto;
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
              margin: 2vh auto;
              max-height: 96vh;
            }
          }
        `
      });
      document.head.appendChild(styles);
    }
  }