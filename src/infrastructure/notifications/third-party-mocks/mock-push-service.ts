export interface PushPayload {
  notification: {
    title: string;
    body: string;
  };
  data?: Record<string, string>;
}

export interface PushResponse {
  success: boolean;
  multicastId?: string;
  errorMessage?: string;
}

export interface MockPushLogEntry {
  deviceToken: string;
  payload: PushPayload;
  sentAt: Date;
}

/**
 * MOCK DE SERVICE DE NOTIFICATIONS PUSH MOBILE (style Firebase FCM / APNs).
 *
 * NOTE DIDACTIQUE :
 * Interface volontairement imbriquée et différente :
 * - Méthode 'dispatchPush'
 * - Paramètre objet avec 'notification.title', 'notification.body', 'data'
 * - Retour objet avec 'multicastId' et 'success: boolean'
 */
export class MockPushService {
  private readonly logs: MockPushLogEntry[] = [];
  public shouldFail = false;
  public failureMessage = 'Token expiré ou APNs injoignable';

  public async dispatchPush(
    deviceToken: string,
    payload: PushPayload
  ): Promise<PushResponse> {
    if (this.shouldFail) {
      return {
        success: false,
        errorMessage: this.failureMessage,
      };
    }

    if (!deviceToken || deviceToken.trim().length === 0) {
      return {
        success: false,
        errorMessage: 'Device token manquant ou invalide',
      };
    }

    const multicastId = `push-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    this.logs.push({
      deviceToken,
      payload,
      sentAt: new Date(),
    });

    return {
      success: true,
      multicastId,
    };
  }

  public getDispatchedPushes(): readonly MockPushLogEntry[] {
    return this.logs;
  }

  public clear(): void {
    this.logs.length = 0;
  }
}
