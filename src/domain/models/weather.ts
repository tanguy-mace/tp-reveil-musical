/**
 * Types de météo supportés par le service Réveil Musical.
 * Reçus en entrée de l'appel déclencheur (aucun appel météo externe).
 */
export type WeatherType = 'SOLEIL' | 'PLUIE' | 'NEIGE' | 'NUAGEUX';

export const ALL_WEATHER_TYPES: readonly WeatherType[] = [
  'SOLEIL',
  'PLUIE',
  'NEIGE',
  'NUAGEUX',
] as const;

export function isValidWeatherType(value: string): value is WeatherType {
  return ALL_WEATHER_TYPES.includes(value as WeatherType);
}
