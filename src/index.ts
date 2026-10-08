import type { DayOfWeek, WeatherType, WakeUpExecutionResult } from './domain/models/index.js';
import { createAppContainer } from './di/container-factory.js';
import { TOKENS } from './di/tokens.js';
import type { WakeUpUserUseCase } from './application/use-cases/wake-up-user.use-case.js';
import type { Container } from './di/container.js';

export * from './domain/index.js';
export * from './application/index.js';
export * from './infrastructure/index.js';
export * from './di/index.js';

/**
 * POINT D'ENTRÉE DU TP :
 * Fonction principale qui déclenche l'envoi du réveil musical pour un utilisateur.
 * Reçoit :
 * - userId : identifiant de l'utilisateur
 * - dayOfWeek : jour de la semaine ('LUNDI', 'MARDI', ...)
 * - weather : météo du jour ('SOLEIL' | 'PLUIE' | 'NEIGE' | 'NUAGEUX')
 * - container (optionnel) : conteneur IoC (permet d'injecter une configuration custom pour les tests)
 */
export async function triggerWakeUp(
  userId: string,
  dayOfWeek: DayOfWeek,
  weather: WeatherType,
  container?: Container
): Promise<WakeUpExecutionResult> {
  const currentContainer = container ?? createAppContainer();
  const useCase = currentContainer.resolve<WakeUpUserUseCase>(TOKENS.WakeUpUserUseCase);

  return useCase.execute({
    userId,
    dayOfWeek,
    weather,
  });
}

/**
 * Script de démonstration exécutable en ligne de commande :
 * `npm start`
 */
async function main() {
  console.log('='.repeat(70));
  console.log('🎵 DÉMONSTRATION DU SERVICE RÉVEIL MUSICAL');
  console.log('='.repeat(70));

  const container = createAppContainer();

  // Scénario 1 : Alice - Météo SOLEIL - Préfère EMAIL
  console.log('\n--- SCÉNARIO 1 : Alice (Météo SOLEIL, Canal EMAIL) ---');
  const result1 = await triggerWakeUp('user-alice', 'LUNDI', 'SOLEIL', container);
  console.log('Résultat :', {
    user: result1.userId,
    morceau: `"${result1.track.title}" par ${result1.track.artist}`,
    sourceMusique: result1.musicSource,
    canalUtilise: result1.channelUsed,
    modeDegradeMusique: result1.isDegradedMusicMode,
  });

  // Scénario 2 : Bob - Météo NEIGE (non couverte dans ses choix -> Morceau de secours) - Canal SMS
  console.log('\n--- SCÉNARIO 2 : Bob (Météo NEIGE non configurée -> Fallback Morceau, Canal SMS) ---');
  const result2 = await triggerWakeUp('user-bob', 'MERCREDI', 'NEIGE', container);
  console.log('Résultat :', {
    user: result2.userId,
    morceau: `"${result2.track.title}" par ${result2.track.artist}`,
    sourceMusique: result2.musicSource,
    canalUtilise: result2.channelUsed,
    modeDegradeMusique: result2.isDegradedMusicMode,
  });

  // Scénario 3 : Charlie - Météo NUAGEUX - Canal PUSH
  console.log('\n--- SCÉNARIO 3 : Charlie (Météo NUAGEUX, Canal PUSH) ---');
  const result3 = await triggerWakeUp('user-charlie', 'VENDREDI', 'NUAGEUX', container);
  console.log('Résultat :', {
    user: result3.userId,
    morceau: `"${result3.track.title}" par ${result3.track.artist}`,
    sourceMusique: result3.musicSource,
    canalUtilise: result3.channelUsed,
    modeDegradeMusique: result3.isDegradedMusicMode,
  });

  console.log('\n' + '='.repeat(70));
  console.log('✅ Démonstration terminée avec succès !');
  console.log('='.repeat(70));
}

// Exécution directe si appelé depuis node ou tsx
if (
  process.argv[1] &&
  (process.argv[1].endsWith('index.ts') || process.argv[1].endsWith('index.js'))
) {
  main().catch((err) => {
    console.error('Erreur lors de la démonstration :', err);
    process.exit(1);
  });
}
