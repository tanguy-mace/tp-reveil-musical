import { describe, it, expect } from 'vitest';
import {
  isValidWeatherType,
  ALL_WEATHER_TYPES,
} from '../../src/domain/models/weather.js';
import {
  isValidDayOfWeek,
  ALL_DAYS_OF_WEEK,
} from '../../src/domain/models/day-of-week.js';

describe('Domain Models: Weather & DayOfWeek validation', () => {
  it('valide les types de météo autorisés', () => {
    for (const w of ALL_WEATHER_TYPES) {
      expect(isValidWeatherType(w)).toBe(true);
    }
    expect(isValidWeatherType('ORAGE')).toBe(false);
    expect(isValidWeatherType('')).toBe(false);
  });

  it('valide les jours de la semaine autorisés', () => {
    for (const d of ALL_DAYS_OF_WEEK) {
      expect(isValidDayOfWeek(d)).toBe(true);
    }
    expect(isValidDayOfWeek('WEEKEND')).toBe(false);
    expect(isValidDayOfWeek('')).toBe(false);
  });
});

