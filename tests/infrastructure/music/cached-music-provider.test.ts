import { describe, it, expect, vi } from 'vitest';
import { CachedMusicProvider } from '../../../src/infrastructure/music/cached-music-provider.js';
import type { MusicProvider } from '../../../src/domain/ports/music-provider.port.js';
import type { Track } from '../../../src/domain/models/track.js';

describe('Design Pattern Decorator: CachedMusicProvider', () => {
  const dummyTrack: Track = {
    title: 'Sunny',
    artist: 'Bobby Hebb',
    source: 'mock-inner',
  };

  it('respecte la contrainte de ~20 req/min en servant les requêtes répétées depuis le cache mémoire', async () => {
    let callCount = 0;
    const innerProvider: MusicProvider = {
      name: 'mock-inner',
      searchTrack: async () => {
        callCount++;
        return dummyTrack;
      },
    };

    const cachedProvider = new CachedMusicProvider(innerProvider, 10_000);

    // 1er appel : Miss de cache, innerProvider appelé
    const track1 = await cachedProvider.searchTrack('Sunny');
    expect(track1).toEqual(dummyTrack);
    expect(callCount).toBe(1);

    // 2ème appel : Hit de cache, innerProvider NON appelé
    const track2 = await cachedProvider.searchTrack('Sunny');
    expect(track2).toEqual(dummyTrack);
    expect(callCount).toBe(1);

    // Même requête avec casse différente -> insensibilité à la casse
    const track3 = await cachedProvider.searchTrack('  sunny  ');
    expect(track3).toEqual(dummyTrack);
    expect(callCount).toBe(1);

    const stats = cachedProvider.getStats();
    expect(stats.hits).toBe(2);
    expect(stats.misses).toBe(1);
    expect(stats.size).toBe(1);
  });

  it('expire les entrées de cache après le TTL configuré', async () => {
    let callCount = 0;
    const innerProvider: MusicProvider = {
      name: 'mock-inner',
      searchTrack: async () => {
        callCount++;
        return dummyTrack;
      },
    };

    const shortTtlMs = 50;
    const cachedProvider = new CachedMusicProvider(innerProvider, shortTtlMs);

    await cachedProvider.searchTrack('Sunny');
    expect(callCount).toBe(1);

    // Attendre l'expiration du TTL
    await new Promise((resolve) => setTimeout(resolve, 60));

    await cachedProvider.searchTrack('Sunny');
    expect(callCount).toBe(2);
  });

  it('permet de vider manuellement le cache', async () => {
    const innerProvider: MusicProvider = {
      name: 'mock-inner',
      searchTrack: async () => dummyTrack,
    };

    const cachedProvider = new CachedMusicProvider(innerProvider);
    await cachedProvider.searchTrack('Sunny');
    expect(cachedProvider.getStats().size).toBe(1);

    cachedProvider.clear();
    expect(cachedProvider.getStats().size).toBe(0);
    expect(cachedProvider.getStats().hits).toBe(0);
  });
});

