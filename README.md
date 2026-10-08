# ⏰ TP — Réveil Musical

> Projet d'architecture logicielle : Conception hexagonale (Ports & Adapters), Design Patterns, Inversion de Contrôle (IoC / DI), Résilience multi-fournisseurs et Audit légal des dépendances.

---

## 📋 Table des Matières

1. [Contexte Métier & Exigences Business](#1-contexte-métier--exigences-business)
2. [Vue d'Ensemble de l'Architecture](#2-vue-densemble-de-larchitecture)
3. [Explications Approfondies des Design Patterns](#3-explications-approfondies-des-design-patterns)
   - [Pattern Adapter (Adaptateur)](#pattern-adapter-adaptateur)
   - [Pattern Strategy (Stratégie)](#pattern-strategy-stratégie)
   - [Pattern Decorator / Proxy (Cache)](#pattern-decorator--proxy-cache)
   - [Pattern Chain of Responsibility / Fallback Composite](#pattern-chain-of-responsibility--fallback-composite)
   - [Pattern Factory / Registry](#pattern-factory--registry)
   - [Inversion de Contrôle (IoC) & Injection de Dépendances (DI)](#inversion-de-contrôle-ioc--injection-de-dépendances-di)
4. [Principes SOLID & Clean Architecture](#4-principes-solid--clean-architecture)
5. [Fiabilité & Garantie Absolue de Non-Silence](#5-fiabilité--garantie-absolue-de-non-silence)
6. [Audit Légal et Fraîcheur des Dépendances](#6-audit-légal-et-fraîcheur-des-dépendances)
7. [Installation, Exécution & Tests](#7-installation-exécution--tests)
8. [Arborescence du Projet](#8-arborescence-du-projet)

---

## 1. Contexte Métier & Exigences Business

Votre entreprise lance **Réveil musical**, un service qui réveille chaque utilisateur avec un morceau choisi selon le jour de la semaine et la météo du jour, puis le prévient sur le canal de son choix (Email, SMS, Push, et futurs canaux comme WhatsApp ou appel vocal).

Les 4 exigences business non négociables sont traduites techniquement comme suit :

| Exigence Business | Contrainte Technique & Règle d'Architecture | Traduction dans le Code |
| :--- | :--- | :--- |
| **Interchangeabilité Musique** | Le fournisseur de musique doit pouvoir changer rapidement sans réécrire le métier. | Port abstrait `MusicProvider` + Pattern **Strategy** + Couche Anti-Corruption (ACL). |
| **Pluralité des Canaux** | Support d'Email, SMS, Push avec interfaces hétérogènes et accueil futur de nouveaux canaux. | Port abstrait `NotificationSender` + Pattern **Adapter** + **Registry** (OCP). |
| **Exigence Légale & Levée de fonds** | Aucun composant sans vérification de licence (zéro copyleft contaminant) et fraîcheur maximale. | **Zéro dépendance de production** (`dependencies: {}`) + audit rigoureux des devDependencies. |
| **Fiabilité Absolue (Non-Silence)** | Une panne d'un fournisseur tiers ne doit jamais empêcher le réveil (mode dégradé acceptable, silence interdit). | **Chain of Responsibility** (`FallbackMusicProvider` avec catalogue local) + **Résilience multi-canal**. |

---

## 2. Vue d'Ensemble de l'Architecture

Le projet respecte les principes de l'**Architecture Hexagonale (Ports & Adapters)** et de la **Clean Architecture** :

```
                                  +---------------------------------------+
                                  |         POINT D'ENTRÉE DU TP          |
                                  |          triggerWakeUp(...)           |
                                  +---------------------------------------+
                                                      |
                                                      v
                               +---------------------------------------------+
                               |              COMPOSITION ROOT               |
                               |            createAppContainer()             |
                               |    (IoC Container : assemble les briques)   |
                               +---------------------------------------------+
                                                      |
                                                      v
+----------------------------------------------------------------------------------------------------------+
| COUCHE APPLICATION                                                                                       |
|   Cas d'usage : WakeUpUserUseCase                                                                        |
|   - Reçoit : (userId, dayOfWeek, weather)                                                                |
|   - AUCUN "new" vers une implémentation concrète (Inversion de contrôle stricte)                         |
|   - Dialogue uniquement au travers des DRIVEN PORTS abstraits                                            |
+----------------------------------------------------------------------------------------------------------+
       |                                      |                                      |
       v (Port)                               v (Port)                               v (Port)
+-----------------------+     +-------------------------------+      +-------------------------------+
| UserProfileProvider   |     | MusicProvider                 |      | NotificationSender            |
+-----------------------+     +-------------------------------+      +-------------------------------+
       ^                                      ^                                      ^
       | Implémentation                       | Implémentation                       | Implémentation
+-----------------------+     +-------------------------------+      +-------------------------------+
| InMemoryUserRepository|     | FallbackMusicProvider         |      | ResilientNotificationSender   |
| (Service interne mock)|     | (Chain of Responsibility)     |      | (Secours multi-canal)         |
+-----------------------+     +-------------------------------+      +-------------------------------+
                                     /        |        \                             |
                                    /         |         \                     +---------------+
                                   /          |          \                    | Registry OCP  |
                                  v           v           v                   +---------------+
                           +------------+ +------------+ +------------+       /       |       \
                           | Cached     | | MusicBrainz| | Local      |      v        v        v
                           | iTunes     | | Provider   | | Fallback   |   [Email]   [SMS]    [Push]
                           | (Decorator)| | (UserAgent)| | (Catalogue)|   Adapter  Adapter  Adapter
                           +------------+ +------------+ +------------+      |        |        |
                                 |              |                            v        v        v
                                 v              v                         [Mock]    [Mock]   [Mock]
                            iTunes API    MusicBrainz API                 Email     Twilio    FCM
                            (HTTP GET)      (HTTP GET)                    Client    Gateway  Service
```

---

## 3. Explications Approfondies des Design Patterns

### Pattern Adapter (Adaptateur)
- **Problème résolu** : Les fournisseurs externes de notification possèdent des interfaces techniques totalement disparates et incompatibles :
  - `MockEmailService` : `sendMail(toEmail, subject, htmlContent)`
  - `MockSmsGateway` : `transmitSms(gsmNumber, textMessage)` renvoyant des codes numériques (`200`, `503`)
  - `MockPushService` : `dispatchPush(deviceToken, { notification: { title, body }, data })`
- **Solution** : Création de 3 adaptateurs (`EmailNotificationAdapter`, `SmsNotificationAdapter`, `PushNotificationAdapter`) qui enveloppent ces mocks et implémentent l'interface commune `NotificationSender` (`send(notification: WakeUpNotification)`).
- **Anti-Corruption Layer (ACL)** :
  - Dans `ItunesMusicProvider`, le champ propriétaire `trackViewUrl` renvoyé par Apple est **strictement filtré et ignoré** pour ne jamais contaminer le modèle métier pur `Track`.
  - Dans `MusicBrainzMusicProvider`, la structure `artist-credit` imbriquée est aplatie et traduite en chaîne de caractères `artist`.

### Pattern Strategy (Stratégie)
- **Problème résolu** : Le board veut pouvoir changer de fournisseur musical ou en tester de nouveaux (Spotify, Deezer, etc.) sans altérer la logique du cas d'usage.
- **Solution** : L'interface `MusicProvider` définit la stratégie commune. `ItunesMusicProvider`, `MusicBrainzMusicProvider` et `LocalFallbackMusicProvider` en sont des stratégies interchangeables à chaud.

### Pattern Decorator / Proxy (Cache)
- **Problème résolu** : L'API iTunes Search impose une limite d'environ **~20 requêtes/minute**. Il faut respecter cette contrainte et optimiser la latence sans modifier le code de `ItunesMusicProvider`.
- **Solution** : La classe `CachedMusicProvider` implémente `MusicProvider` et encapsule une instance cible de `MusicProvider`.
  - Intercepte les appels `searchTrack(query)`.
  - Si la valeur est en mémoire et non expirée (TTL), elle est renvoyée instantanément sans appel réseau.
  - Sinon, elle délègue à l'implémentation sous-jacente et met le résultat en cache.
  - Respecte le principe **Open/Closed (OCP)** : aucune ligne d'iTunes n'est modifiée pour ajouter la mise en cache.

### Pattern Chain of Responsibility / Fallback Composite
- **Problème résolu** : L'entreprise exige qu'une panne de réseau ou un dépassement de quota d'un fournisseur externe n'empêche jamais le réveil de l'utilisateur. **Le silence n'est jamais acceptable**.
- **Solution** : `FallbackMusicProvider` encapsule une chaîne ordonnée de fournisseurs :
  1. `CachedMusicProvider(iTunes)` (primaire, avec cache anti-quota)
  2. `MusicBrainzMusicProvider` (secondaire, en cas de panne ou 0 résultat iTunes)
  3. `LocalFallbackMusicProvider` (catalogue local en dur, secours ultime garantissant qu'un morceau est toujours trouvé)
- Si un maillon lève une exception HTTP (429, 500, 503, DNS) ou retourne `null`, l'erreur est logguée et la requête passe automatiquement au maillon suivant.

### Pattern Factory / Registry
- **Problème résolu** : Pouvoir ajouter de nouveaux canaux (ex: WhatsApp, Appel vocal) dans les mois à venir sans avoir à retoucher le cas d'usage ou introduire des blocs `switch` / `if-else` en dur.
- **Solution** : `NotificationChannelRegistry` enregistre dynamiquement les instances de `NotificationSender`. Le canal souhaité par l'utilisateur est résolu au moment de l'exécution. L'ajout d'un canal WhatsApp se résume à coder `WhatsAppAdapter` et à l'enregistrer dans le registre.

### Inversion de Contrôle (IoC) & Injection de Dépendances (DI)
- **Exigence explicite du sujet** :
  > « IoC / DI : aucune implémentation concrète ne doit être instanciée (`new`). »
- **Solution** :
  - La classe `WakeUpUserUseCase` reçoit toutes ses dépendances par son constructeur : `UserProfileProvider`, `MusicProvider`, `NotificationSender`, `Logger`. **Aucun `new` n'existe dans le métier**.
  - Un conteneur IoC léger et typé (`Container`) a été conçu dans `src/di/container.ts`. Il prend en charge l'enregistrement par identifiant typé (`TOKENS`), la gestion du cycle de vie (Singletons, Transient, Instances) et la résolution paresseuse.
  - La **Composition Root** (`createAppContainer()`) est le seul endroit où les classes concrètes sont instanciées et liées à leurs abstractions.

---

## 4. Principes SOLID & Clean Architecture

- **S (Single Responsibility)** : Chaque classe a une seule raison de changer. `ItunesMusicProvider` ne gère que les requêtes Apple ; `CachedMusicProvider` ne gère que la mise en cache ; `EmailNotificationAdapter` ne gère que la traduction pour l'email.
- **O (Open / Closed)** : Le système est ouvert à l'extension, fermé à la modification. Ajouter un canal WhatsApp ou un fournisseur Spotify ne nécessite aucune modification de `WakeUpUserUseCase`.
- **L (Liskov Substitution)** : N'importe quel `MusicProvider` (qu'il soit iTunes, MusicBrainz, Cache ou Local) peut être substitué sans altérer le comportement du cas d'usage.
- **I (Interface Segregation)** : Les contrats des ports (`MusicProvider`, `NotificationSender`, `UserProfileProvider`, `Logger`) sont restreints et ciblés sur le strict nécessaire.
- **D (Dependency Inversion)** : La couche d'application ne dépend d'aucune technologie concrète (HTTP, console, base de données). Tout dépend d'interfaces abstraites.

---

## 5. Fiabilité & Garantie Absolue de Non-Silence

Le système applique une double résilience systématique :

1. **Résilience Musicale** :
   - Météo non configurée ? Bascule automatique sur le `fallbackTrack` configuré par l'utilisateur.
   - Fournisseur primaire en panne ou quota dépassé ? Bascule automatique sur MusicBrainz.
   - Panne internet globale ? Bascule automatique sur `LocalFallbackMusicProvider` (morceaux pré-intégrés).
   - Erreur critique imprévue ? Filet de sécurité du domaine retournant un morceau de secours sans jamais lever d'exception bloquante.

2. **Résilience Notificationnelle** :
   - Panne du canal préféré de l'utilisateur (ex: SMS rejeté avec erreur 503) ? `ResilientNotificationSender` bascule automatiquement sur le canal de secours (EMAIL).
   - Panne de tous les canaux ? Déclenchement du canal d'urgence système journalisé (`EMERGENCY_SYSTEM_LOG`). L'utilisateur est notifié et le réveil n'est jamais silencieux.

---

## 6. Audit Légal et Fraîcheur des Dépendances

> **Exigence du Board & Levée de fonds** : « Aucun composant externe ne doit être intégré sans vérification préalable de sa licence et de sa fraîcheur. »

### 🛡️ Choix Stratégique de Production : 0 Dépendance Externe !

Pour éliminer **100% des risques juridiques**, des risques de brevets et de contamination par licence copyleft (GPL, AGPL) en production, l'application a été conçue pour s'exécuter **sans aucune dépendance de production** :
- `dependencies: {}` dans `package.json`.
- Requêtes HTTP : API native `fetch` de Node.js (conforme aux standards W3C).
- Conteneur IoC : Implémentation native TypeScript sans framework tiers lourd (ex: pas d'InversifyJS ou Inversify-Props qui introduiraient des dépendances transitives).

### 📦 Inventaire des Dépendances de Développement (`devDependencies`)

Toutes les dépendances ci-dessous sont **strictement cantonnées au développement, au build et aux tests automatisés**. Aucune ne fait partie du livrable exécutable final de production.

| Nom du Package / SDK | Version Installée | Dernière Version Stable | Licence (SPDX) | Type de Licence | Justification & Analyse de Risque |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`typescript`** | `7.0.2` | `7.0.2` | **Apache-2.0** | Permissive | Compilateur officiel TypeScript. Licence Apache-2.0 totalement compatible avec une utilisation commerciale propriétaire. Version la plus récente disponible. |
| **`vitest`** | `5.0.3` | `5.0.3` | **MIT** | Permissive | Framework de test unitaire ultra-rapide basé sur Vite et ESM natif. Licence MIT sans aucune restriction commerciale ni obligation de redistribution. |
| **`@vitest/coverage-v8`** | `5.0.3` | `5.0.3` | **MIT** | Permissive | Outil de génération des rapports de couverture de code basé sur le moteur V8 de Node.js. Licence MIT. |
| **`tsx`** | `4.23.15` | `4.23.15` | **MIT** | Permissive | Exécuteur TypeScript haute performance pour exécuter les scripts de démonstration sans compilation intermédiaire en local. Licence MIT. |
| **`@types/node`** | `26.6.4` | `26.6.4` | **MIT** | Permissive | Définitions de types pour l'API standard de Node.js v26. Licence MIT standard de DefinitelyTyped. |

#### Verdict Légal
- **Licence Copyleft détectée** : **AUCUNE** (0 GPL, 0 LGPL, 0 AGPL).
- **Fraîcheur des composants** : **100% à jour** sur la dernière version stable de la registry npm.
- **Risque juridique pour la levée de fonds** : **NUL (0%)**.

---

## 7. Installation, Exécution & Tests

### Prérequis
- Node.js (version 20+ ou 22+, testé avec Node 26)
- npm

### Installation
```bash
npm install
```

### Lancer la Démonstration Complète
Exécute les 3 scénarios (Alice avec météo SOLEIL/EMAIL, Bob avec météo NEIGE non configurée/morceau secours/SMS, Charlie avec NUAGEUX/PUSH) :
```bash
npm start
```

### Lancer la Suite de Tests Unitaires et d'Intégration
Exécute l'intégralité des 50 tests automatisés avec Vitest :
```bash
npm test
```

### Générer le Rapport de Couverture de Code
```bash
npm run test:coverage
```

### Compiler en JavaScript de Production
```bash
npm run build
node dist/index.js
```

---

## 8. Arborescence du Projet

```
.
├── package.json                              # Configuration des scripts et métadonnées
├── tsconfig.json                             # Configuration TypeScript stricte (ESM, NodeNext)
├── vitest.config.ts                          # Configuration Vitest et couverture V8
├── README.md                                 # Documentation architecturale et audit légal
│
├── src/
│   ├── domain/                               # CŒUR MÉTIER PUR (Agnostique de toute techno)
│   │   ├── models/
│   │   │   ├── weather.ts                    # WeatherType ('SOLEIL', 'PLUIE', 'NEIGE', 'NUAGEUX')
│   │   │   ├── day-of-week.ts                # DayOfWeek ('LUNDI', ...)
│   │   │   ├── track.ts                      # Modèle pur Track (SANS trackViewUrl)
│   │   │   ├── notification.ts               # WakeUpNotification, RecipientInfo, DeliveryResult
│   │   │   ├── user-preferences.ts           # Préférences utilisateur (morceaux météo, canal préféré)
│   │   │   └── wake-up-result.ts             # Résultat d'exécution et traçabilité du réveil
│   │   └── ports/                            # DRIVEN PORTS (Interfaces abstraites du domaine)
│   │       ├── music-provider.port.ts        # Contrat MusicProvider
│   │       ├── notification-sender.port.ts   # Contrat NotificationSender
│   │       ├── user-profile-provider.port.ts # Contrat UserProfileProvider
│   │       └── logger.port.ts                # Contrat Logger
│   │
│   ├── application/                          # COUCHE APPLICATION
│   │   └── use-cases/
│   │       └── wake-up-user.use-case.ts      # Cas d'usage sans aucun "new"
│   │
│   ├── infrastructure/                       # ADAPTATEURS D'INFRASTRUCTURE
│   │   ├── music/
│   │   │   ├── itunes-music-provider.ts      # Strategy / ACL pour l'API iTunes Search
│   │   │   ├── musicbrainz-music-provider.ts # Strategy / ACL pour MusicBrainz avec User-Agent
│   │   │   ├── local-fallback-music-provider.ts # Strategy locale pour garantie de non-silence
│   │   │   ├── cached-music-provider.ts      # Pattern Decorator pour respecter les 20 req/min
│   │   │   └── fallback-music-provider.ts    # Pattern Chain of Responsibility (cascade de secours)
│   │   ├── notifications/
│   │   │   ├── third-party-mocks/            # MOCKS TIERS AVEC INTERFACES VOLONTAIREMENT DIFFÉRENTES
│   │   │   │   ├── mock-email-service.ts     # sendMail(toEmail, subject, htmlContent)
│   │   │   │   ├── mock-sms-gateway.ts       # transmitSms(gsmNumber, textMessage) -> 200/503
│   │   │   │   └── mock-push-service.ts      # dispatchPush(token, { notification, data })
│   │   │   ├── adapters/                     # PATTERN ADAPTER
│   │   │   │   ├── email-notification-adapter.ts
│   │   │   │   ├── sms-notification-adapter.ts
│   │   │   │   └── push-notification-adapter.ts
│   │   │   ├── notification-channel-registry.ts # PATTERN REGISTRY (Résolution OCP dynamique)
│   │   │   └── resilient-notification-sender.ts # PATTERN FALLBACK (Garantie d'envoi multi-canal)
│   │   ├── persistence/
│   │   │   └── in-memory-user-repository.ts  # Service interne mocké des préférences utilisateurs
│   │   └── logging/
│   │       └── console-logger.ts             # Logger console et mémoire
│   │
│   ├── di/                                   # INVERSION DE CONTRÔLE (IoC & DI)
│   │   ├── tokens.ts                         # Tokens d'injection typés
│   │   ├── container.ts                      # Conteneur IoC sans framework externe
│   │   └── container-factory.ts              # COMPOSITION ROOT (Assemble tout le graphe)
│   │
│   └── index.ts                              # Point d'entrée triggerWakeUp(...) et démo console
│
└── tests/                                    # SUITE DE TESTS COMPLÈTE (50 tests, >90% coverage)
    ├── domain/
    │   └── models.test.ts
    ├── application/
    │   └── wake-up-user.use-case.test.ts
    ├── di/
    │   └── container.test.ts
    ├── infrastructure/
    │   ├── music/
    │   │   ├── itunes-music-provider.test.ts
    │   │   ├── musicbrainz-music-provider.test.ts
    │   │   ├── local-fallback-music-provider.test.ts
    │   │   ├── cached-music-provider.test.ts
    │   │   └── fallback-music-provider.test.ts
    │   ├── notifications/
    │   │   └── notification-adapters.test.ts
    │   └── persistence/
    │       └── in-memory-user-repository.test.ts
    └── integration/
        └── wake-up-integration.test.ts
```
