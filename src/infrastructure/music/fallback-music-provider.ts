import type { Track } from '../../domain/models/track.js';
import type { MusicProvider } from '../../domain/ports/music-provider.port.js';
import type { Logger } from '../../domain/ports/logger.port.js';

/**
 * PATTERN COMPOSITE / CHAIN OF RESPONSIBILITY : FallbackMusicProvider.
 *
 * RÔLE ARCHITECTURAL :
 * - Garantit la continuité du service et l'absence totale de silence en cas de panne,
 *   de dépassement de quota ou de latence d'un fournisseur tiers.
 * - Tente successivement les fournisseurs injectés selon leur ordre de priorité.
 * - Isole la logique de résilience : le Use Case n'a pas à gérer lui-même la cascade d'échecs.
 */
export class FallbackMusicProvider implements MusicProvider {
  public readonly name = 'fallback-composite';
  private readonly providers: readonly MusicProvider[];
  private readonly logger?: Logger;

  constructor(providers: readonly MusicProvider[], logger?: Logger) {
    if (providers.length === 0) {
      throw new Error(
        'FallbackMusicProvider nécessite au moins un fournisseur dans sa chaîne.'
      );
    }
    this.providers = [...providers];
    this.logger = logger;
  }

  public async searchTrack(query: string): Promise<Track | null> {
    for (const provider of this.providers) {
      try {
        const result = await provider.searchTrack(query);
        if (result) {
          return result;
        }
        this.logger?.warn(
          `Fournisseur "${provider.name}" n'a retourné aucun résultat pour "${query}". Bascule sur le suivant.`
        );
      } catch (error) {
        this.logger?.warn(
          `Panne ou erreur sur le fournisseur musical "${provider.name}". Bascule sur le suivant dans la chaîne.`,
          {
            provider: provider.name,
            error: error instanceof Error ? error.message : String(error),
            query,
          }
        );
      }
    }

    return null;
  }
}

