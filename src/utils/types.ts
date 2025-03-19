export enum OptionType {
    BOOLEAN = "BOOLEAN",
    SELECT = "SELECT",
    STRING = "STRING",
    NUMBER = "NUMBER"
}

declare namespace JSX {
    interface Element {}
}

interface PluginSettings {
    store?: Record<string, any>;
    onChange?: Record<string, Function>;
    [key: string]: any;
}

interface PluginOptions {
    name: string;
    description?: string;
    requiresRestart?: boolean;
    settings?: PluginSettings;
    renderSettings?: () => JSX.Element;
    [key: string]: any;
}

interface Plugin extends PluginOptions {
    requiresRestart: boolean;
    settings: Required<PluginSettings>;
}

export default function definePlugin(options: PluginOptions): Plugin {
    return {
        ...options,
        requiresRestart: options.requiresRestart !== undefined ? options.requiresRestart : false,
        settings: {
            ...options.settings,
            store: options.settings?.store || {},
            onChange: options.settings?.onChange || {}
        }
    };
}
