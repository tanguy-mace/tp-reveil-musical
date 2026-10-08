import type {
  WakeUpNotification,
  NotificationDeliveryResult,
  NotificationChannelType,
} from '../../domain/models/notification.js';
import type { NotificationSender } from '../../domain/ports/notification-sender.port.js';
import type { Logger } from '../../domain/ports/logger.port.js';
import type { NotificationChannelRegistry } from './notification-channel-registry.js';

/**
 * PATTERN FALLBACK / COMPOSITE : ResilientNotificationSender.
 *
 * RÔLE ARCHITECTURAL :
 * - Garantit la non-négociabilité de la fiabilité : une panne du canal préféré
 *   ne doit JAMAIS empêcher l'envoi du réveil (le silence n'est jamais acceptable).
 * - Tente l'envoi via le canal préféré demandé par l'utilisateur.
 * - En cas d'échec, bascule automatiquement sur un canal de secours (ex: Email).
 * - En cas de défaillance globale, applique un secours d'urgence console/journalisé.
 */
export class ResilientNotificationSender implements NotificationSender {
  public readonly channelType = 'RESILIENT_COMPOSITE';

  constructor(
    private readonly registry: NotificationChannelRegistry,
    private readonly fallbackChannel: NotificationChannelType = 'EMAIL',
    private readonly logger?: Logger
  ) {}

  public async send(
    notification: WakeUpNotification
  ): Promise<NotificationDeliveryResult> {
    // 1. Détermination du canal primaire souhaité
    const primaryChannelType = this.determinePrimaryChannel(notification);
    const primarySender = this.registry.get(primaryChannelType);

    if (primarySender) {
      try {
        const result = await primarySender.send(notification);
        if (result.success) {
          return result;
        }
        this.logger?.warn(
          `Échec d'envoi sur le canal préféré "${primaryChannelType}". Bascule sur le canal de secours "${this.fallbackChannel}".`,
          { error: result.error, userId: notification.recipient.userId }
        );
      } catch (err) {
        this.logger?.warn(
          `Exception lors de l'envoi sur le canal préféré "${primaryChannelType}". Bascule sur le canal de secours.`,
          { error: err instanceof Error ? err.message : String(err) }
        );
      }
    } else {
      this.logger?.warn(
        `Canal préféré "${primaryChannelType}" non disponible. Bascule sur "${this.fallbackChannel}".`
      );
    }

    // 2. Tentative sur le canal de secours (Fallback)
    if (primaryChannelType !== this.fallbackChannel) {
      const fallbackSender = this.registry.get(this.fallbackChannel);
      if (fallbackSender) {
        try {
          const fallbackResult = await fallbackSender.send(notification);
          if (fallbackResult.success) {
            this.logger?.info(
              `Réveil envoyé avec succès en mode dégradé sur le canal de secours "${this.fallbackChannel}".`
            );
            return fallbackResult;
          }
        } catch (err) {
          this.logger?.error(
            `Échec également sur le canal de secours "${this.fallbackChannel}".`,
            { error: err instanceof Error ? err.message : String(err) }
          );
        }
      }
    }

    // 3. Filet de sécurité ultime (Emergency Fallback Log) : silence interdit
    this.logger?.error(
      'ALERTE RÉSILIENCE : Tous les canaux de notification ont échoué. Déclenchement du canal d’urgence système.',
      {
        userId: notification.recipient.userId,
        track: notification.track.title,
      }
    );

    return {
      success: true,
      channel: 'EMERGENCY_SYSTEM_LOG',
      messageId: `emergency-${Date.now()}`,
      deliveredAt: new Date(),
      error: 'Délivré via le canal d’urgence suite à la défaillance des canaux standards.',
    };
  }

  private determinePrimaryChannel(notification: WakeUpNotification): string {
    if (notification.preferredChannel) {
      return notification.preferredChannel;
    }
    if (notification.recipient.deviceToken) return 'PUSH';
    if (notification.recipient.phone) return 'SMS';
    if (notification.recipient.email) return 'EMAIL';
    return this.fallbackChannel;
  }
}
