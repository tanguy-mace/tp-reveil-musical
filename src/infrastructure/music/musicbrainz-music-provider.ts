import type { Track } from '../../domain/models/track.js';
import type { MusicProvider } from '../../domain/ports/music-provider.port.js';
import type { FetchFunction } from './itunes-music-provider.js';

interface MusicBrainzArtistCredit {
  name?: string;
  artist?: {
    name?: string;
  };
}

interface MusicBrainzRecording {
  title?: string;
  'artist-credit'?: MusicBrainzArtistCredit[];
  [key: string]: unknown;
}

interface MusicBrainzResponse {
  recordings?: MusicBrainzRecording[];
}

/**
 * Adaptateur pour l'API MusicBrainz.
 *
 * RÈGLES RESPECTÉES :
 * - En-tête 'User-Agent' obligatoire et identifiable fourni à chaque requête (requis par la politique MusicBrainz).
 * - Couche Anti-Corruption (ACL) : mappe la structure complexe 'artist-credit' vers le modèle Track du domaine.
 * - Testabilité et IoC par injection de la fonction fetch.
 */
export class MusicBrainzMusicProvider implements MusicProvider {
  public readonly name = 'musicbrainz';
  private readonly baseUrl: string;
  private readonly userAgent: string;
  private readonly fetchFn: FetchFunction;

  constructor(
    userAgent: string = 'ReveilMusicalApp/1.0.0 ( contact@reveil-musical.example.com )',
    fetchFn: FetchFunction = globalThis.fetch.bind(globalThis),
    baseUrl: string = 'https://musicbrainz.org/ws/2/recording'
  ) {
    this.userAgent = userAgent;
    this.fetchFn = fetchFn;
    this.baseUrl = baseUrl;
  }

  public async searchTrack(query: string): Promise<Track | null> {
    const url = new URL(this.baseUrl);
    url.searchParams.set('query', query);
    url.searchParams.set('fmt', 'json');

    const response = await this.fetchFn(url.toString(), {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'User-Agent': this.userAgent, // Obligatoire selon la spécification MusicBrainz
      },
    });

    if (!response.ok) {
      throw new Error(
        `MusicBrainz API a rejeté la requête HTTP ${response.status}: ${response.statusText}`
      );
    }

    const data = (await response.json()) as MusicBrainzResponse;

    if (!data.recordings || data.recordings.length === 0) {
      return null;
    }

    const firstValid = data.recordings.find(
      (rec) => rec.title && rec['artist-credit'] && rec['artist-credit'].length > 0
    );

    if (!firstValid || !firstValid.title) {
      return null;
    }

    // Récupération du ou des artistes depuis le tableau artist-credit
    const artistName =
      firstValid['artist-credit']
        ?.map((credit) => credit.name || credit.artist?.name)
        .filter(Boolean)
        .join(', ') || 'Artiste inconnu';

    return {
      title: firstValid.title,
      artist: artistName,
      source: this.name,
    };
  }
}
