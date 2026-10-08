import type {
  WakeUpNotification,
  NotificationDeliveryResult,
} from '../../../domain/models/notification.js';
import type { NotificationSender } from '../../../domain/ports/notification-sender.port.js';
import { MockPushService } from '../third-party-mocks/mock-push-service.js';

/**
 * PATTERN ADAPTER : PushNotificationAdapter.
 *
 * RÔLE ARCHITECTURAL :
 * - Adapte le service technique de notifications mobiles MockPushService (payload imbriqué)
 *   vers le port 'NotificationSender' du domaine métier.
 */
export class PushNotificationAdapter implements NotificationSender {
  public readonly channelType = 'PUSH';
  private readonly pushService: MockPushService;

  constructor(pushService: MockPushService) {
    this.pushService = pushService;
  }

  public async send(
    notification: WakeUpNotification
  ): Promise<NotificationDeliveryResult> {
    const token = notification.recipient.deviceToken;
    if (!token) {
      return {
        success: false,
        channel: this.channelType,
        deliveredAt: new Date(),
        error: 'Token d’appareil push manquant pour le destinataire.',
      };
    }

    const payload = {
      notification: {
        title: `⏰ Réveil Musical (${notification.weather})`,
        body: `${notification.track.title} - ${notification.track.artist}`,
      },
      data: {
        trackTitle: notification.track.title,
        trackArtist: notification.track.artist,
        weather: notification.weather,
        dayOfWeek: notification.dayOfWeek,
      },
    };

    try {
      const response = await this.pushService.dispatchPush(token, payload);

      return {
        success: response.success,
        channel: this.channelType,
        messageId: response.multicastId,
        deliveredAt: new Date(),
        error: response.errorMessage,
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

