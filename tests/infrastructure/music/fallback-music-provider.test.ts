import { describe, it, expect } from 'vitest';
import { FallbackMusicProvider } from '../../../src/infrastructure/music/fallback-music-provider.js';
import type { MusicProvider } from '../../../src/domain/ports/music-provider.port.js';
import type { Track } from '../../../src/domain/models/track.js';
import { MemoryLogger } from '../../../src/infrastructure/logging/console-logger.js';

describe('Design Pattern Chain of Responsibility / Composite: FallbackMusicProvider', () => {
  const primaryTrack: Track = {
    title: 'Primary Track',
    artist: 'Primary Artist',
    source: 'primary-provider',
  };

  const backupTrack: Track = {
    title: 'Backup Track',
    artist: 'Backup Artist',
    source: 'backup-provider',
  };

  const localTrack: Track = {
    title: 'Local Fallback',
    artist: 'Local Artist',
    source: 'local-fallback',
  };

  it('utilise le premier fournisseur s’il réussit sans solliciter les suivants', async () => {
    let backupCalled = false;

    const primary: MusicProvider = {
      name: 'primary',
      searchTrack: async () => primaryTrack,
    };

    const backup: MusicProvider = {
      name: 'backup',
      searchTrack: async () => {
        backupCalled = true;
        return backupTrack;
      },
    };

    const composite = new FallbackMusicProvider([primary, backup]);
    const result = await composite.searchTrack('Query');

    expect(result).toEqual(primaryTrack);
    expect(backupCalled).toBe(false);
  });

  it('bascule sur le fournisseur secondaire si le premier lance une erreur réseau', async () => {
    const logger = new MemoryLogger();

    const failingPrimary: MusicProvider = {
      name: 'primary-failing',
      searchTrack: async () => {
        throw new Error('503 Service Unavailable');
      },
    };

    const backup: MusicProvider = {
      name: 'backup-working',
      searchTrack: async () => backupTrack,
    };

    const composite = new FallbackMusicProvider([failingPrimary, backup], logger);
    const result = await composite.searchTrack('Query');

    expect(result).toEqual(backupTrack);
    expect(logger.entries.some((e) => e.level === 'warn')).toBe(true);
  });

  it('bascule sur le fournisseur secondaire si le premier retourne null (aucun résultat)', async () => {
    const primaryEmpty: MusicProvider = {
      name: 'primary-empty',
      searchTrack: async () => null,
    };

    const backup: MusicProvider = {
      name: 'backup-working',
      searchTrack: async () => backupTrack,
    };

    const composite = new FallbackMusicProvider([primaryEmpty, backup]);
    const result = await composite.searchTrack('Query');

    expect(result).toEqual(backupTrack);
  });

  it('atteint le fallback local en bout de chaîne si tous les fournisseurs externes échouent', async () => {
    const itunesFail: MusicProvider = {
      name: 'itunes',
      searchTrack: async () => {
        throw new Error('Quota dépassé');
      },
    };

    const musicBrainzFail: MusicProvider = {
      name: 'musicbrainz',
      searchTrack: async () => {
        throw new Error('Timeout 504');
      },
    };

    const local: MusicProvider = {
      name: 'local-fallback',
      searchTrack: async () => localTrack,
    };

    const composite = new FallbackMusicProvider([
      itunesFail,
      musicBrainzFail,
      local,
    ]);

    const result = await composite.searchTrack('Query');
    expect(result).toEqual(localTrack);
    expect(result?.source).toBe('local-fallback');
  });

  it('lève une exception si la liste des fournisseurs est vide à l’initialisation', () => {
    expect(() => new FallbackMusicProvider([])).toThrow(
      /nécessite au moins un fournisseur/
    );
  });
});

