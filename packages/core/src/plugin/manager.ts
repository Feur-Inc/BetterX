import type {
  Plugin,
  PluginDefinition,
  PluginOptionDefs,
  PluginPlatform,
  PluginStorageData,
} from "../types/plugin.js";
import type { IStorage } from "../types/storage.js";
import { notifications } from "../ui/notification.js";
import { logger } from "../utils/logger.js";

// ─── Plugin Manager ───────────────────────────────────────────────────────────

export class PluginManager {
  private plugins = new Map<string, Plugin>();
  private storage: IStorage;
  private initialized = false;

  constructor(storage: IStorage) {
    this.storage = storage;
  }

  async initialize(
    definitions: ReadonlyArray<PluginDefinition<PluginOptionDefs>>,
    platform?: PluginPlatform
  ): Promise<void> {
    const saved = await this.storage.getPluginStates();

    for (const def of definitions) {
      const incompatible = !!(def.platform && platform && def.platform !== platform);
      const plugin = this.hydratePlugin(def, saved[def.name]);
      plugin.hidden = !!def.hidden;

      if (incompatible) {
        plugin.unavailable = true;
        plugin.enabled = false;
      }

      this.plugins.set(def.name, plugin);
    }

    this.initialized = true;

    // Start enabled plugins in dependency order so deps are running before dependents.
    await this.startInOrder();

    logger.info(`PluginManager: ${this.plugins.size} plugins loaded`);
  }

  /** Hydrate a definition into a full Plugin with settings.store. */
  private hydratePlugin<O extends PluginOptionDefs>(
    def: PluginDefinition<O>,
    saved?: PluginStorageData
  ): Plugin<O> {
    const store = {} as Record<string, unknown>;

    if (def.options) {
      for (const [key, opt] of Object.entries(def.options)) {
        store[key] = saved?.settings?.[key] ?? opt.default;
      }
    }

    return {
      ...def,
      enabled: def.isMeta ? true : (saved?.enabled ?? false),
      isUserPlugin: false,
      settings: {
        store: store as never,
        persist: () => this.persist(),
      },
    };
  }

  getStorage(): IStorage {
    return this.storage;
  }

  getAll(): Plugin[] {
    return Array.from(this.plugins.values()).filter((plugin) => !plugin.hidden);
  }

  get(name: string): Plugin | undefined {
    return this.plugins.get(name);
  }

  async toggle(name: string): Promise<void> {
    const plugin = this.plugins.get(name);
    if (!plugin || plugin.unavailable || plugin.isLibrary || plugin.isMeta) return;

    if (plugin.enabled) {
      const disabled = await this.disableWithDependents(name);
      await this.disableOrphanedLibraries();
      const cascade = disabled.filter((n) => n !== name);
      if (cascade.length > 0) {
        notifications.showWarning(
          `Also disabled: ${cascade.join(", ")} (depend on "${plugin.name}")`
        );
      }
    } else {
      const dependencyIssue = this.findDependencyIssue(name);
      if (dependencyIssue) {
        notifications.showError(`Cannot enable "${plugin.name}": ${dependencyIssue}`);
        return;
      }
      const enabled = await this.enableWithDependencies(name);
      if (!plugin.enabled) {
        await this.disableOrphanedLibraries();
        await this.persist();
        notifications.showError(`Could not enable "${plugin.name}" because a dependency failed.`);
        return;
      }
      const auto = enabled.filter((n) => n !== name);
      if (auto.length > 0) {
        notifications.showWarning(
          `Also enabled: ${auto.join(", ")} (required by "${plugin.name}")`
        );
      }
    }

    await this.persist();

    if (plugin.requiresRestart) {
      notifications.showWarning(`"${plugin.name}" requires a page refresh to fully apply.`, {
        duration: 0,
        actions: [
          {
            label: "Refresh now",
            callback: () => location.reload(),
          },
        ],
      });
    }
  }

  /** Returns names of plugins that directly depend on the given plugin. */
  getDependents(name: string): string[] {
    return Array.from(this.plugins.values())
      .filter((p) => p.dependencies?.includes(name))
      .map((p) => p.name);
  }

  private findDependencyIssue(
    name: string,
    visiting = new Set<string>(),
    visited = new Set<string>()
  ): string | null {
    if (visiting.has(name)) return `dependency cycle includes "${name}"`;
    if (visited.has(name)) return null;
    const plugin = this.plugins.get(name);
    if (!plugin || plugin.unavailable) return `dependency "${name}" is unavailable`;

    visiting.add(name);
    for (const dependencyName of plugin.dependencies ?? []) {
      const issue = this.findDependencyIssue(dependencyName, visiting, visited);
      if (issue) return issue;
    }
    visiting.delete(name);
    visited.add(name);
    return null;
  }

  /** Enable a plugin after enabling its dependencies. Returns all newly-enabled names. */
  private async enableWithDependencies(
    name: string,
    visited = new Set<string>()
  ): Promise<string[]> {
    if (visited.has(name)) return [];
    visited.add(name);

    const plugin = this.plugins.get(name);
    if (!plugin || plugin.unavailable || plugin.enabled) return [];

    const enabled: string[] = [];

    for (const depName of plugin.dependencies ?? []) {
      const dep = this.plugins.get(depName);
      if (!dep || dep.unavailable || dep.enabled) continue;
      enabled.push(...(await this.enableWithDependencies(depName, visited)));
      if (!dep.enabled) {
        await this.rollbackEnabled(enabled);
        return [];
      }
    }

    plugin.enabled = true;
    if (await this.safeCall(plugin, "start")) enabled.push(name);
    return enabled;
  }

  private async rollbackEnabled(names: string[]): Promise<void> {
    for (const name of names.reverse()) {
      const plugin = this.plugins.get(name);
      if (!plugin?.enabled) continue;
      plugin.enabled = false;
      await this.safeCall(plugin, "stop");
    }
  }

  /** Disable a plugin and cascade to anything that depends on it. Returns all disabled names. */
  private async disableWithDependents(
    name: string,
    visited = new Set<string>()
  ): Promise<string[]> {
    if (visited.has(name)) return [];
    visited.add(name);

    const plugin = this.plugins.get(name);
    if (!plugin || !plugin.enabled) return [];

    const disabled: string[] = [];

    for (const [depName, dep] of this.plugins) {
      if (dep.enabled && dep.dependencies?.includes(name)) {
        disabled.push(...(await this.disableWithDependents(depName, visited)));
      }
    }

    plugin.enabled = false;
    await this.safeCall(plugin, "stop");
    disabled.push(name);

    return disabled;
  }

  /** Disable any library plugin that has no enabled dependents. Iterates until stable. */
  private async disableOrphanedLibraries(): Promise<void> {
    let changed = true;
    while (changed) {
      changed = false;
      for (const [name, plugin] of this.plugins) {
        if (!plugin.isLibrary || !plugin.enabled) continue;
        const hasActiveDependents = Array.from(this.plugins.values()).some(
          (p) => p.enabled && p.dependencies?.includes(name)
        );
        if (!hasActiveDependents) {
          plugin.enabled = false;
          await this.safeCall(plugin, "stop");
          changed = true;
        }
      }
    }
  }

  /** Start all enabled plugins respecting dependency order. */
  private async startInOrder(): Promise<void> {
    const started = new Set<string>();
    const failed = new Set<string>();

    const start = async (name: string, visiting = new Set<string>()): Promise<boolean> => {
      if (started.has(name)) return true;
      if (failed.has(name)) return false;
      if (visiting.has(name)) {
        logger.error(`Plugin dependency cycle detected at "${name}"`);
        failed.add(name);
        return false;
      }
      visiting.add(name);
      const plugin = this.plugins.get(name);
      if (!plugin || !plugin.enabled) return false;
      for (const depName of plugin.dependencies ?? []) {
        const dependency = this.plugins.get(depName);
        if (!dependency || dependency.unavailable || !(await start(depName, visiting))) {
          logger.error(`Plugin "${plugin.name}" requires unavailable dependency "${depName}"`);
          plugin.enabled = false;
          failed.add(name);
          visiting.delete(name);
          return false;
        }
      }
      visiting.delete(name);
      if (!(await this.safeCall(plugin, "start"))) {
        failed.add(name);
        return false;
      }
      started.add(name);
      return true;
    };

    for (const name of this.plugins.keys()) await start(name);
    if (failed.size > 0) await this.persist();
  }

  async updateOption(pluginName: string, key: string, value: unknown): Promise<void> {
    const plugin = this.plugins.get(pluginName);
    if (!plugin) return;

    const optDef = plugin.options?.[key];
    if (!optDef) return;

    const oldValue = (plugin.settings.store as Record<string, unknown>)[key];
    (plugin.settings.store as Record<string, unknown>)[key] = value;

    const onChange = (optDef as { onChange?: (n: unknown, o: unknown) => void }).onChange;
    if (onChange) {
      try {
        await onChange(value, oldValue);
      } catch (err) {
        logger.error(`Plugin "${pluginName}" onChange for "${key}" threw:`, err);
      }
    }

    await this.persist();
  }

  private async safeCall(plugin: Plugin, method: "start" | "stop"): Promise<boolean> {
    const fn = plugin[method];
    if (typeof fn !== "function") return true;
    try {
      await fn.call(plugin);
      return true;
    } catch (err) {
      logger.error(`Plugin "${plugin.name}" threw during ${method}():`, err);
      if (method === "start") {
        plugin.enabled = false;
      }
      return false;
    }
  }

  private async persist(): Promise<void> {
    if (!this.initialized) return;

    const states: Record<string, PluginStorageData> = {};
    for (const [name, plugin] of this.plugins) {
      states[name] = {
        enabled: plugin.enabled,
        settings: { ...(plugin.settings.store as Record<string, unknown>) },
      };
    }
    await this.storage.setPluginStates(states);
  }
}
