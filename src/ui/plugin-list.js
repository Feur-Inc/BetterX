import { OptionType } from "@utils/types";

export function createOptionElement(plugin, option, pluginManager) {
  if (!option || typeof option !== 'object') {
    console.warn(`Invalid option for plugin ${plugin.name}:`, option);
    return null;
  }

  let optionElement;
  const optionType = option.type || OptionType.STRING;
  const currentValue = plugin.settings.store[option.id];

  const updateOptionValue = (value) => {
    pluginManager.updatePluginOption(plugin.name, option.id, value);
  };

  switch (optionType) {
    case OptionType.BOOLEAN:
      optionElement = document.createElement('label');
      optionElement.className = 'betterx-switch';
      optionElement.innerHTML = `
        <input type="checkbox" ${currentValue ? 'checked' : ''}>
        <span class="betterx-slider"></span>
      `;
      const checkbox = optionElement.querySelector('input');
      checkbox.addEventListener('change', () => {
        updateOptionValue(checkbox.checked);
      });
      break;

    case OptionType.SELECT:
      optionElement = document.createElement('select');
      optionElement.className = 'betterx-select';
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
      optionElement = document.createElement('input');
      optionElement.type = 'number';
      optionElement.className = 'betterx-input betterx-number-input';
      optionElement.value = currentValue;
      optionElement.min = option.min;
      optionElement.max = option.max;
      optionElement.step = option.step || 1;
      optionElement.addEventListener('change', (e) => {
        const value = parseFloat(e.target.value);
        if (!isNaN(value)) {
          updateOptionValue(value);
        }
      });
      break;

    case OptionType.STRING:
    default:
      optionElement = document.createElement('input');
      optionElement.type = 'text';
      optionElement.className = 'betterx-input';
      optionElement.value = currentValue;
      optionElement.addEventListener('change', (e) => {
        updateOptionValue(e.target.value);
      });
      break;
  }

  const wrapper = document.createElement('div');
  wrapper.className = 'betterx-option-wrapper';
  wrapper.innerHTML = `
    <label class="betterx-option-label">${option.name || option.id || 'Unnamed Option'}</label>
    <p class="betterx-option-description">${option.description || ''}</p>
  `;
  wrapper.appendChild(optionElement);

  return wrapper;
}

export function populatePluginList(container, uiManager) {
  container.innerHTML = '';
  const searchInput = document.getElementById('plugin-search');
  const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
  
  uiManager.pluginManager.plugins.forEach(plugin => {
    // Check if plugin name or description contains search term
    if (searchTerm && 
        !plugin.name.toLowerCase().includes(searchTerm) && 
        !plugin.description?.toLowerCase().includes(searchTerm)) {
      return; // Skip this plugin if it doesn't match search
    }
    
    const authorHTML = uiManager.getAuthorHTML(plugin.authors);

    const pluginElement = uiManager.createUIElement('div', {
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
          <div class="betterx-plugin-authors">
            <p>Author${plugin.authors.length > 1 ? 's' : ''}:</p><div class="betterx-author-avatars">${authorHTML}</div>
          </div>
          <div class="betterx-plugin-options"></div>
        </div>
      `
    });

    const checkbox = pluginElement.querySelector('input[type="checkbox"]');
    checkbox.addEventListener('change', () => {
      uiManager.pluginManager.togglePlugin(plugin.name);
    });

    const detailsToggle = pluginElement.querySelector('.betterx-details-toggle');
    const detailsSection = pluginElement.querySelector('.betterx-plugin-details');
    
    // Variable to track if custom settings have been rendered
    let customSettingsRendered = false;
    
    detailsToggle.addEventListener('click', () => {
      const isExpanding = detailsSection.style.display === 'none';
      detailsSection.style.display = isExpanding ? 'block' : 'none';
      detailsToggle.classList.toggle('rotated');
      
      // Render settings when expanding for the first time
      if (isExpanding && !customSettingsRendered) {
        customSettingsRendered = true;
        
        // Get the options container
        const optionsContainer = pluginElement.querySelector('.betterx-plugin-options');
        
        // Check if the plugin has custom settings sections
        if (plugin.customSettingsSections && Array.isArray(plugin.customSettingsSections)) {
          renderMixedSettings(plugin, optionsContainer, uiManager);
        } else {
          // Fallback to standard options rendering
          renderStandardOptions(plugin, optionsContainer, uiManager);
          
          // Add custom settings container at the end if plugin has renderSettings method
          if (typeof plugin.renderSettings === 'function') {
            const customContainer = document.createElement('div');
            customContainer.className = 'betterx-custom-settings-container';
            optionsContainer.appendChild(customContainer);
            uiManager.pluginManager.renderCustomSettings(plugin, customContainer);
          }
        }
      }
    });

    container.appendChild(pluginElement);
  });
}

// Helper function to render standard options
function renderStandardOptions(plugin, container, uiManager) {
  if (plugin.options && typeof plugin.options === 'object') {
    Object.entries(plugin.options).forEach(([optionId, option]) => {
      const optionElement = uiManager.createOptionElement(plugin, { id: optionId, ...option });
      if (optionElement) {
        container.appendChild(optionElement);
      }
    });
  }
}

// Helper function to render mixed settings (standard options interspersed with custom UI)
function renderMixedSettings(plugin, container, uiManager) {
  // Process each section in order
  plugin.customSettingsSections.forEach(section => {
    if (section.type === 'custom' && section.id) {
      // Create container for this custom section
      const sectionContainer = document.createElement('div');
      sectionContainer.className = `betterx-custom-section ${section.className || ''}`;
      sectionContainer.dataset.sectionId = section.id;
      container.appendChild(sectionContainer);
      
      // Render this specific section
      try {
        if (typeof plugin.renderSettingsSection === 'function') {
          plugin.renderSettingsSection(section.id, sectionContainer);
        }
      } catch (error) {
        console.error(`Error rendering custom section ${section.id}:`, error);
        sectionContainer.innerHTML = `<div class="betterx-settings-error">Error rendering section: ${error.message}</div>`;
      }
    } else if (section.type === 'option' && section.id) {
      // Render a standard option
      if (plugin.options && plugin.options[section.id]) {
        const optionElement = uiManager.createOptionElement(plugin, { 
          id: section.id, 
          ...plugin.options[section.id] 
        });
        if (optionElement) {
          container.appendChild(optionElement);
        }
      }
    } else if (section.type === 'group' && section.options) {
      // Render a group of standard options
      const groupContainer = document.createElement('div');
      groupContainer.className = `betterx-options-group ${section.className || ''}`;
      if (section.name) {
        const groupHeader = document.createElement('h4');
        groupHeader.className = 'betterx-group-header';
        groupHeader.textContent = section.name;
        groupContainer.appendChild(groupHeader);
      }
      
      section.options.forEach(optionId => {
        if (plugin.options && plugin.options[optionId]) {
          const optionElement = uiManager.createOptionElement(plugin, { 
            id: optionId, 
            ...plugin.options[optionId] 
          });
          if (optionElement) {
            groupContainer.appendChild(optionElement);
          }
        }
      });
      
      // Ensure theme-related classes are properly applied
      const theme = document.body.getAttribute('data-betterx-theme') || 'dim';
      groupContainer.classList.add(`betterx-theme-${theme}`);
      
      container.appendChild(groupContainer);
    }
  });
}
