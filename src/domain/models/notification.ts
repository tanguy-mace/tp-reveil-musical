import type { Track } from './track.js';
import type { WeatherType } from './weather.js';
import type { DayOfWeek } from './day-of-week.js';

/**
 * Types de canaux de notification supportés par le système.
 * Facilement extensible (ex: 'WHATSAPP', 'VOICE_CALL' dans le futur).
 */
export type NotificationChannelType = 'EMAIL' | 'SMS' | 'PUSH';

/**
 * Informations de contact de l'utilisateur requises pour l'envoi.
 */
export interface RecipientInfo {
  readonly userId: string;
  readonly displayName?: string;
  readonly email?: string;
  readonly phone?: string;
  readonly deviceToken?: string;
}

/**
 * Message métier de réveil musical préparé par le Use Case.
 */
export interface WakeUpNotification {
  readonly recipient: RecipientInfo;
  readonly preferredChannel: NotificationChannelType;
  readonly track: Track;
  readonly weather: WeatherType;
  readonly dayOfWeek: DayOfWeek;
  readonly greeting: string;
  readonly timestamp: Date;
}

/**
 * Résultat d'une tentative d'envoi de notification.
 */
export interface NotificationDeliveryResult {
  readonly success: boolean;
  readonly channel: NotificationChannelType | string;
  readonly messageId?: string;
  readonly deliveredAt: Date;
  readonly error?: string;
}
