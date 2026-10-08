import type { NotificationSender } from '../../domain/ports/notification-sender.port.js';
import type { NotificationChannelType } from '../../domain/models/notification.js';

/**
 * PATTERN FACTORY / REGISTRY : NotificationChannelRegistry.
 *
 * RÔLE ARCHITECTURAL :
 * - Permet d'enregistrer et de résoudre dynamiquement les adaptateurs de notification.
 * - Respect du principe Ouvert/Fermé (OCP) : l'ajout d'un nouveau canal (ex: WhatsApp, Appel vocal)
 *   se fait par simple enregistrement sans aucune modification du code métier ou des autres adaptateurs.
 */
export class NotificationChannelRegistry {
  private readonly senders = new Map<string, NotificationSender>();

  constructor(initialSenders: NotificationSender[] = []) {
    for (const sender of initialSenders) {
      this.register(sender);
    }
  }

  public register(sender: NotificationSender): this {
    this.senders.set(sender.channelType.toUpperCase(), sender);
    return this;
  }

  public get(channelType: NotificationChannelType | string): NotificationSender | undefined {
    return this.senders.get(channelType.toUpperCase());
  }

  public getRequired(channelType: NotificationChannelType | string): NotificationSender {
    const sender = this.get(channelType);
    if (!sender) {
      throw new Error(
        `Aucun adaptateur de notification enregistré pour le canal: "${channelType}". Canaux disponibles: ${this.getAvailableChannels().join(', ')}`
      );
    }
    return sender;
  }

  public getAvailableChannels(): string[] {
    return Array.from(this.senders.keys());
  }
}

