import { Name } from "../utils/constants";

// Interface for the UI Manager
interface UIManager {
  createUIElement: (tag: string, options: ElementOptions) => HTMLElement;
  captureInitialPluginStates: () => void;
  handleModalClose: (modal: HTMLElement) => void;
  populatePluginList: (container: HTMLElement) => void;
  initializeThemeUI: (modal: HTMLElement) => void;
  initializeDeveloperUI: (modal: HTMLElement) => void;
  themeChangeCallbacks?: Array<() => void>;
  themeTabVisited?: boolean;
  developerTabVisited?: boolean;
}

// Interface for element creation options
interface ElementOptions {
  id?: string;
  className?: string;
  innerHTML?: string;
  [key: string]: any;
}

export function createSettingsModal(uiManager: UIManager): HTMLElement {
  const modal = uiManager.createUIElement('div', {
    id: 'betterx-settings-modal',
    className: 'betterx-modal',
    innerHTML: `
      <div class="betterx-modal-content">
        <div class="betterx-modal-header">
          <h2>${Name} Settings</h2>
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

  // Capture initial plugin states when modal is created, not just on tab click
  uiManager.captureInitialPluginStates();

  // Add event listeners for the modal
  const closeBtn = modal.querySelector('.betterx-close') as HTMLElement;
  closeBtn.onclick = () => uiManager.handleModalClose(modal);
  
  window.onclick = (event: MouseEvent) => {
    if (event.target == modal) {
      uiManager.handleModalClose(modal);
    }
  };

  // Initialize the tabs with dynamic color handling
  const tabs = modal.querySelectorAll('.betterx-tab') as NodeListOf<HTMLElement>;
  const tabContents = modal.querySelectorAll('.betterx-tab-content') as NodeListOf<HTMLElement>;
  
  // Function to update tab colors based on accent color
  const updateTabColors = (): void => {
    const activeColor = getComputedStyle(document.documentElement).getPropertyValue('--betterx-accentColor').trim();
    
    tabs.forEach(tab => {
      if (tab.classList.contains('active')) {
        tab.style.color = activeColor;
        tab.style.borderBottomColor = activeColor;
      } else {
        tab.style.color = '';
        tab.style.borderBottomColor = 'transparent';
      }
    });
  };
  
  // Add to theme change callbacks to update when accent changes
  if (uiManager.themeChangeCallbacks) {
    uiManager.themeChangeCallbacks.push(() => {
      setTimeout(updateTabColors, 0);
    });
  }
  
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.getAttribute('data-tab') as string;
      
      tabs.forEach(t => {
        t.classList.remove('active');
        t.style.color = '';
        t.style.borderBottomColor = 'transparent';
      });
      
      tabContents.forEach(c => c.classList.remove('active'));
      
      tab.classList.add('active');
      updateTabColors(); // Update colors when tab changes
      
      const activeContentId = `betterx-${tabName}-tab`;
      const activeContent = modal.querySelector(`#${activeContentId}`) as HTMLElement;
      if (activeContent) {
        activeContent.classList.add('active');
      }
      
      if (tabName === 'plugins') {
        uiManager.captureInitialPluginStates();
        uiManager.populatePluginList(modal.querySelector('#betterx-plugin-list') as HTMLElement);
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
  
  // Initial tab color setup
  setTimeout(updateTabColors, 0);

  // Attach search event listener to filter plugins
  const searchInput = modal.querySelector('#plugin-search') as HTMLInputElement;
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      uiManager.populatePluginList(modal.querySelector('#betterx-plugin-list') as HTMLElement);
    });
  }

  // Populate plugin list initially
  uiManager.populatePluginList(modal.querySelector('#betterx-plugin-list') as HTMLElement);

  return modal;
}
