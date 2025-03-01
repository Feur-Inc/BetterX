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
        <div class="betterx-modal-body">
          <div class="betterx-tabs">
            <button class="betterx-tab active" data-tab="plugin">Plugins</button>
            <button class="betterx-tab" data-tab="theme">Themes</button>
          </div>
          <div id="betterx-plugin-list" class="betterx-tab-content active">
            <input type="text" id="betterx-plugin-search" placeholder="Search plugins..." class="betterx-input search-bar">
            <div id="betterx-plugin-list-container"></div>
          </div>
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
        // Remove active class from all tabs
        tabs.forEach(t => t.classList.remove('active'));
        
        // Add active class to clicked tab
        tab.classList.add('active');
        
        // Handle content switching with animation
        contents.forEach(c => {
          if (c.classList.contains('active')) {
            c.style.opacity = '0';
            setTimeout(() => {
              c.classList.remove('active');
              c.style.display = 'none';
              
              // Show new content
              const contentId = `betterx-${tab.dataset.tab}-list`;
              const newContent = modal.querySelector(`#${contentId}`);
              if (newContent) {
                newContent.classList.add('active');
                newContent.style.display = 'block';
                // Force reflow
                newContent.offsetHeight;
                newContent.style.opacity = '1';
              }
            }, 200);
          }
        });
      });
    });
  };
  // Set up tabs after a short delay to ensure DOM is ready
  setTimeout(setupTabs, 0);

  // Add event listener for the theme tab
  const themeTabButton = modal.querySelector('button[data-tab="theme"]');
  themeTabButton.addEventListener('click', async () => {
    uiManager.themeTabVisited = true;
    await uiManager.themeManager.initializeThemes();
    const themesContainer = modal.querySelector('.betterx-themes-container');
    // Sauvegarder l'état initial des thèmes actifs
    uiManager.initialActiveThemes = new Set(uiManager.themeManager.activeThemes);
    uiManager.refreshThemesList(themesContainer);
  });

  // Initialize theme UI
  uiManager.initializeThemeUI(modal);

  // Capture initial plugin states for detecting changes
  uiManager.captureInitialPluginStates();

  // Add event listeners for the modal
  const closeBtn = modal.querySelector('.betterx-close');
  const handleClose = () => uiManager.handleModalClose(modal);
  closeBtn.onclick = handleClose;
  window.onclick = (event) => {
    if (event.target == modal) {
      handleClose();
    }
  };

  // Attach search event listener to filter plugins
  const searchInput = modal.querySelector('#betterx-plugin-search');
  searchInput.addEventListener('input', () => {
    uiManager.populatePluginList(modal.querySelector('#betterx-plugin-list-container'));
  });

  // Populate plugin list using the new container
  uiManager.populatePluginList(modal.querySelector('#betterx-plugin-list-container'));

  return modal;
}
