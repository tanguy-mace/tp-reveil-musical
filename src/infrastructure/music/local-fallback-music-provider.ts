import type { Track } from '../../domain/models/track.js';
import type { MusicProvider } from '../../domain/ports/music-provider.port.js';

export interface StaticTrackEntry {
  readonly title: string;
  readonly artist: string;
  readonly keywords: readonly string[];
}

/**
 * Fournisseur de musique local (Fallback en dur).
 *
 * RÔLE ARCHITECTURAL :
 * - Garantie ultime de fiabilité (le silence n'est jamais acceptable).
 * - Fonctionne même en panne totale de réseau ou de fournisseurs tiers.
 * - Ne renvoie JAMAIS null ni d'erreur bloquante.
 */
export class LocalFallbackMusicProvider implements MusicProvider {
  public readonly name = 'local-fallback';

  private readonly catalog: readonly StaticTrackEntry[] = [
    {
      title: 'Here Comes the Sun',
      artist: 'The Beatles',
      keywords: ['sun', 'soleil', 'beatles', 'matin', 'morning'],
    },
    {
      title: 'Morning Mood (Peer Gynt)',
      artist: 'Edvard Grieg',
      keywords: ['pluie', 'rain', 'classique', 'grieg', 'reveil'],
    },
    {
      title: 'Winter (The Four Seasons)',
      artist: 'Antonio Vivaldi',
      keywords: ['neige', 'snow', 'winter', 'hiver', 'vivaldi'],
    },
    {
      title: 'Clair de Lune',
      artist: 'Claude Debussy',
      keywords: ['nuageux', 'clouds', 'calme', 'debussy'],
    },
    {
      title: 'Happy',
      artist: 'Pharrell Williams',
      keywords: ['happy', 'joie', 'pop', 'energie'],
    },
  ];

  public async searchTrack(query: string): Promise<Track> {
    const normalizedQuery = query.toLowerCase().trim();

    // Recherche par mot-clé dans notre catalogue local
    const match = this.catalog.find(
      (entry) =>
        entry.title.toLowerCase().includes(normalizedQuery) ||
        entry.artist.toLowerCase().includes(normalizedQuery) ||
        entry.keywords.some((kw) => normalizedQuery.includes(kw))
    );

    const chosen = match ?? this.catalog[0]!;

    return {
      title: chosen.title,
      artist: chosen.artist,
      source: this.name,
    };
  }
}
