export const OptionType = {
    BOOLEAN: "BOOLEAN",
    SELECT: "SELECT",
    STRING: "STRING",
    NUMBER: "NUMBER"
  };

export default function definePlugin(options) {
    return {
        ...options,
        settings: {
            ...options.settings,
            store: options.settings?.store || {},
            onChange: options.settings?.onChange || {}
        }
    };
}