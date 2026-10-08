/**
 * Tokens d'injection pour le conteneur IoC.
 * L'utilisation de Symbols garantit l'unicité et le découplage des identifiants d'injection.
 */
export const TOKENS = {
  // Ports du Domaine
  UserProfileProvider: Symbol('UserProfileProvider'),
  MusicProvider: Symbol('MusicProvider'),
  NotificationSender: Symbol('NotificationSender'),
  Logger: Symbol('Logger'),

  // Services et Adaptateurs d'Infrastructure
  EmailService: Symbol('EmailService'),
  SmsGateway: Symbol('SmsGateway'),
  PushService: Symbol('PushService'),
  EmailAdapter: Symbol('EmailAdapter'),
  SmsAdapter: Symbol('SmsAdapter'),
  PushAdapter: Symbol('PushAdapter'),
  NotificationRegistry: Symbol('NotificationRegistry'),

  // Fournisseurs Musicaux
  ItunesProvider: Symbol('ItunesProvider'),
  CachedItunesProvider: Symbol('CachedItunesProvider'),
  MusicBrainzProvider: Symbol('MusicBrainzProvider'),
  LocalFallbackMusicProvider: Symbol('LocalFallbackMusicProvider'),
  CompositeMusicProvider: Symbol('CompositeMusicProvider'),

  // Couche Applicative
  WakeUpUserUseCase: Symbol('WakeUpUserUseCase'),
} as const;
