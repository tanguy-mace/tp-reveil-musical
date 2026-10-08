import type { Track } from './track.js';
import type { WeatherType } from './weather.js';
import type { DayOfWeek } from './day-of-week.js';
import type { NotificationDeliveryResult } from './notification.js';

/**
 * Résultat complet d'un cycle de réveil musical.
 * Permet d'auditer l'exécution et de vérifier si un mode dégradé a été employé.
 */
export interface WakeUpExecutionResult {
  readonly userId: string;
  readonly dayOfWeek: DayOfWeek;
  readonly weather: WeatherType;
  readonly track: Track;
  readonly musicSource: string;
  readonly isDegradedMusicMode: boolean;
  readonly requestedTrackQuery: string;
  readonly channelUsed: string;
  readonly isDegradedNotificationMode: boolean;
  readonly delivery: NotificationDeliveryResult;
  readonly executedAt: Date;
}
