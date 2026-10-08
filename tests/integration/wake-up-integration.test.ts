import { describe, it, expect } from 'vitest';
import { triggerWakeUp } from '../../src/index.js';
import { createAppContainer } from '../../src/di/container-factory.js';
import { MemoryLogger } from '../../src/infrastructure/logging/console-logger.js';
import { UserNotFoundError } from '../../src/application/use-cases/wake-up-user.use-case.js';

describe('Integration: Point d’entrée triggerWakeUp & Scénarios complets', () => {
  it('exécute avec succès le réveil d’Alice (météo SOLEIL, canal EMAIL)', async () => {
    const logger = new MemoryLogger();
    const container = createAppContainer({ logger });

    const result = await triggerWakeUp('user-alice', 'LUNDI', 'SOLEIL', container);

    expect(result.userId).toBe('user-alice');
    expect(result.dayOfWeek).toBe('LUNDI');
    expect(result.weather).toBe('SOLEIL');
    expect(result.channelUsed).toBe('EMAIL');
    expect(result.delivery.success).toBe(true);
    expect(result.track).toBeDefined();
    expect(result.track.title).toContain('Sun');
    expect(result.isDegradedMusicMode).toBe(false);
  });

  it('exécute le réveil de Bob avec le morceau de secours (météo NEIGE non couverte)', async () => {
    const logger = new MemoryLogger();
    const container = createAppContainer({ logger });

    const result = await triggerWakeUp('user-bob', 'MERCREDI', 'NEIGE', container);

    expect(result.userId).toBe('user-bob');
    expect(result.weather).toBe('NEIGE');
    expect(result.channelUsed).toBe('SMS');
    expect(result.requestedTrackQuery).toBe('Morning Has Broken');
    expect(result.isDegradedMusicMode).toBe(true);
    expect(result.delivery.success).toBe(true);
  });

  it('exécute le réveil de Charlie via PUSH', async () => {
    const container = createAppContainer();
    const result = await triggerWakeUp('user-charlie', 'VENDREDI', 'NUAGEUX', container);

    expect(result.userId).toBe('user-charlie');
    expect(result.channelUsed).toBe('PUSH');
    expect(result.delivery.success).toBe(true);
  });

  it('assure la continuité de service (Fallback Local) en cas de panne réseau externe totale', async () => {
    const logger = new MemoryLogger();

    // Simulation d'une panne réseau globale : fetch lance une exception
    const failingFetch = async () => {
      throw new Error('Connexion réseau interrompue (DNS failure)');
    };

    const container = createAppContainer({
      fetchFn: failingFetch as unknown as typeof fetch,
      logger,
    });

    const result = await triggerWakeUp('user-alice', 'MARDI', 'PLUIE', container);

    // Même en panne totale d'Internet, le réveil fonctionne grâce au fallback local en dur !
    expect(result.delivery.success).toBe(true);
    expect(result.track.source).toBe('local-fallback');
    expect(result.isDegradedMusicMode).toBe(true);
    expect(result.track.title).toBeDefined();
  });

  it('rejette proprement si l’utilisateur est introuvable', async () => {
    const container = createAppContainer();
    await expect(
      triggerWakeUp('unknown-user-999', 'JEUDI', 'SOLEIL', container)
    ).rejects.toThrow(UserNotFoundError);
  });
});
