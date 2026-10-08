export type Token = symbol | string;

export type Factory<T> = (container: Container) => T;

/**
 * CONTENEUR D'INVERSION DE CONTRÔLE (IoC Container).
 *
 * RÔLE ARCHITECTURAL :
 * - Permet d'éliminer tout appel à l'opérateur 'new' dans le code métier (Clean Architecture).
 * - Centralise l'assemblage du graphe de dépendances (Composition Root).
 * - Gère le cycle de vie des composants (Singletons, Transient/Factories, Instances préexistantes).
 * - Ne dépend d'aucune bibliothèque tierce (zéro risque légal ou de vulnérabilité).
 */
export class Container {
  private readonly factories = new Map<Token, Factory<unknown>>();
  private readonly singletons = new Map<Token, unknown>();
  private readonly singletonFactories = new Map<Token, Factory<unknown>>();

  /**
   * Enregistre une fabrique appelée à chaque résolution (Transient).
   */
  public bind<T>(token: Token, factory: Factory<T>): this {
    this.factories.set(token, factory as Factory<unknown>);
    return this;
  }

  /**
   * Enregistre un composant instancié de façon paresseuse (Lazy Singleton).
   */
  public bindSingleton<T>(token: Token, factory: Factory<T>): this {
    this.singletonFactories.set(token, factory as Factory<unknown>);
    return this;
  }

  /**
   * Enregistre directement une instance existante.
   */
  public bindInstance<T>(token: Token, instance: T): this {
    this.singletons.set(token, instance);
    return this;
  }

  /**
   * Résout et retourne l'instance associée au token.
   */
  public resolve<T>(token: Token): T {
    // 1. Instance déjà instanciée (Singleton en cache ou bindInstance)
    if (this.singletons.has(token)) {
      return this.singletons.get(token) as T;
    }

    // 2. Fabrique de singleton (première instanciation)
    if (this.singletonFactories.has(token)) {
      const factory = this.singletonFactories.get(token)!;
      const instance = factory(this);
      this.singletons.set(token, instance);
      return instance as T;
    }

    // 3. Fabrique transiente (nouvelle instance à chaque appel)
    if (this.factories.has(token)) {
      const factory = this.factories.get(token)!;
      return factory(this) as T;
    }

    const tokenName = typeof token === 'symbol' ? token.description ?? 'Symbol' : token;
    throw new Error(
      `Impossible de résoudre le token IoC: "${tokenName}". Aucun binding correspondant trouvé.`
    );
  }

  /**
   * Vérifie si un token est enregistré.
   */
  public has(token: Token): boolean {
    return (
      this.singletons.has(token) ||
      this.singletonFactories.has(token) ||
      this.factories.has(token)
    );
  }

  /**
   * Réinitialise le conteneur.
   */
  public clear(): void {
    this.factories.clear();
    this.singletons.clear();
    this.singletonFactories.clear();
  }
}
