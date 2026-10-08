import type { Logger } from '../../domain/ports/logger.port.js';

/**
 * Implémentation concrète de Logger écrivant dans la console avec horodatage.
 */
export class ConsoleLogger implements Logger {
  public info(message: string, context?: Record<string, unknown>): void {
    console.log(`[INFO] [${new Date().toISOString()}] ${message}`, context ?? '');
  }

  public warn(message: string, context?: Record<string, unknown>): void {
    console.warn(`[WARN] [${new Date().toISOString()}] ${message}`, context ?? '');
  }

  public error(message: string, context?: Record<string, unknown>): void {
    console.error(`[ERROR] [${new Date().toISOString()}] ${message}`, context ?? '');
  }

  public debug(message: string, context?: Record<string, unknown>): void {
    // Mode debug silencieux ou affiché
    if (process.env.DEBUG) {
      console.debug(`[DEBUG] [${new Date().toISOString()}] ${message}`, context ?? '');
    }
  }
}

export interface MemoryLogEntry {
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  context?: Record<string, unknown>;
  timestamp: Date;
}

/**
 * Implémentation concrète de Logger conservant les logs en mémoire pour les assertions de tests.
 */
export class MemoryLogger implements Logger {
  public readonly entries: MemoryLogEntry[] = [];

  public info(message: string, context?: Record<string, unknown>): void {
    this.entries.push({ level: 'info', message, context, timestamp: new Date() });
  }

  public warn(message: string, context?: Record<string, unknown>): void {
    this.entries.push({ level: 'warn', message, context, timestamp: new Date() });
  }

  public error(message: string, context?: Record<string, unknown>): void {
    this.entries.push({ level: 'error', message, context, timestamp: new Date() });
  }

  public debug(message: string, context?: Record<string, unknown>): void {
    this.entries.push({ level: 'debug', message, context, timestamp: new Date() });
  }

  public clear(): void {
    this.entries.length = 0;
  }
}
