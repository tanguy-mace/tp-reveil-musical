import type { UserProfileProvider } from '../../domain/ports/user-profile-provider.port.js';
import type { UserWakeUpPreferences } from '../../domain/models/user-preferences.js';

/**
 * Service interne mocké fournissant les préférences utilisateurs.
 * Accédé strictement via le port 'UserProfileProvider'.
 */
export class InMemoryUserRepository implements UserProfileProvider {
  private readonly users = new Map<string, UserWakeUpPreferences>();

  constructor(initialUsers: UserWakeUpPreferences[] = []) {
    // Si aucun utilisateur fourni, charger un jeu de données de démonstration
    if (initialUsers.length === 0) {
      this.loadDefaultFixtures();
    } else {
      for (const user of initialUsers) {
        this.saveUser(user);
      }
    }
  }

  public async getUserPreferences(userId: string): Promise<UserWakeUpPreferences | null> {
    const user = this.users.get(userId);
    return user ? { ...user } : null;
  }

  public saveUser(user: UserWakeUpPreferences): void {
    this.users.set(user.userId, user);
  }

  public deleteUser(userId: string): void {
    this.users.delete(userId);
  }

  private loadDefaultFixtures(): void {
    // Utilisateur 1: Alice - Tous les cas météo configurés, préfère EMAIL
    this.saveUser({
      userId: 'user-alice',
      weatherTracks: {
        SOLEIL: 'Here Comes the Sun',
        PLUIE: 'Singin in the Rain',
        NEIGE: 'Let It Snow',
        NUAGEUX: 'Cloudbusting',
      },
      fallbackTrack: 'Bohemian Rhapsody',
      preferredChannel: 'EMAIL',
      recipientInfo: {
        userId: 'user-alice',
        displayName: 'Alice Dupont',
        email: 'alice@example.com',
        phone: '+33612345678',
        deviceToken: 'token-alice-ios-123',
      },
    });

    // Utilisateur 2: Bob - Cas météo incomplet (NEIGE et NUAGEUX non configurés -> teste le fallback), préfère SMS
    this.saveUser({
      userId: 'user-bob',
      weatherTracks: {
        SOLEIL: 'Walking on Sunshine',
        PLUIE: 'Riders on the Storm',
      },
      fallbackTrack: 'Morning Has Broken',
      preferredChannel: 'SMS',
      recipientInfo: {
        userId: 'user-bob',
        displayName: 'Bob Martin',
        phone: '+33698765432',
        email: 'bob@example.com',
      },
    });

    // Utilisateur 3: Charlie - Préfère PUSH notification
    this.saveUser({
      userId: 'user-charlie',
      weatherTracks: {
        SOLEIL: 'Good Vibrations',
        PLUIE: 'November Rain',
        NEIGE: 'Winter Wonderland',
        NUAGEUX: 'Ain No Sunshine',
      },
      fallbackTrack: 'Stand by Me',
      preferredChannel: 'PUSH',
      recipientInfo: {
        userId: 'user-charlie',
        displayName: 'Charlie Brown',
        deviceToken: 'fcm-charlie-android-abc-999',
        email: 'charlie@example.com',
      },
    });
  }
}

