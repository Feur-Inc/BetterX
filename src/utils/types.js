export const OptionType = {
    BOOLEAN: "BOOLEAN",
    SELECT: "SELECT",
    STRING: "STRING",
    NUMBER: "NUMBER"
  };

export default function definePlugin(options) {
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