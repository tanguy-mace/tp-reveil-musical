export interface EmailSendResult {
  messageId: string;
  status: 'SENT' | 'FAILED';
  error?: string;
}

export interface MockEmailLogEntry {
  toEmail: string;
  subject: string;
  htmlContent: string;
  from?: string;
  sentAt: Date;
}

/**
 * MOCK DE SERVICE EMAIL TIERS (style Sendgrid / Mailgun / AWS SES).
 *
 * NOTE DIDACTIQUE :
 * Interface volontairement spécifique et hétérogène (signature sendMail avec htmlContent et subject),
 * ne correspondant pas à l'interface commune du domaine.
 */
export class MockEmailService {
  private readonly logs: MockEmailLogEntry[] = [];
  public shouldFail = false;
  public failureMessage = 'Erreur SMTP simulée : connexion refusée';

  public async sendMail(
    toEmail: string,
    subject: string,
    htmlContent: string,
    from: string = 'reveil@reveil-musical.example.com'
  ): Promise<EmailSendResult> {
    if (this.shouldFail) {
      return {
        messageId: '',
        status: 'FAILED',
        error: this.failureMessage,
      };
    }

    const messageId = `email-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    this.logs.push({
      toEmail,
      subject,
      htmlContent,
      from,
      sentAt: new Date(),
    });

    return {
      messageId,
      status: 'SENT',
    };
  }

  public getSentEmails(): readonly MockEmailLogEntry[] {
    return this.logs;
  }

  public clear(): void {
    this.logs.length = 0;
  }
}

