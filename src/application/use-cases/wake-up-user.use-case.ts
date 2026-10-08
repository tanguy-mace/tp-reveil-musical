import type {
  DayOfWeek,
  WeatherType,
  Track,
  WakeUpNotification,
  WakeUpExecutionResult,
  UserWakeUpPreferences,
} from '../../domain/models/index.js';
import type {
  MusicProvider,
  NotificationSender,
  UserProfileProvider,
  Logger,
} from '../../domain/ports/index.js';

export interface WakeUpRequest {
  readonly userId: string;
  readonly dayOfWeek: DayOfWeek;
  readonly weather: WeatherType;
}

export class UserNotFoundError extends Error {
  constructor(userId: string) {
    super(`Utilisateur introuvable avec l'identifiant: "${userId}"`);
    this.name = 'UserNotFoundError';
  }
}

/**
 * Cas d'usage : Déclenchement du réveil musical pour un utilisateur.
 *
 * RESPECT STRICT DES EXIGENCES D'ARCHITECTURE :
 * 1. Isolation & Faible Couplage :
 *    - Cette classe ne connaît AUCUN détail technique d'un fournisseur musical ou d'un canal particulier.
 *    - Elle dialogue exclusivement au travers des Driven Ports abstraits.
 * 2. Inversion de Contrôle (IoC) & Injection de Dépendances (DI) :
 *    - AUCUN opérateur "new" sur une implémentation concrète.
 *    - Toutes les dépendances sont injectées via le constructeur.
 * 3. Fiabilité & Continuité de service :
 *    - Si un fournisseur ou un canal rencontre un incident, l'architecture garantit
 *      un mode dégradé sans jamais provoquer de silence.
 */
export class WakeUpUserUseCase {
  constructor(
    private readonly userProfileProvider: UserProfileProvider,
    private readonly musicProvider: MusicProvider,
    private readonly notificationSender: NotificationSender,
    private readonly logger: Logger
  ) {}

  public async execute(request: WakeUpRequest): Promise<WakeUpExecutionResult> {
    const startTime = Date.now();
    this.logger.info('Démarrage du processus de réveil musical', {
      userId: request.userId,
      day: request.dayOfWeek,
      weather: request.weather,
    });

    // 1. Récupération des préférences utilisateur via le port abstrait
    const userPrefs = await this.userProfileProvider.getUserPreferences(request.userId);
    if (!userPrefs) {
      this.logger.error('Utilisateur non trouvé', { userId: request.userId });
      throw new UserNotFoundError(request.userId);
    }

    // 2. Détermination du morceau demandé pour la météo du jour (avec morceau de secours si non couvert)
    const { trackQuery, isWeatherCovered } = this.resolveTrackQuery(userPrefs, request.weather);
    this.logger.debug('Morceau sélectionné selon météo', {
      trackQuery,
      weather: request.weather,
      isWeatherCovered,
    });

    // 3. Résolution du morceau musical via le port abstrait MusicProvider
    const track = await this.resolveTrack(trackQuery, userPrefs.fallbackTrack);

    // Vérification du mode dégradé musical
    // Un mode dégradé est actif si le morceau provient d'un fallback local ou du morceau de secours
    const isDegradedMusicMode =
      track.source === 'local-fallback' || !isWeatherCovered;

    // 4. Construction de la notification de réveil
    const greeting = this.buildGreeting(request.dayOfWeek, request.weather, track);
    const notification: WakeUpNotification = {
      recipient: userPrefs.recipientInfo,
      preferredChannel: userPrefs.preferredChannel,
      track,
      weather: request.weather,
      dayOfWeek: request.dayOfWeek,
      greeting,
      timestamp: new Date(),
    };

    // 5. Expédition de la notification via le port abstrait NotificationSender
    const delivery = await this.notificationSender.send(notification);

    const isDegradedNotificationMode =
      delivery.channel !== userPrefs.preferredChannel;

    this.logger.info('Cycle de réveil musical complété avec succès', {
      userId: request.userId,
      channelUsed: delivery.channel,
      musicSource: track.source,
      durationMs: Date.now() - startTime,
    });

    return {
      userId: request.userId,
      dayOfWeek: request.dayOfWeek,
      weather: request.weather,
      track,
      musicSource: track.source,
      isDegradedMusicMode,
      requestedTrackQuery: trackQuery,
      channelUsed: delivery.channel,
      isDegradedNotificationMode,
      delivery,
      executedAt: new Date(),
    };
  }

  private resolveTrackQuery(
    prefs: UserWakeUpPreferences,
    weather: WeatherType
  ): { trackQuery: string; isWeatherCovered: boolean } {
    const configuredTrack = prefs.weatherTracks[weather];
    if (configuredTrack && configuredTrack.trim().length > 0) {
      return { trackQuery: configuredTrack, isWeatherCovered: true };
    }
    return { trackQuery: prefs.fallbackTrack, isWeatherCovered: false };
  }

  private async resolveTrack(query: string, userFallbackTrack: string): Promise<Track> {
    try {
      const resolved = await this.musicProvider.searchTrack(query);
      if (resolved) {
        return resolved;
      }
    } catch (error) {
      this.logger.warn('Échec de la recherche du morceau primaire, tentative avec le fallback utilisateur', {
        error: error instanceof Error ? error.message : String(error),
        query,
      });
    }

    // Si la recherche de la requête principale a échoué ou n'a rien donné,
    // on tente avec le morceau de secours de l'utilisateur
    try {
      const fallbackResolved = await this.musicProvider.searchTrack(userFallbackTrack);
      if (fallbackResolved) {
        return fallbackResolved;
      }
    } catch {
      // En cas d'échec total du provider, la responsabilité de garantir un morceau
      // est déléguée au provider résilient ou au LocalFallback
    }

    // Filet de sécurité ultime (aucun silence ne peut exister)
    return {
      title: userFallbackTrack,
      artist: 'Artiste inconnu',
      source: 'domain-safety-net',
    };
  }

  private buildGreeting(day: DayOfWeek, weather: WeatherType, track: Track): string {
    const weatherPhrases: Record<WeatherType, string> = {
      SOLEIL: 'Le soleil brille dehors !',
      PLUIE: 'Il pleut aujourd’hui, restez bien au chaud !',
      NEIGE: 'Un manteau de neige recouvre la ville !',
      NUAGEUX: 'Temps nuageux ce matin, bonne journée !',
    };

    return `Bonjour ! Nous sommes ${day.toLowerCase()}. ${weatherPhrases[weather]} Réveillez-vous en musique avec "${track.title}" par ${track.artist}.`;
  }
}
