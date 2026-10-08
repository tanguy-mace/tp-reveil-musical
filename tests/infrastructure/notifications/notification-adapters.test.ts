import { describe, it, expect } from 'vitest';
import {
  MockEmailService,
  MockSmsGateway,
  MockPushService,
  EmailNotificationAdapter,
  SmsNotificationAdapter,
  PushNotificationAdapter,
  NotificationChannelRegistry,
  ResilientNotificationSender,
} from '../../../src/infrastructure/notifications/index.js';
import type { WakeUpNotification } from '../../../src/domain/models/index.js';
import { MemoryLogger } from '../../../src/infrastructure/logging/console-logger.js';

describe('Design Pattern Adapter & Registry: Notifications', () => {
  const sampleNotification: WakeUpNotification = {
    recipient: {
      userId: 'user-test',
      email: 'test@example.com',
      phone: '+33611223344',
      deviceToken: 'token-device-xyz',
    },
    preferredChannel: 'EMAIL',
    track: {
      title: 'Walking on Sunshine',
      artist: 'Katrina and the Waves',
      source: 'test-source',
    },
    weather: 'SOLEIL',
    dayOfWeek: 'VENDREDI',
    greeting: 'Bonjour ! Réveillez-vous en musique.',
    timestamp: new Date(),
  };

  describe('EmailNotificationAdapter (Pattern Adapter)', () => {
    it('adapte et expédie un email via MockEmailService', async () => {
      const mockEmail = new MockEmailService();
      const adapter = new EmailNotificationAdapter(mockEmail);

      const result = await adapter.send(sampleNotification);

      expect(result.success).toBe(true);
      expect(result.channel).toBe('EMAIL');
      expect(result.messageId).toContain('email-');

      const sentEmails = mockEmail.getSentEmails();
      expect(sentEmails).toHaveLength(1);
      expect(sentEmails[0]?.toEmail).toBe('test@example.com');
      expect(sentEmails[0]?.htmlContent).toContain('Walking on Sunshine');
    });

    it('retourne un échec propre si l’adresse email est manquante', async () => {
      const mockEmail = new MockEmailService();
      const adapter = new EmailNotificationAdapter(mockEmail);

      const notificationWithoutEmail: WakeUpNotification = {
        ...sampleNotification,
        recipient: { userId: 'user-no-mail' },
      };

      const result = await adapter.send(notificationWithoutEmail);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Adresse email manquante');
    });

    it('gère l’échec du service email sans lever d’exception non gérée', async () => {
      const mockEmail = new MockEmailService();
      mockEmail.shouldFail = true;
      const adapter = new EmailNotificationAdapter(mockEmail);

      const result = await adapter.send(sampleNotification);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Erreur SMTP');
    });
  });

  describe('SmsNotificationAdapter (Pattern Adapter)', () => {
    it('adapte l’envoi vers MockSmsGateway avec signature gsmNumber/textMessage', async () => {
      const mockSms = new MockSmsGateway();
      const adapter = new SmsNotificationAdapter(mockSms);

      const result = await adapter.send(sampleNotification);

      expect(result.success).toBe(true);
      expect(result.channel).toBe('SMS');

      const sentSms = mockSms.getDispatchedSms();
      expect(sentSms).toHaveLength(1);
      expect(sentSms[0]?.gsmNumber).toBe('+33611223344');
      expect(sentSms[0]?.textMessage).toContain('Walking on Sunshine');
    });

    it('gère le code d’erreur HTTP renvoyé par la passerelle SMS', async () => {
      const mockSms = new MockSmsGateway();
      mockSms.shouldFail = true;
      mockSms.failureStatusCode = 503;
      const adapter = new SmsNotificationAdapter(mockSms);

      const result = await adapter.send(sampleNotification);
      expect(result.success).toBe(false);
      expect(result.error).toContain('503');
    });

    it('retourne un échec si le numéro de téléphone est manquant', async () => {
      const mockSms = new MockSmsGateway();
      const adapter = new SmsNotificationAdapter(mockSms);

      const result = await adapter.send({
        ...sampleNotification,
        recipient: { userId: 'no-phone' },
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Numéro de téléphone manquant');
    });
  });

  describe('PushNotificationAdapter (Pattern Adapter)', () => {
    it('adapte l’envoi vers MockPushService avec payload complexe imbriqué', async () => {
      const mockPush = new MockPushService();
      const adapter = new PushNotificationAdapter(mockPush);

      const result = await adapter.send(sampleNotification);

      expect(result.success).toBe(true);
      expect(result.channel).toBe('PUSH');

      const sentPushes = mockPush.getDispatchedPushes();
      expect(sentPushes).toHaveLength(1);
      expect(sentPushes[0]?.deviceToken).toBe('token-device-xyz');
      expect(sentPushes[0]?.payload.notification.body).toContain('Walking on Sunshine');
    });

    it('retourne un échec si le token de notification est manquant', async () => {
      const mockPush = new MockPushService();
      const adapter = new PushNotificationAdapter(mockPush);

      const result = await adapter.send({
        ...sampleNotification,
        recipient: { userId: 'no-token' },
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Token d’appareil push manquant');
    });

    it('gère l’erreur si le service push échoue', async () => {
      const mockPush = new MockPushService();
      mockPush.shouldFail = true;
      const adapter = new PushNotificationAdapter(mockPush);

      const result = await adapter.send(sampleNotification);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Token expiré');
    });
  });

  describe('NotificationChannelRegistry (Pattern Registry)', () => {
    it('permet l’enregistrement dynamique et la résolution par canal', () => {
      const emailAdapter = new EmailNotificationAdapter(new MockEmailService());
      const smsAdapter = new SmsNotificationAdapter(new MockSmsGateway());

      const registry = new NotificationChannelRegistry([emailAdapter, smsAdapter]);

      expect(registry.get('EMAIL')).toBe(emailAdapter);
      expect(registry.get('SMS')).toBe(smsAdapter);
      expect(registry.get('PUSH')).toBeUndefined();

      expect(() => registry.getRequired('UNKNOWN')).toThrow(
        /Aucun adaptateur de notification enregistré/
      );
    });
  });

  describe('ResilientNotificationSender (Résilience & Garantie de non-silence)', () => {
    it('utilise le canal préféré si celui-ci fonctionne', async () => {
      const mockEmail = new MockEmailService();
      const mockSms = new MockSmsGateway();
      const registry = new NotificationChannelRegistry([
        new EmailNotificationAdapter(mockEmail),
        new SmsNotificationAdapter(mockSms),
      ]);

      const resilientSender = new ResilientNotificationSender(registry, 'EMAIL');
      const result = await resilientSender.send({
        ...sampleNotification,
        preferredChannel: 'SMS',
      });

      expect(result.success).toBe(true);
      expect(result.channel).toBe('SMS');
      expect(mockSms.getDispatchedSms()).toHaveLength(1);
      expect(mockEmail.getSentEmails()).toHaveLength(0);
    });

    it('bascule sur le canal de secours (EMAIL) si le canal préféré (SMS) tombe en panne', async () => {
      const logger = new MemoryLogger();
      const mockEmail = new MockEmailService();
      const failingSms = new MockSmsGateway();
      failingSms.shouldFail = true;

      const registry = new NotificationChannelRegistry([
        new EmailNotificationAdapter(mockEmail),
        new SmsNotificationAdapter(failingSms),
      ]);

      const resilientSender = new ResilientNotificationSender(registry, 'EMAIL', logger);
      const result = await resilientSender.send({
        ...sampleNotification,
        preferredChannel: 'SMS',
      });

      // Le réveil est envoyé quand même !
      expect(result.success).toBe(true);
      expect(result.channel).toBe('EMAIL');
      expect(mockEmail.getSentEmails()).toHaveLength(1);
      expect(logger.entries.some((e) => e.level === 'warn')).toBe(true);
    });

    it('bascule sur le canal d’urgence si TOUS les canaux échouent afin d’éviter le silence', async () => {
      const logger = new MemoryLogger();
      const failingEmail = new MockEmailService();
      failingEmail.shouldFail = true;

      const failingSms = new MockSmsGateway();
      failingSms.shouldFail = true;

      const registry = new NotificationChannelRegistry([
        new EmailNotificationAdapter(failingEmail),
        new SmsNotificationAdapter(failingSms),
      ]);

      const resilientSender = new ResilientNotificationSender(registry, 'EMAIL', logger);
      const result = await resilientSender.send({
        ...sampleNotification,
        preferredChannel: 'SMS',
      });

      expect(result.success).toBe(true);
      expect(result.channel).toBe('EMERGENCY_SYSTEM_LOG');
      expect(logger.entries.some((e) => e.level === 'error')).toBe(true);
    });
  });
});
