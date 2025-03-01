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
  const searchInput = document.getElementById('betterx-plugin-search');
  const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
  
  uiManager.pluginManager.plugins.forEach(plugin => {
    if (!plugin.name.toLowerCase().includes(searchTerm)) return;
    
    const authorNames = uiManager.getAuthorNames(plugin.authors);

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
          <p>Author${plugin.authors.length > 1 ? 's' : ''}: ${authorNames}</p>
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
    detailsToggle.addEventListener('click', () => {
      detailsSection.style.display = detailsSection.style.display === 'none' ? 'block' : 'none';
      detailsToggle.classList.toggle('rotated');
    });

    const optionsContainer = pluginElement.querySelector('.betterx-plugin-options');
    if (plugin.options && typeof plugin.options === 'object') {
      Object.entries(plugin.options).forEach(([optionId, option]) => {
        const optionElement = uiManager.createOptionElement(plugin, { id: optionId, ...option });
        if (optionElement) {
          optionsContainer.appendChild(optionElement);
        }
      });
    }

    container.appendChild(pluginElement);
  });
}
