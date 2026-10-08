import type { WeatherType } from './weather.js';
import type { NotificationChannelType, RecipientInfo } from './notification.js';

/**
 * Préférences de réveil d'un utilisateur, stockées en interne.
 * Définit :
 * - Le morceau souhaité pour chaque météo
 * - Le morceau de secours pour les cas non couverts
 * - Le canal préféré (EMAIL, SMS, PUSH...)
 * - Les coordonnées de contact
 */
export interface UserWakeUpPreferences {
  readonly userId: string;
  readonly weatherTracks: Partial<Record<WeatherType, string>>;
  readonly fallbackTrack: string;
  readonly preferredChannel: NotificationChannelType;
  readonly recipientInfo: RecipientInfo;
}

