import { describe, it, expect } from 'vitest';
import { ItunesMusicProvider } from '../../../src/infrastructure/music/itunes-music-provider.js';

describe('Infrastructure: ItunesMusicProvider', () => {
  it('mappe correctement trackName et artistName vers le modèle Track', async () => {
    const mockFetch = async () =>
      new Response(
        JSON.stringify({
          resultCount: 1,
          results: [
            {
              wrapperType: 'track',
              kind: 'song',
              artistName: 'The Beatles',
              trackName: 'Here Comes the Sun',
              collectionName: 'Abbey Road',
              trackViewUrl: 'https://music.apple.com/us/album/here-comes-the-sun/123456?uo=4',
              previewUrl: 'https://audio-ssl.itunes.apple.com/preview.m4a',
            },
          ],
        }),
        { status: 200 }
      );

    const provider = new ItunesMusicProvider(mockFetch as unknown as typeof fetch);
    const track = await provider.searchTrack('Here Comes the Sun');

    expect(track).not.toBeNull();
    expect(track?.title).toBe('Here Comes the Sun');
    expect(track?.artist).toBe('The Beatles');
    expect(track?.source).toBe('itunes');

    // EXIGENCE ARCHITECTURALE FONDAMENTALE :
    // Le champ technique 'trackViewUrl' ne doit JAMAIS fuiter dans le modèle métier
    expect(track).not.toHaveProperty('trackViewUrl');
    expect(track).not.toHaveProperty('previewUrl');
  });

  it('retourne null si la recherche ne contient aucun résultat', async () => {
    const mockFetch = async () =>
      new Response(JSON.stringify({ resultCount: 0, results: [] }), {
        status: 200,
      });

    const provider = new ItunesMusicProvider(mockFetch as unknown as typeof fetch);
    const track = await provider.searchTrack('NonExistentSong123456789');

    expect(track).toBeNull();
  });

  it('lance une exception explicite en cas d’erreur HTTP', async () => {
    const mockFetch = async () =>
      new Response('Internal Server Error', {
        status: 500,
        statusText: 'Internal Server Error',
      });

    const provider = new ItunesMusicProvider(mockFetch as unknown as typeof fetch);
    await expect(provider.searchTrack('Any Song')).rejects.toThrow(
      /iTunes API a répondu avec une erreur HTTP 500/
    );
  });
});

