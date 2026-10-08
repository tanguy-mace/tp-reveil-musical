import { Container } from './container.js';
import { TOKENS } from './tokens.js';

// Ports
import type {
  MusicProvider,
  NotificationSender,
  UserProfileProvider,
  Logger,
} from '../domain/ports/index.js';

// Application
import { WakeUpUserUseCase } from '../application/use-cases/wake-up-user.use-case.js';

// Infrastructure
import {
  ItunesMusicProvider,
  MusicBrainzMusicProvider,
  LocalFallbackMusicProvider,
  CachedMusicProvider,
  FallbackMusicProvider,
  type FetchFunction,
} from '../infrastructure/music/index.js';

import {
  MockEmailService,
  MockSmsGateway,
  MockPushService,
  EmailNotificationAdapter,
  SmsNotificationAdapter,
  PushNotificationAdapter,
  NotificationChannelRegistry,
  ResilientNotificationSender,
} from '../infrastructure/notifications/index.js';

import { InMemoryUserRepository } from '../infrastructure/persistence/in-memory-user-repository.js';
import { ConsoleLogger } from '../infrastructure/logging/console-logger.js';

export interface AppContainerOptions {
  fetchFn?: FetchFunction;
  logger?: Logger;
  userRepository?: InMemoryUserRepository;
  itunesCacheTtlMs?: number;
  musicBrainzUserAgent?: string;
}

/**
 * COMPOSITION ROOT : configure et câble l'ensemble de l'application.
 *
 * RÔLE ARCHITECTURAL :
 * - C'est l'UNIQUE endroit où les classes concrètes sont instanciées et liées à leurs abstractions.
 * - Le reste de l'application (domaine, use case) ignore totalement les classes concrètes.
 * - Permet de remplacer facilement un composant sans réécrire l'application.
 */
export function createAppContainer(options: AppContainerOptions = {}): Container {
  const container = new Container();

  // 1. Logger
  container.bindSingleton<Logger>(
    TOKENS.Logger,
    () => options.logger ?? new ConsoleLogger()
  );

  // 2. Service interne de profil utilisateur
  container.bindSingleton<UserProfileProvider>(
    TOKENS.UserProfileProvider,
    () => options.userRepository ?? new InMemoryUserRepository()
  );

  // 3. Mocks techniques des canaux tiers
  container.bindSingleton<MockEmailService>(
    TOKENS.EmailService,
    () => new MockEmailService()
  );

  container.bindSingleton<MockSmsGateway>(
    TOKENS.SmsGateway,
    () => new MockSmsGateway()
  );

  container.bindSingleton<MockPushService>(
    TOKENS.PushService,
    () => new MockPushService()
  );

  // 4. Adaptateurs de notifications (Pattern Adapter)
  container.bindSingleton<EmailNotificationAdapter>(
    TOKENS.EmailAdapter,
    (c) => new EmailNotificationAdapter(c.resolve<MockEmailService>(TOKENS.EmailService))
  );

  container.bindSingleton<SmsNotificationAdapter>(
    TOKENS.SmsAdapter,
    (c) => new SmsNotificationAdapter(c.resolve<MockSmsGateway>(TOKENS.SmsGateway))
  );

  container.bindSingleton<PushNotificationAdapter>(
    TOKENS.PushAdapter,
    (c) => new PushNotificationAdapter(c.resolve<MockPushService>(TOKENS.PushService))
  );

  // 5. Registre de notification (Pattern Registry)
  container.bindSingleton<NotificationChannelRegistry>(
    TOKENS.NotificationRegistry,
    (c) => {
      const registry = new NotificationChannelRegistry();
      registry.register(c.resolve<EmailNotificationAdapter>(TOKENS.EmailAdapter));
      registry.register(c.resolve<SmsNotificationAdapter>(TOKENS.SmsAdapter));
      registry.register(c.resolve<PushNotificationAdapter>(TOKENS.PushAdapter));
      return registry;
    }
  );

  // 6. Expéditeur résilient multi-canal relié au port du domaine
  container.bindSingleton<NotificationSender>(
    TOKENS.NotificationSender,
    (c) =>
      new ResilientNotificationSender(
        c.resolve<NotificationChannelRegistry>(TOKENS.NotificationRegistry),
        'EMAIL',
        c.resolve<Logger>(TOKENS.Logger)
      )
  );

  // 7. Fournisseurs de musique individuels (Pattern Strategy)
  container.bindSingleton<ItunesMusicProvider>(
    TOKENS.ItunesProvider,
    () => new ItunesMusicProvider(options.fetchFn)
  );

  // Pattern Decorator : Décoration d'iTunes avec du cache pour le rate limiting (20 req/min)
  container.bindSingleton<CachedMusicProvider>(
    TOKENS.CachedItunesProvider,
    (c) =>
      new CachedMusicProvider(
        c.resolve<ItunesMusicProvider>(TOKENS.ItunesProvider),
        options.itunesCacheTtlMs ?? 60_000
      )
  );

  container.bindSingleton<MusicBrainzMusicProvider>(
    TOKENS.MusicBrainzProvider,
    () => new MusicBrainzMusicProvider(options.musicBrainzUserAgent, options.fetchFn)
  );

  container.bindSingleton<LocalFallbackMusicProvider>(
    TOKENS.LocalFallbackMusicProvider,
    () => new LocalFallbackMusicProvider()
  );

  // 8. Fournisseur composite résilient (Pattern Chain of Responsibility) relié au port du domaine
  // Ordre de priorité : iTunes Décoré de Cache -> MusicBrainz -> Fallback Local en dur
  container.bindSingleton<MusicProvider>(
    TOKENS.MusicProvider,
    (c) =>
      new FallbackMusicProvider(
        [
          c.resolve<CachedMusicProvider>(TOKENS.CachedItunesProvider),
          c.resolve<MusicBrainzMusicProvider>(TOKENS.MusicBrainzProvider),
          c.resolve<LocalFallbackMusicProvider>(TOKENS.LocalFallbackMusicProvider),
        ],
        c.resolve<Logger>(TOKENS.Logger)
      )
  );

  // 9. Cas d'usage applicatif (Pure DI : dépend uniquement des abstractions)
  container.bind<WakeUpUserUseCase>(
    TOKENS.WakeUpUserUseCase,
    (c) =>
      new WakeUpUserUseCase(
        c.resolve<UserProfileProvider>(TOKENS.UserProfileProvider),
        c.resolve<MusicProvider>(TOKENS.MusicProvider),
        c.resolve<NotificationSender>(TOKENS.NotificationSender),
        c.resolve<Logger>(TOKENS.Logger)
      )
  );

  return container;
}
