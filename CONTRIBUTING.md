# Contributing to BetterX

Thank you for your interest in contributing to BetterX! This document will guide you through the contribution process.

## Ways to Contribute

1. **Bug Reports**: Submit detailed bug reports using the issue tracker
2. **Feature Requests**: Suggest new features or improvements
3. **Code Contributions**: Submit pull requests for bug fixes or new features
4. **Plugin Development**: Create new plugins to extend BetterX's functionality

## Development Setup

1. Fork and clone the repository
2. Install Bun:
   - **Linux/macOS**:
   ```bash
   curl -fsSL https://bun.sh/install | bash
   ```
   - **Windows**:
   ```powershell
   powershell -c "irm bun.sh/install.ps1|iex"
   ```
3. Install dependencies:
```bash
bun install
```
4. Create a new branch for your changes:
```bash
git checkout -b feature/your-feature-name
```

## Development Workflow

1. Start the development server:
```bash
bun run watch
```
This enables Webpack's watch mode, which automatically rebuilds when you make changes.

2. Open BetterX Desktop
3. Make changes to the code
4. Refresh BetterX Desktop to see your changes
   - The bundle will automatically reload with your latest changes
   - No need to restart the app, just refresh the page

## Plugin Development

### Official Plugins
Official plugins belong in the `src/plugins` directory. These are distributed with BetterX and undergo thorough review.

### User Plugins
User plugins are stored in `src/userplugins`. This directory is git-ignored and meant for:
- Personal plugins during development
- Community plugins that haven't been merged into core

To create a user plugin:
1. Create `src/userplugins` directory if it doesn't exist
2. Add your plugin in a subdirectory: `src/userplugins/YourPlugin/index.js`
3. Follow the plugin template:
```javascript
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

export default definePlugin({
    name: "YourPluginName",
    description: "Description of your plugin",
    authors: [Devs.YourName],
    // Set to false if your plugin can be enabled/disabled without requiring a page reload
    needsRestart: false,
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
            onChange: function() {
                // Execute on option changed 
                }
            }
        }
    }
});
```

## Pull Request Guidelines

1. Follow the existing code style
2. Add tests for new features
3. Update documentation as needed
4. Ensure all tests pass
5. Keep PRs focused - one feature/fix per PR

## Code Style

- Use 2 spaces for indentation
- Follow ESLint rules
- Add comments for complex logic
- Use meaningful variable names

## Review Process

1. Submit your PR
2. Automated tests will run
3. Maintainers will review your code
4. Address any requested changes
5. PR will be merged once approved

## Questions?

Join our [Discord server](https://discord.gg/jeAE8cq97U) or open a discussion on GitHub for any questions about contributing.

Thank you for helping make BetterX better!
