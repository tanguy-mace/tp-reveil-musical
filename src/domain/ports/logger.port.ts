/**
 * Port de sortie (Driven Port) pour la journalisation.
 * Permet d'isoler le métier et les adaptateurs de tout mécanisme concret (console, Winston, Pino, etc.).
 */
export interface Logger {
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
  debug(message: string, context?: Record<string, unknown>): void;
}
