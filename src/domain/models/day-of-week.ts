/**
 * Jours de la semaine reçus en entrée du cas d'usage.
 */
export type DayOfWeek =
  | 'LUNDI'
  | 'MARDI'
  | 'MERCREDI'
  | 'JEUDI'
  | 'VENDREDI'
  | 'SAMEDI'
  | 'DIMANCHE';

export const ALL_DAYS_OF_WEEK: readonly DayOfWeek[] = [
  'LUNDI',
  'MARDI',
  'MERCREDI',
  'JEUDI',
  'VENDREDI',
  'SAMEDI',
  'DIMANCHE',
] as const;

export function isValidDayOfWeek(value: string): value is DayOfWeek {
  return ALL_DAYS_OF_WEEK.includes(value as DayOfWeek);
}
