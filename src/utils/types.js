export const OptionType = {
    BOOLEAN: "BOOLEAN",
    SELECT: "SELECT",
    STRING: "STRING",
    NUMBER: "NUMBER"
  };

export default function definePlugin(options) {
    // Add documentation for the renderSettings method
    // options.renderSettings = optional function to render custom settings UI
    return {
        ...options,
        // Default to true for backward compatibility
        requiresRestart: options.requiresRestart !== undefined ? options.requiresRestart : false,
        settings: {
            ...options.settings,
            store: options.settings?.store || {},
            onChange: options.settings?.onChange || {}
        }
    };
}