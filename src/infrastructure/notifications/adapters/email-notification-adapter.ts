import type {
  WakeUpNotification,
  NotificationDeliveryResult,
} from '../../../domain/models/notification.js';
import type { NotificationSender } from '../../../domain/ports/notification-sender.port.js';
import { MockEmailService } from '../third-party-mocks/mock-email-service.js';

/**
 * PATTERN ADAPTER : EmailNotificationAdapter.
 *
 * RÔLE ARCHITECTURAL :
 * - Adapte l'interface propriétaire du MockEmailService (sendMail avec HTML et subject)
 *   vers l'interface standardisée 'NotificationSender' du domaine métier.
 * - Isole le métier de tout détail relatif au protocole de courrier électronique.
 */
export class EmailNotificationAdapter implements NotificationSender {
  public readonly channelType = 'EMAIL';
  private readonly emailService: MockEmailService;

  constructor(emailService: MockEmailService) {
    this.emailService = emailService;
  }

  public async send(
    notification: WakeUpNotification
  ): Promise<NotificationDeliveryResult> {
    const toEmail = notification.recipient.email;
    if (!toEmail) {
      return {
        success: false,
        channel: this.channelType,
        deliveredAt: new Date(),
        error: 'Adresse email manquante pour le destinataire.',
      };
    }

    const subject = `☀️ Réveil Musical du ${notification.dayOfWeek} (${notification.weather})`;
    const htmlBody = `
      <div style="font-family: sans-serif; padding: 16px;">
        <h2>${notification.greeting}</h2>
        <p>Votre morceau du jour : <strong>${notification.track.title}</strong> par <em>${notification.track.artist}</em></p>
        <p>Météo observée : ${notification.weather}</p>
        <p><small>Généré le ${notification.timestamp.toISOString()}</small></p>
      </div>
    `.trim();

    try {
      const result = await this.emailService.sendMail(toEmail, subject, htmlBody);
      return {
        success: result.status === 'SENT',
        channel: this.channelType,
        messageId: result.messageId,
        deliveredAt: new Date(),
        error: result.error,
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

