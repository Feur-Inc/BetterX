export function createSettingsModal(uiManager) {
  const modal = uiManager.createUIElement('div', {
    id: 'betterx-settings-modal',
    className: 'betterx-modal',
    innerHTML: `
      <div class="betterx-modal-content">
        <div class="betterx-modal-header">
          <h2>BetterX Settings</h2>
          <span class="betterx-close">&times;</span>
        </div>
        <div class="betterx-tabs">
          <button class="betterx-tab active" data-tab="plugins">Plugins</button>
          <button class="betterx-tab" data-tab="themes">Themes</button>
          <button class="betterx-tab" data-tab="developer">Developer</button>
        </div>
        <div class="betterx-modal-body">
          <div id="betterx-plugins-tab" class="betterx-tab-content active">
            <input type="text" class="betterx-input search-bar" placeholder="Search plugins..." id="plugin-search">
            <div id="betterx-plugin-list"></div>
          </div>
          <div id="betterx-themes-tab" class="betterx-tab-content">
            <div class="betterx-theme-controls">
              <button class="betterx-button" id="new-theme">Create New Theme</button>
            </div>
            <div class="betterx-themes-container"></div>
          </div>
          <div id="betterx-developer-tab" class="betterx-tab-content">
            <!-- Developer tab content will be populated by developer-settings.js -->
          </div>
        </div>
      </div>
    `
  });

  // Add event listeners for the modal
  const closeBtn = modal.querySelector('.betterx-close');
  closeBtn.onclick = () => uiManager.handleModalClose(modal);
  
  window.onclick = (event) => {
    if (event.target == modal) {
      uiManager.handleModalClose(modal);
    }
  };

  // Initialize the tabs
  const tabs = modal.querySelectorAll('.betterx-tab');
  const tabContents = modal.querySelectorAll('.betterx-tab-content');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.getAttribute('data-tab');
      
      tabs.forEach(t => t.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      
      tab.classList.add('active');
      
      const activeContentId = `betterx-${tabName}-tab`;
      const activeContent = modal.querySelector(`#${activeContentId}`);
      if (activeContent) {
        activeContent.classList.add('active');
      }
      
      if (tabName === 'plugins') {
        uiManager.captureInitialPluginStates();
        uiManager.populatePluginList(modal.querySelector('#betterx-plugin-list'));
      } else if (tabName === 'themes') {
        if (!uiManager.themeTabVisited) {
          uiManager.initializeThemeUI(modal);
          uiManager.themeTabVisited = true;
        }
      } else if (tabName === 'developer') {
        // Initialize developer tab if it hasn't been already
        if (!uiManager.developerTabVisited) {
          uiManager.initializeDeveloperUI(modal);
          uiManager.developerTabVisited = true;
        }
      }
    });
  });

  // Attach search event listener to filter plugins
  const searchInput = modal.querySelector('#plugin-search');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      uiManager.populatePluginList(modal.querySelector('#betterx-plugin-list'));
    });
  }

  // Populate plugin list initially
  uiManager.populatePluginList(modal.querySelector('#betterx-plugin-list'));

  return modal;
}
