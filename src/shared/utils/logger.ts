/**
 * 日志工具类
 */
class Logger {
  private prefix: string;

  constructor(prefix: string) {
    this.prefix = prefix;
  }

  info(message: string, ...args: unknown[]): void {
    console.log(`[${this.prefix}] ℹ️ ${message}`, ...args);
  }

  warn(message: string, ...args: unknown[]): void {
    console.warn(`[${this.prefix}] ⚠️ ${message}`, ...args);
  }

  error(message: string, ...args: unknown[]): void {
    console.error(`[${this.prefix}] ❌ ${message}`, ...args);
  }

  debug(message: string, ...args: unknown[]): void {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[${this.prefix}] 🐛 ${message}`, ...args);
    }
  }

  success(message: string, ...args: unknown[]): void {
    console.log(`[${this.prefix}] ✅ ${message}`, ...args);
  }
}

export const createLogger = (prefix: string): Logger => {
  return new Logger(prefix);
};

export default Logger;
