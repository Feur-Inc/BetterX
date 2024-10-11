![BetterX logo](https://raw.githubusercontent.com/Feur-Inc/BetterX/refs/heads/main/attachments/logo_full.png)

# BetterX

BetterX is a powerful enhancement tool designed to improve your X (formerly Twitter) experience. It provides a flexible plugin system that allows users to customize and extend the functionality of the X platform.

## Features

- 🔌 Plugin System: Easily extend X's functionality with custom plugins
- 🎨 Custom UI: Inject custom UI elements to enhance your X experience
- 🛠 Patch Management: Apply patches to modify X's behavior
- ⚙️ Settings Management: Configurable options for each plugin

## Installation

1. Clone the repository:
```
git clone https://github.com/Feur-Inc/BetterX.git
```
2. Navigate to the project directory:
```
cd BetterX
```
3. Install dependencies:
```
npm install - g pnpm
pnpm install
```
## Building the Project

To build BetterX, run the following command:
```
npm run build
```
This will use Webpack to compile and bundle the project.

## Development

### Project Structure

- `main.js`: The main application file that initializes BetterX
- `plugin-manager.js`: Manages loading and toggling of plugins
- `ui-manager.js`: Handles custom UI injection

### Creating a Plugin

To create a new plugin, use the following template:

```javascript
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

export default definePlugin({
    name: "YourPluginName",
    description: "Description of your plugin",
    authors: [Devs.YourName],
    start() {
        // Initialization code
    },
    stop() {
        // Cleanup code
    },
    settings: {
        someOption: {
            type: OptionType.BOOLEAN,
            default: true,
            description: "Description of the option"
        }
    }
});
```
## Contributing

We welcome contributions to BetterX! Please read our [Contributing Guidelines](CONTRIBUTING.md) for more information on how to get started.

## License

This project is licensed under the GNU GPL. See the [LICENSE](LICENSE) file for details.

## Acknowledgements

- Thanks to all the contributors who have helped make BetterX better!
- Thanks to SauceyRed for Bring Twitter Back
- Thanks to Vencord for the inspiration

---
