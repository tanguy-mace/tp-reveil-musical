import { describe, it, expect } from 'vitest';
import { LocalFallbackMusicProvider } from '../../../src/infrastructure/music/local-fallback-music-provider.js';

describe('Infrastructure: LocalFallbackMusicProvider', () => {
  const provider = new LocalFallbackMusicProvider();

  it('ne retourne JAMAIS null, garantissant l’absence totale de silence', async () => {
    const result = await provider.searchTrack('');
    expect(result).not.toBeNull();
    expect(result.source).toBe('local-fallback');
    expect(result.title).toBeDefined();
    expect(result.artist).toBeDefined();
  });

  it('trouve un morceau par mot-clé météo (ex: soleil)', async () => {
    const result = await provider.searchTrack('soleil');
    expect(result.title).toBe('Here Comes the Sun');
    expect(result.artist).toBe('The Beatles');
  });

  it('trouve un morceau par mot-clé hiver/neige', async () => {
    const result = await provider.searchTrack('neige');
    expect(result.title).toBe('Winter (The Four Seasons)');
    expect(result.artist).toBe('Antonio Vivaldi');
  });

  it('retourne le premier morceau par défaut si aucun mot-clé ne correspond', async () => {
    const result = await provider.searchTrack('random-query-xyz-999');
    expect(result).toBeDefined();
    expect(result.title).toBe('Here Comes the Sun');
  });
});
