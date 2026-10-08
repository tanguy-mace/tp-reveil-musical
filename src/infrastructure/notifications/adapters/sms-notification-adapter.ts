import type {
  WakeUpNotification,
  NotificationDeliveryResult,
} from '../../../domain/models/notification.js';
import type { NotificationSender } from '../../../domain/ports/notification-sender.port.js';
import { MockSmsGateway } from '../third-party-mocks/mock-sms-gateway.js';

/**
 * PATTERN ADAPTER : SmsNotificationAdapter.
 *
 * RÔLE ARCHITECTURAL :
 * - Adapte la passerelle technique MockSmsGateway (transmitSms, return codes numériques)
 *   vers le port 'NotificationSender' du domaine métier.
 * - Formate le message pour un affichage SMS concis.
 */
export class SmsNotificationAdapter implements NotificationSender {
  public readonly channelType = 'SMS';
  private readonly smsGateway: MockSmsGateway;

  constructor(smsGateway: MockSmsGateway) {
    this.smsGateway = smsGateway;
  }

  public async send(
    notification: WakeUpNotification
  ): Promise<NotificationDeliveryResult> {
    const phone = notification.recipient.phone;
    if (!phone) {
      return {
        success: false,
        channel: this.channelType,
        deliveredAt: new Date(),
        error: 'Numéro de téléphone manquant pour le destinataire.',
      };
    }

    const textMessage = `[Réveil Musical] ${notification.greeting} Morceau: "${notification.track.title}" - ${notification.track.artist}`;

    try {
      const statusCode = await this.smsGateway.transmitSms(phone, textMessage);
      const isSuccess = statusCode >= 200 && statusCode < 300;

      return {
        success: isSuccess,
        channel: this.channelType,
        messageId: isSuccess ? `sms-ok-${Date.now()}` : undefined,
        deliveredAt: new Date(),
        error: isSuccess
          ? undefined
          : `Échec d'envoi SMS, passerelle a retourné le statut HTTP ${statusCode}`,
      };
    } catch (err) {
      return {
        success: false,
        channel: this.channelType,
        deliveredAt: new Date(),
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
}
