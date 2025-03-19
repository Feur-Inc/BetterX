import { Name } from '../utils/constants';

/**
 * BetterX Logger - Enhanced console logging with CSS styling
 */

interface LogStyles {
  base: string;
  info: string;
  success: string;
  warn: string;
  error: string;
  debug: string;
  plugin: string;
  theme: string;
  [key: string]: string;
}

const STYLES: LogStyles = {
  base: 'font-weight: bold; padding: 2px 5px; border-radius: 3px;',
  info: 'background: #0288d1; color: white;',
  success: 'background: #388e3c; color: white;',
  warn: 'background: #f57c00; color: white;',
  error: 'background: #d32f2f; color: white;',
  debug: 'background: #7b1fa2; color: white;',
  plugin: 'background: #303f9f; color: white;',
  theme: 'background: #6a1b9a; color: white;',
};

type LogLevel = 'INFO' | 'SUCCESS' | 'WARN' | 'ERROR' | 'DEBUG' | 'PLUGIN' | 'THEME';

/**
 * Styled logger for BetterX with different log levels
 */
class Logger {
  private prefix: string;

  constructor(prefix: string = Name) {
    this.prefix = prefix;
  }

  /**
   * Creates a namespaced logger for a specific component
   * @param namespace - The namespace for this logger instance
   * @returns A new logger instance with the specified namespace
   */
  scope(namespace: string): Logger {
    return new Logger(`${this.prefix}:${namespace}`);
  }

  /**
   * Format and log a message with the specified style
   * @param level - The log level (info, success, error, etc.)
   * @param style - CSS style string
   * @param args - Arguments to log
   */
  protected _log(level: LogLevel, style: string, ...args: any[]): void {
    const hasObjects = args.some(arg => typeof arg === 'object' && arg !== null);
    
    if (hasObjects) {
      console.groupCollapsed(
        `%c ${this.prefix} %c ${level} `,
        `${STYLES.base} ${style}`,
        'background: #424242; color: white; font-weight: bold; padding: 2px 5px; border-radius: 3px;'
      );
      args.forEach(arg => console.log(arg));
      console.groupEnd();
    } else {
      console.log(
        `%c ${this.prefix} %c ${level} %c ${args.join(' ')}`,
        `${STYLES.base} ${style}`,
        'background: #424242; color: white; font-weight: bold; padding: 2px 5px; border-radius: 3px;',
        'color: inherit; font-weight: normal;'
      );
    }
  }

  info(...args: any[]): void {
    this._log('INFO', STYLES.info, ...args);
  }

  success(...args: any[]): void {
    this._log('SUCCESS', STYLES.success, ...args);
  }

  warn(...args: any[]): void {
    this._log('WARN', STYLES.warn, ...args);
  }

  error(...args: any[]): void {
    this._log('ERROR', STYLES.error, ...args);
  }

  debug(...args: any[]): void {
    this._log('DEBUG', STYLES.debug, ...args);
  }

  plugin(pluginName: string, ...args: any[]): void {
    const logger = this.scope(`Plugin:${pluginName}`);
    logger._log('PLUGIN', STYLES.plugin, ...args);
  }

  theme(themeName: string, ...args: any[]): void {
    const logger = this.scope(`Theme:${themeName}`);
    logger._log('THEME', STYLES.theme, ...args);
  }
}

// Create a default instance
const logger = new Logger();

export { Logger, logger };
