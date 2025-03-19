# Plugin Development Guide

## Overview
Plugins in BetterX are modular pieces of code that can modify or enhance X's functionality. Each plugin is a self-contained module with its own settings and lifecycle methods.

## Plugin Structure
A basic plugin consists of:
- Name and description
- Author information
- Optional settings configuration
- Start and stop methods
- Optional restart requirement flag
- Optional custom settings UI

## Creating a Plugin
Create a new directory in the `plugins` folder with an `index.js` file. Use the following template:

```javascript
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

export default definePlugin({
    name: "MyPlugin",
    description: "Description of what your plugin does",
    authors: [Devs.YourName],
    // Set to false if your plugin can be enabled/disabled without a page reload
    requiresRestart: false,
    options: {
        // Optional settings
        myOption: {
            type: OptionType.BOOLEAN,
            default: true,
            description: "Description of this option"
        }
    },
    start() {
        // Code to run when plugin is enabled
        // Access settings with: this.settings.store.myOption
    },
    stop() {
        // Cleanup code when plugin is disabled
        // Remove event listeners, DOM elements, etc.
    },
    // Optional: Custom settings UI
    renderSettings(container) {
        // Create and append custom UI elements to the container
        const customEl = document.createElement('div');
        customEl.className = 'my-custom-settings';
        customEl.innerHTML = '<h4>Custom Settings Section</h4>';
        
        // Create interactive elements
        const button = document.createElement('button');
        button.textContent = 'Click Me';
        button.className = 'betterx-button';
        button.onclick = () => {
            alert('Custom button clicked!');
        };
        
        customEl.appendChild(button);
        container.appendChild(customEl);
    }
});
```

## Option Types
Available option types:
- `OptionType.BOOLEAN` - True/false toggle
- `OptionType.SELECT` - Dropdown selection
- `OptionType.STRING` - Text input
- `OptionType.NUMBER` - Numeric input

## Plugin Properties
- `requiresRestart`: Set to `false` if your plugin can be enabled/disabled without requiring a page reload. Defaults to `true` for backward compatibility.

## Custom Settings UI
You can create advanced custom settings UI using the `renderSettings` method:

```javascript
renderSettings(container) {
    // Basic example with a custom color picker
    const wrapper = document.createElement('div');
    wrapper.className = 'my-plugin-custom-settings';
    
    // Create a title
    const title = document.createElement('h4');
    title.textContent = 'Custom Color Settings';
    wrapper.appendChild(title);
    
    // Create a color picker with preview
    const colorPickerContainer = document.createElement('div');
    colorPickerContainer.className = 'color-picker-container';
    
    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.value = this.settings.store.customColor || '#ff5500';
    
    const colorPreview = document.createElement('div');
    colorPreview.className = 'color-preview';
    colorPreview.style.backgroundColor = colorInput.value;
    colorPreview.textContent = colorInput.value;
    
    // Update color on change
    colorInput.addEventListener('input', () => {
        const newColor = colorInput.value;
        colorPreview.style.backgroundColor = newColor;
        colorPreview.textContent = newColor;
        
        // Save to plugin settings
        this.settings.store.customColor = newColor;
        if (window.betterX && window.betterX.pluginManager) {
            window.betterX.pluginManager.savePluginData();
        }
    });
    
    colorPickerContainer.appendChild(colorInput);
    colorPickerContainer.appendChild(colorPreview);
    wrapper.appendChild(colorPickerContainer);
    
    // Add to the container
    container.appendChild(wrapper);
}
```

## Using React for Custom Settings (Advanced)
If you want to use React for more complex UIs:

```javascript
// You'll need to ensure React is available
import React from 'react';
import ReactDOM from 'react-dom';

// Create a React component
const MySettingsComponent = ({ plugin }) => {
    const [value, setValue] = React.useState(plugin.settings.store.reactValue || 0);
    
    const handleChange = (newValue) => {
        setValue(newValue);
        plugin.settings.store.reactValue = newValue;
        
        // Save the settings
        if (window.betterX && window.betterX.pluginManager) {
            window.betterX.pluginManager.savePluginData();
        }
    };
    
    return (
        <div className="my-react-settings">
            <h4>React Settings Component</h4>
            <div className="slider-container">
                <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    value={value} 
                    onChange={e => handleChange(Number(e.target.value))} 
                />
                <span>{value}%</span>
            </div>
            <div 
                className="preview-box"
                style={{ 
                    opacity: value / 100,
                    backgroundColor: '#3498db'
                }}
            >
                Preview Box
            </div>
        </div>
    );
};

// In your plugin
renderSettings(container) {
    // Create a container for React
    const reactRoot = document.createElement('div');
    container.appendChild(reactRoot);
    
    // Render the React component
    ReactDOM.render(
        React.createElement(MySettingsComponent, { plugin: this }),
        reactRoot
    );
    
    // Return a cleanup function if needed
    return () => {
        ReactDOM.unmountComponentAtNode(reactRoot);
    };
}
```

## Using the Notification API
BetterX provides a notification system that plugins can use to display messages to users:

```javascript
import { notifications } from "@api";

// Show a simple notification
notifications.showInfo("This is an informational message");

// Show a success notification
notifications.showSuccess("Operation completed successfully");

// Show a warning notification
notifications.showWarning("Something might need attention");

// Show an error notification
notifications.showError("An error occurred");
```

See the [Notification API documentation](/docs/api/notification-api.md) for more details.

## Advanced Custom Settings

### Interleaving Standard and Custom Settings

You can create a seamless UI by interleaving standard setting options with custom UI elements:

```javascript
export default definePlugin({
    name: "MixedSettingsPlugin",
    description: "Plugin with mixed standard and custom settings",
    authors: [Devs.YourName],
    options: {
        enableFeature: {
            type: OptionType.BOOLEAN,
            default: true,
            description: "Enable main feature"
        },
        showCounter: {
            type: OptionType.BOOLEAN,
            default: true,
            description: "Show counter in UI"
        },
        textColor: {
            type: OptionType.SELECT,
            default: "blue",
            description: "Color for text elements",
            options: [
                { label: "Blue", value: "blue" },
                { label: "Red", value: "red" },
                { label: "Green", value: "green" }
            ]
        }
    },
    
    // Define the order and types of settings sections
    customSettingsSections: [
        { type: 'option', id: 'enableFeature' },
        { type: 'custom', id: 'myCustomSection' },
        { type: 'option', id: 'showCounter' },
        { type: 'option', id: 'textColor' },
        { type: 'custom', id: 'anotherCustomSection' }
    ],
    
    // Render a specific custom settings section
    renderSettingsSection(sectionId, container) {
        switch(sectionId) {
            case 'myCustomSection':
                this.renderFirstCustomSection(container);
                break;
                
            case 'anotherCustomSection':
                this.renderSecondCustomSection(container);
                break;
        }
    },
    
    renderFirstCustomSection(container) {
        const section = document.createElement('div');
        section.className = 'my-custom-section';
        section.style.padding = '10px';
        section.style.margin = '10px 0';
        section.style.backgroundColor = 'var(--background-secondary)';
        section.style.borderRadius = '8px';
        
        const header = document.createElement('h4');
        header.textContent = 'Custom UI Section';
        section.appendChild(header);
        
        const button = document.createElement('button');
        button.className = 'betterx-button';
        button.textContent = 'Click Me';
        button.onclick = () => alert('Button clicked!');
        section.appendChild(button);
        
        container.appendChild(section);
    },
    
    renderSecondCustomSection(container) {
        // Another custom section implementation
    }
});
```

### Grouping Options

You can also group related standard options together:

```javascript
customSettingsSections: [
    { type: 'option', id: 'enableFeature' },
    { 
        type: 'group', 
        name: 'Appearance Settings',
        options: ['textColor', 'fontSize', 'fontFamily'] 
    },
    { type: 'custom', id: 'myCustomSection' }
]
```

## Best Practices
1. Always clean up in the `stop()` method
2. Use meaningful option names
3. Store DOM references for cleanup
4. Access settings via `this.settings.store`
5. Test both enable/disable functionality
6. Set `requiresRestart: false` if your plugin properly cleans up in the `stop()` method
7. Use the notification system for user feedback instead of console logs
8. When creating custom settings UI, use BetterX styling classes where possible
9. Avoid global state in custom settings - store everything in plugin.settings.store