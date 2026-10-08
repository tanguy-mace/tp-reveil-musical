import type { Track } from '../../domain/models/track.js';
import type { MusicProvider } from '../../domain/ports/music-provider.port.js';

interface ItunesRawResult {
  trackName?: string;
  artistName?: string;
  trackViewUrl?: string; // Spécifique iTunes : DOIT ÊTRE FILTRÉ ET NE JAMAIS FUITER DANS LE DOMAINE
  previewUrl?: string;
  [key: string]: unknown;
}

interface ItunesSearchResponse {
  resultCount: number;
  results: ItunesRawResult[];
}

export type FetchFunction = typeof globalThis.fetch;

/**
 * Adaptateur pour l'API iTunes Search.
 *
 * RÈGLES RESPECTÉES :
 * - Couche Anti-Corruption (ACL) : mappe la réponse iTunes vers le modèle Track du domaine.
 * - Le champ propriétaire 'trackViewUrl' est strictement ignoré et ne fuite pas.
 * - Injection de fetchFn pour l'inversion de contrôle et la testabilité sans mock global.
 */
export class ItunesMusicProvider implements MusicProvider {
  public readonly name = 'itunes';
  private readonly baseUrl: string;
  private readonly fetchFn: FetchFunction;

  constructor(
    fetchFn: FetchFunction = globalThis.fetch.bind(globalThis),
    baseUrl: string = 'https://itunes.apple.com/search'
  ) {
    this.fetchFn = fetchFn;
    this.baseUrl = baseUrl;
  }

  public async searchTrack(query: string): Promise<Track | null> {
    const url = new URL(this.baseUrl);
    url.searchParams.set('term', query);
    url.searchParams.set('media', 'music');
    url.searchParams.set('limit', '5');

    const response = await this.fetchFn(url.toString(), {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(
        `iTunes API a répondu avec une erreur HTTP ${response.status}: ${response.statusText}`
      );
    }

    const data = (await response.json()) as ItunesSearchResponse;

    if (!data.results || data.results.length === 0) {
      return null;
    }

    const firstValid = data.results.find(
      (item) => item.trackName && item.artistName
    );

    if (!firstValid || !firstValid.trackName || !firstValid.artistName) {
      return null;
    }

    // MAPPING PUR : isolation totale du modèle de domaine
    // Notez l'exclusion volontaire de 'trackViewUrl' et autres champs propriétaires
    return {
      title: firstValid.trackName,
      artist: firstValid.artistName,
      source: this.name,
    };
  }
}
