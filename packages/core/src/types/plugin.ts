// ─── Option Types ─────────────────────────────────────────────────────────────

export const OptionType = {
  BOOLEAN: "BOOLEAN",
  SELECT: "SELECT",
  STRING: "STRING",
  NUMBER: "NUMBER",
  COLOR: "COLOR",
} as const;

export type OptionTypeKey = (typeof OptionType)[keyof typeof OptionType];

export type OptionValueMap = {
  BOOLEAN: boolean;
  SELECT: string;
  STRING: string;
  NUMBER: number;
  COLOR: string;
};

export type SelectOption = { label: string; value: string };

export type PluginOptionDef<T extends OptionTypeKey = OptionTypeKey> = {
  type: T;
  default: OptionValueMap[T];
  label?: string;
  description?: string;
  /** If true, the option is persisted but not shown in the settings UI. */
  hidden?: boolean;
  options?: T extends "SELECT" ? SelectOption[] : never;
  onChange?: (newValue: OptionValueMap[T], oldValue: OptionValueMap[T]) => void;
};

export type PluginOptionDefs = Record<string, PluginOptionDef>;

// Maps option defs to their runtime store type
export type InferredStore<O extends PluginOptionDefs> = {
  [K in keyof O]: OptionValueMap[O[K]["type"]];
};

// ─── Author ───────────────────────────────────────────────────────────────────

export type Developer = {
  name: string;
  handle: string;
};

// ─── Plugin Definition ────────────────────────────────────────────────────────

export type PluginPlatform = "desktop" | "extension" | "android";

export type PluginDefinition<O extends PluginOptionDefs = PluginOptionDefs> = {
  name: string;
  description?: string;
  authors?: Developer[];
  version?: string;
  options?: O;
  requiresRestart?: boolean;
  /** If true, the plugin runs but is hidden from the UI. */
  hidden?: boolean;
  /** Restrict this plugin to a specific platform. Omit for all platforms. */
  platform?: PluginPlatform;
  /**
   * Names of plugins this plugin depends on.
   * Enabling this plugin auto-enables its dependencies first.
   * Disabling a dependency auto-disables this plugin.
   */
  dependencies?: string[];
  /**
   * Mark this plugin as a library/utility.
   * Library plugins are shown separately at the bottom of the plugins list,
   * cannot be toggled manually, and are auto-enabled/disabled based on
   * whether any dependent plugins are active.
   */
  isLibrary?: boolean;
  /**
   * Mark this plugin as a meta/core plugin (e.g. BetterX itself).
   * Meta plugins are always enabled, pinned to the top of the list,
   * and cannot be toggled off.
   */
  isMeta?: boolean;
  start(this: Plugin<O>): void | Promise<void>;
  stop?(this: Plugin<O>): void | Promise<void>;
  renderSettings?: (container: HTMLElement) => void;
};

export type Plugin<O extends PluginOptionDefs = PluginOptionDefs> = PluginDefinition<O> & {
  enabled: boolean;
  isUserPlugin: boolean;
  /** Set when the plugin targets a different platform than the current one. */
  unavailable?: boolean;
  settings: {
    store: InferredStore<O>;
    /** Persist the current store to storage. */
    persist(): Promise<void>;
  };
};

// ─── Storage data shape (what gets persisted) ─────────────────────────────────

export type PluginStorageData = {
  enabled: boolean;
  settings: Record<string, unknown>;
};

// ─── definePlugin helper ──────────────────────────────────────────────────────

export function definePlugin<O extends PluginOptionDefs>(
  definition: PluginDefinition<O>
): PluginDefinition<O> {
  return definition;
}
