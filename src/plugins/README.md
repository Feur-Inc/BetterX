# Plugin Development Guide

## Overview
Plugins in BetterX are modular pieces of code that can modify or enhance X's functionality. Each plugin is a self-contained module with its own settings and lifecycle methods.

## Plugin Structure
A basic plugin consists of:
- Name and description
- Author information
- Optional settings configuration
- Start and stop methods

## Creating a Plugin
Create a new directory in the `plugins` folder with an `index.js` file. Use the following template:

```javascript
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

export default definePlugin({
    name: "MyPlugin",
    description: "Description of what your plugin does",
    authors: [Devs.YourName],
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
    }
});
```

## Option Types
Available option types:
- `OptionType.BOOLEAN` - True/false toggle
- `OptionType.SELECT` - Dropdown selection
- `OptionType.STRING` - Text input
- `OptionType.NUMBER` - Numeric input

## Best Practices
1. Always clean up in the `stop()` method
2. Use meaningful option names
3. Store DOM references for cleanup
4. Access settings via `this.settings.store`
5. Test both enable/disable functionality