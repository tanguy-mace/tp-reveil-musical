import type { WakeUpNotification, NotificationDeliveryResult, NotificationChannelType } from '../models/notification.js';

/**
 * Port de sortie (Driven Port) pour l'envoi d'une notification de réveil.
 * Tous les canaux concrets (Email, SMS, Push, WhatsApp, etc.) doivent
 * être adaptés pour satisfaire ce contrat unique.
 */
export interface NotificationSender {
  /**
   * Type de canal géré par cet adaptateur (ex: 'EMAIL', 'SMS', 'PUSH', 'RESILIENT_COMPOSITE')
   */
  readonly channelType: NotificationChannelType | string;

  /**
   * Envoie la notification de réveil.
   * Ne doit pas lancer d'exception non contrôlée vers le domaine métier,
   * mais renvoyer un NotificationDeliveryResult indiquant le statut.
   */
  send(notification: WakeUpNotification): Promise<NotificationDeliveryResult>;
}
