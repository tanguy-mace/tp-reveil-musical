import type { UserWakeUpPreferences } from '../models/user-preferences.js';

/**
 * Port de sortie (Driven Port) pour la récupération des préférences utilisateurs.
 * Le service interne est accédé via cette interface abstraite.
 */
export interface UserProfileProvider {
  /**
   * Récupère les préférences de réveil d'un utilisateur par son identifiant.
   * Retourne null si l'utilisateur n'est pas trouvé.
   */
  getUserPreferences(userId: string): Promise<UserWakeUpPreferences | null>;
}

