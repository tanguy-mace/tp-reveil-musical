import { describe, it, expect } from 'vitest';
import { MusicBrainzMusicProvider } from '../../../src/infrastructure/music/musicbrainz-music-provider.js';

describe('Infrastructure: MusicBrainzMusicProvider', () => {
  it('envoie impérativement un en-tête User-Agent identifiable et extrait artist-credit', async () => {
    let capturedHeaders: HeadersInit | undefined;

    const mockFetch = async (_url: string, init?: RequestInit) => {
      capturedHeaders = init?.headers;
      return new Response(
        JSON.stringify({
          recordings: [
            {
              id: 'mb-rec-123',
              title: 'Morning Mood',
              'artist-credit': [
                {
                  name: 'Edvard Grieg',
                  artist: { name: 'Edvard Grieg' },
                },
              ],
            },
          ],
        }),
        { status: 200 }
      );
    };

    const expectedUserAgent = 'ReveilMusicalApp/1.0.0 ( contact@reveil-musical.example.com )';
    const provider = new MusicBrainzMusicProvider(
      expectedUserAgent,
      mockFetch as unknown as typeof fetch
    );

    const track = await provider.searchTrack('Morning Mood');

    // Vérification de l'exigence MusicBrainz (User-Agent obligatoire)
    expect(capturedHeaders).toBeDefined();
    const headersObj = capturedHeaders as Record<string, string>;
    expect(headersObj['User-Agent']).toBe(expectedUserAgent);

    expect(track).not.toBeNull();
    expect(track?.title).toBe('Morning Mood');
    expect(track?.artist).toBe('Edvard Grieg');
    expect(track?.source).toBe('musicbrainz');
  });

  it('gère correctement les multiples artistes crédités', async () => {
    const mockFetch = async () =>
      new Response(
        JSON.stringify({
          recordings: [
            {
              id: 'mb-rec-456',
              title: 'Under Pressure',
              'artist-credit': [
                { name: 'Queen' },
                { name: 'David Bowie' },
              ],
            },
          ],
        }),
        { status: 200 }
      );

    const provider = new MusicBrainzMusicProvider('app/1.0', mockFetch as unknown as typeof fetch);
    const track = await provider.searchTrack('Under Pressure');

    expect(track?.artist).toBe('Queen, David Bowie');
  });

  it('retourne null si aucun enregistrement n’est retourné', async () => {
    const mockFetch = async () =>
      new Response(JSON.stringify({ recordings: [] }), { status: 200 });

    const provider = new MusicBrainzMusicProvider('app/1.0', mockFetch as unknown as typeof fetch);
    const track = await provider.searchTrack('TitreInexistant');

    expect(track).toBeNull();
  });

  it('lance une exception si MusicBrainz rejette la requête HTTP', async () => {
    const mockFetch = async () =>
      new Response('Forbidden: Missing User-Agent', {
        status: 403,
        statusText: 'Forbidden',
      });

    const provider = new MusicBrainzMusicProvider('app/1.0', mockFetch as unknown as typeof fetch);
    await expect(provider.searchTrack('Titre')).rejects.toThrow(
      /MusicBrainz API a rejeté la requête HTTP 403/
    );
  });
});

