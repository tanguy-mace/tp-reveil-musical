/**
 * Modèle métier représentant un morceau de musique résolu.
 *
 * RÈGLE D'ARCHITECTURE IMPORTANTE :
 * Les détails techniques et spécifiques aux fournisseurs externes (ex: 'trackViewUrl' d'iTunes)
 * sont rigoureusement interdits dans ce modèle métier.
 * Le modèle Track est pur et agnostique.
 */
export interface Track {
  readonly title: string;
  readonly artist: string;
  readonly source: string; // Ex: 'itunes', 'musicbrainz', 'local-fallback'
}

