import type { Track } from '../../domain/models/track.js';
import type { MusicProvider } from '../../domain/ports/music-provider.port.js';

interface CacheEntry {
  track: Track | null;
  expiresAt: number;
}

/**
 * PATTERN DECORATOR / PROXY : CachedMusicProvider.
 *
 * RÔLE ARCHITECTURAL :
 * - Respecter la contrainte de débit d'iTunes (~20 requêtes / minute)
 *   sans modifier le code source de ItunesMusicProvider (Principe Ouvert/Fermé - OCP).
 * - Enveloppe n'importe quelle implémentation de MusicProvider.
 * - Améliore les performances de réponse et protège des quotas d'API.
 */
export class CachedMusicProvider implements MusicProvider {
  private readonly innerProvider: MusicProvider;
  private readonly ttlMs: number;
  private readonly cache = new Map<string, CacheEntry>();

  private hitCount = 0;
  private missCount = 0;

  constructor(innerProvider: MusicProvider, ttlMs: number = 60_000) {
    this.innerProvider = innerProvider;
    this.ttlMs = ttlMs;
  }

  public get name(): string {
    return `${this.innerProvider.name} (cached)`;
  }

  public async searchTrack(query: string): Promise<Track | null> {
    const cacheKey = query.trim().toLowerCase();
    const now = Date.now();
    const cached = this.cache.get(cacheKey);

    if (cached && cached.expiresAt > now) {
      this.hitCount++;
      return cached.track;
    }

    this.missCount++;
    const track = await this.innerProvider.searchTrack(query);

    this.cache.set(cacheKey, {
      track,
      expiresAt: now + this.ttlMs,
    });

    return track;
  }

  public getStats(): { hits: number; misses: number; size: number } {
    return {
      hits: this.hitCount,
      misses: this.missCount,
      size: this.cache.size,
    };
  }

  public clear(): void {
    this.cache.clear();
    this.hitCount = 0;
    this.missCount = 0;
  }
}
