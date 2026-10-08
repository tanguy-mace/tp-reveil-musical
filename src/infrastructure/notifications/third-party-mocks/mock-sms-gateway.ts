export interface MockSmsLogEntry {
  gsmNumber: string;
  textMessage: string;
  dispatchedAt: Date;
}

/**
 * MOCK DE PASSERELLE SMS TÉLÉCOM (style Twilio / MessageBird / Infobip).
 *
 * NOTE DIDACTIQUE :
 * Interface volontairement différente et technique :
 * - Méthode 'transmitSms'
 * - Paramètres 'gsmNumber' et 'textMessage'
 * - Code retour numérique (style HTTP status code: 200, 503...)
 */
export class MockSmsGateway {
  private readonly logs: MockSmsLogEntry[] = [];
  public shouldFail = false;
  public failureStatusCode = 503;

  public async transmitSms(
    gsmNumber: string,
    textMessage: string
  ): Promise<number> {
    if (this.shouldFail) {
      return this.failureStatusCode;
    }

    if (!gsmNumber || gsmNumber.trim().length === 0) {
      return 400; // Bad request
    }

    this.logs.push({
      gsmNumber,
      textMessage,
      dispatchedAt: new Date(),
    });

    return 200; // Success
  }

  public getDispatchedSms(): readonly MockSmsLogEntry[] {
    return this.logs;
  }

  public clear(): void {
    this.logs.length = 0;
  }
}
