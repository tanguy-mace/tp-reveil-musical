import { describe, it, expect } from 'vitest';
import { WakeUpUserUseCase, UserNotFoundError } from '../../src/application/use-cases/wake-up-user.use-case.js';
import type {
  UserProfileProvider,
  MusicProvider,
  NotificationSender,
  Logger,
} from '../../src/domain/ports/index.js';
import type {
  UserWakeUpPreferences,
  Track,
  WakeUpNotification,
  NotificationDeliveryResult,
} from '../../src/domain/models/index.js';

describe('Application Use Case: WakeUpUserUseCase', () => {
  const dummyTrack: Track = {
    title: 'Here Comes the Sun',
    artist: 'The Beatles',
    source: 'mock-provider',
  };

  const dummyFallbackTrack: Track = {
    title: 'Bohemian Rhapsody',
    artist: 'Queen',
    source: 'mock-provider',
  };

  const sampleUser: UserWakeUpPreferences = {
    userId: 'user-123',
    weatherTracks: {
      SOLEIL: 'Here Comes the Sun',
      PLUIE: 'Singin in the Rain',
    },
    fallbackTrack: 'Bohemian Rhapsody',
    preferredChannel: 'EMAIL',
    recipientInfo: {
      userId: 'user-123',
      email: 'user@example.com',
      phone: '+33600000000',
    },
  };

  const mockLogger: Logger = {
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {},
  };

  it('déclenche le réveil avec le morceau météo associé et le canal préféré', async () => {
    let capturedNotification: WakeUpNotification | null = null;

    const userProfileProvider: UserProfileProvider = {
      getUserPreferences: async (id) => (id === 'user-123' ? sampleUser : null),
    };

    const musicProvider: MusicProvider = {
      name: 'test-music-provider',
      searchTrack: async (query) => {
        if (query === 'Here Comes the Sun') return dummyTrack;
        return null;
      },
    };

    const notificationSender: NotificationSender = {
      channelType: 'EMAIL',
      send: async (notif) => {
        capturedNotification = notif;
        return {
          success: true,
          channel: 'EMAIL',
          messageId: 'msg-456',
          deliveredAt: new Date(),
        };
      },
    };

    const useCase = new WakeUpUserUseCase(
      userProfileProvider,
      musicProvider,
      notificationSender,
      mockLogger
    );

    const result = await useCase.execute({
      userId: 'user-123',
      dayOfWeek: 'LUNDI',
      weather: 'SOLEIL',
    });

    expect(result.userId).toBe('user-123');
    expect(result.dayOfWeek).toBe('LUNDI');
    expect(result.weather).toBe('SOLEIL');
    expect(result.track.title).toBe('Here Comes the Sun');
    expect(result.isDegradedMusicMode).toBe(false);
    expect(result.channelUsed).toBe('EMAIL');
    expect(capturedNotification).not.toBeNull();
    expect(capturedNotification?.preferredChannel).toBe('EMAIL');
    expect(capturedNotification?.greeting).toContain('lundi');
    expect(capturedNotification?.greeting).toContain('soleil');
  });

  it('bascule sur le morceau de secours si la météo courante n’a pas de morceau dédié', async () => {
    const userProfileProvider: UserProfileProvider = {
      getUserPreferences: async () => sampleUser,
    };

    const musicProvider: MusicProvider = {
      name: 'test-music-provider',
      searchTrack: async (query) => {
        if (query === 'Bohemian Rhapsody') return dummyFallbackTrack;
        return null;
      },
    };

    const notificationSender: NotificationSender = {
      channelType: 'EMAIL',
      send: async () => ({
        success: true,
        channel: 'EMAIL',
        deliveredAt: new Date(),
      }),
    };

    const useCase = new WakeUpUserUseCase(
      userProfileProvider,
      musicProvider,
      notificationSender,
      mockLogger
    );

    // NEIGE n'est pas dans weatherTracks de sampleUser
    const result = await useCase.execute({
      userId: 'user-123',
      dayOfWeek: 'MERCREDI',
      weather: 'NEIGE',
    });

    expect(result.requestedTrackQuery).toBe('Bohemian Rhapsody');
    expect(result.track.title).toBe('Bohemian Rhapsody');
    // Le mode dégradé musique est marqué car la météo n'était pas couverte
    expect(result.isDegradedMusicMode).toBe(true);
  });

  it('lève une erreur UserNotFoundError si l’utilisateur est introuvable', async () => {
    const userProfileProvider: UserProfileProvider = {
      getUserPreferences: async () => null,
    };

    const musicProvider: MusicProvider = {
      name: 'test',
      searchTrack: async () => null,
    };

    const notificationSender: NotificationSender = {
      channelType: 'EMAIL',
      send: async () => ({} as NotificationDeliveryResult),
    };

    const useCase = new WakeUpUserUseCase(
      userProfileProvider,
      musicProvider,
      notificationSender,
      mockLogger
    );

    await expect(
      useCase.execute({
        userId: 'inconnu-999',
        dayOfWeek: 'JEUDI',
        weather: 'SOLEIL',
      })
    ).rejects.toThrow(UserNotFoundError);
  });

  it('utilise le filet de sécurité du domaine si le provider échoue pour tous les morceaux', async () => {
    const userProfileProvider: UserProfileProvider = {
      getUserPreferences: async () => sampleUser,
    };

    const musicProvider: MusicProvider = {
      name: 'panne-provider',
      searchTrack: async () => {
        throw new Error('Erreur réseau critique');
      },
    };

    const notificationSender: NotificationSender = {
      channelType: 'EMAIL',
      send: async () => ({
        success: true,
        channel: 'EMAIL',
        deliveredAt: new Date(),
      }),
    };

    const useCase = new WakeUpUserUseCase(
      userProfileProvider,
      musicProvider,
      notificationSender,
      mockLogger
    );

    const result = await useCase.execute({
      userId: 'user-123',
      dayOfWeek: 'MARDI',
      weather: 'SOLEIL',
    });

    // Aucun silence : le filet de sécurité produit un Track valide
    expect(result.track).toBeDefined();
    expect(result.track.title).toBe(sampleUser.fallbackTrack);
    expect(result.track.source).toBe('domain-safety-net');
  });
});
