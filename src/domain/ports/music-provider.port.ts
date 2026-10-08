import type { Track } from '../models/track.js';

/**
 * Port de sortie (Driven Port) pour la recherche de morceaux musicaux.
 * Définit le contrat abstrait sans aucune adhérence à une API spécifique (iTunes, MusicBrainz, etc.).
 */
export interface MusicProvider {
  /**
   * Nom technique ou commercial du fournisseur (ex: 'itunes', 'musicbrainz', 'local-fallback')
   */
  readonly name: string;

  /**
   * Recherche un morceau à partir d'une requête (titre, artiste, mot-clé).
   * Retourne un Track pur du domaine ou null si aucun résultat.
   * Doit lever une erreur si le fournisseur est inaccessible afin de déclencher
   * les mécanismes de résilience (fallback).
   */
  searchTrack(query: string): Promise<Track | null>;
}
