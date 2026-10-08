import { describe, it, expect } from 'vitest';
import { Container } from '../../src/di/container.js';
import { createAppContainer } from '../../src/di/container-factory.js';
import { TOKENS } from '../../src/di/tokens.js';
import { WakeUpUserUseCase } from '../../src/application/use-cases/wake-up-user.use-case.js';

describe('Design Pattern Inversion of Control: Container & Composition Root', () => {
  it('gère les instances transients et singletons', () => {
    const container = new Container();
    const tokenTransient = Symbol('transient');
    const tokenSingleton = Symbol('singleton');

    let counter = 0;
    container.bind(tokenTransient, () => ({ id: ++counter }));
    container.bindSingleton(tokenSingleton, () => ({ id: ++counter }));

    // Transient : nouvelle instance à chaque appel
    const t1 = container.resolve<{ id: number }>(tokenTransient);
    const t2 = container.resolve<{ id: number }>(tokenTransient);
    expect(t1.id).not.toBe(t2.id);

    // Singleton : même instance à chaque appel
    const s1 = container.resolve<{ id: number }>(tokenSingleton);
    const s2 = container.resolve<{ id: number }>(tokenSingleton);
    expect(s1).toBe(s2);
  });

  it('lance une exception si un token n’est pas configuré', () => {
    const container = new Container();
    expect(() => container.resolve('UNREGISTERED_TOKEN')).toThrow(
      /Impossible de résoudre le token IoC/
    );
  });

  it('gère l’enregistrement direct d’instance et le nettoyage (bindInstance & clear)', () => {
    const container = new Container();
    const token = 'instance-token';
    const instance = { name: 'inst' };

    container.bindInstance(token, instance);
    expect(container.has(token)).toBe(true);
    expect(container.resolve(token)).toBe(instance);

    container.clear();
    expect(container.has(token)).toBe(false);
  });

  it('la Composition Root createAppContainer assemble tout le graphe sans aucun new dans le métier', () => {
    const container = createAppContainer();

    expect(container.has(TOKENS.WakeUpUserUseCase)).toBe(true);
    expect(container.has(TOKENS.MusicProvider)).toBe(true);
    expect(container.has(TOKENS.NotificationSender)).toBe(true);
    expect(container.has(TOKENS.UserProfileProvider)).toBe(true);

    const useCase = container.resolve<WakeUpUserUseCase>(TOKENS.WakeUpUserUseCase);
    expect(useCase).toBeInstanceOf(WakeUpUserUseCase);
  });
});
