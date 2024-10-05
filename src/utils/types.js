export const OptionType = {
    BOOLEAN: "BOOLEAN",
    SELECT: "SELECT",
    STRING: "STRING"
};

export default function definePlugin(options) {
    return {
        ...options,
        settings: options.settings || {}
    };
}