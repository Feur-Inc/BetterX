// ─── Preload API Types ────────────────────────────────────────────────────────
// This defines the shape of window.electronAPI exposed via contextBridge.

export type ElectronAPI = {
  // Theme management
  themes: {
    list(): Promise<string[]>;
    read(id: string): Promise<string>;
    write(id: string, css: string): Promise<void>;
    delete(id: string): Promise<void>;
    onChanged(callback: (id: string, css: string) => void): () => void;
    openFolder(): Promise<void>;
  };

  // Settings
  settings: {
    getAll(): Promise<Record<string, unknown>>;
    get(key: string): Promise<unknown>;
    set(key: string, value: unknown): Promise<void>;
    chooseBundlePath(): Promise<string | null>;
  };

  // Screenshot capture
  captureElement(rect: { x: number; y: number; width: number; height: number }): Promise<string>;

  // App info
  getVersion(): string;

  // App control
  restart(): void;

  // OAuth
  openOAuth(url: string): Promise<void>;
  onOAuthComplete(callback: () => void): () => void;

  // Cloud Sync proxy (bypasses CSP by routing through main process)
  cloudFetch(
    serverUrl: string,
    path: string,
    options?: { method?: string; body?: string; headers?: Record<string, string> }
  ): Promise<{
    ok: boolean;
    status: number;
    json: unknown;
    text: string;
  }>;

  proxyFetch(
    url: string,
    options?: { method?: string; body?: string; headers?: Record<string, string> }
  ): Promise<{
    ok: boolean;
    status: number;
    json: unknown;
    text: string;
  }>;

  // Discord RPC
  discordRPC: {
    updateActivity(details: string, state: string): void;
  };
};
