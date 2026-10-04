# Cubo Blocks

Puzzle de blocs 8×8 : pose les pièces, remplis lignes/colonnes, enchaîne les combos.

Nom : **Cubo Blocks** (stores), **Cubo** sous l'icône, d'après la mascotte. appId `com.slapps.cubo`, domaine `cuboblocks.app`.

App native iOS / Android en **React Native (Expo SDK 57)**. Le port depuis la version web + Capacitor est en cours,
jalon par jalon : voir `docs/superpowers/specs/2026-10-04-react-native-port-design.md`. L'ancienne version reste dans
`legacy/` comme référence (`npm run legacy` puis http://localhost:8000) jusqu'à la fin du port.

## Lancer

```
npm install
npm run ios          # build + simulateur iOS (Xcode 26.4+)
npm run android      # build + émulateur Android
npm start            # Metro seul, une fois l'app installée
```

## Publier sur TestFlight

`npm run prebuild` (régénère `ios/` et `android/` depuis `app.config.ts`, à refaire après tout changement de config ou de
plugin natif ; ajouter `-- --clean` si un plugin change), puis `npm run xcode` : Product > Archive, puis Distribute App.
Pas d'EAS. `ios/` et `android/` sont committés mais jamais modifiés à la main.

## Vérifier

```
npm run check:unit   # règles du jeu, sauvegardes, i18n (Node, sans simulateur)
npm run check:types
npm run lint
npm run i18n         # textes sans traduction anglaise
npm run balance      # le bot joue chaque niveau d'Aventure (réglage des budgets)
```

## Règles

- 3 pièces dans le bac, chaque pièce posée est remplacée tout de suite.
- Chaque forme a sa couleur (rotations comprises).
- Ligne ou colonne pleine = effacée. Plusieurs d'un coup = bonus triangulaire (10, 30, 60…).
- Combo : chaque pose qui efface augmente le multiplicateur. 3 poses sans rien effacer = combo cassé (les points jaunes).
- Grille entièrement vidée = +300.
- Partie finie quand aucune pièce du bac ne rentre.

### Bonus

~10 % des pièces portent une icône sur un bloc. Effacer ce bloc range le bonus dans l'inventaire
(barre sous le bac, max 3 par type, au-delà +50 pts). On le déclenche quand on veut en touchant son bouton.
Les bonus à durée cumulent (+30 s, plafond 60 s) et le chrono ne tourne que pendant qu'on joue.
Si plus rien ne rentre mais qu'il reste une Bombe, une Tornade ou une Toupie utile, la partie continue (« Bloqué ! ») ; un bouton « Terminer la partie » permet d'arrêter sans les utiliser.

| Nom | Effet |
|---|---|
| Toupie | 30 s : toucher une pièce du bac la fait pivoter |
| Étoile | 30 s : points ×2 |
| Bulle | 30 s : le combo ne casse plus |
| Bombe | Glisser depuis le bouton sur la grille (ou toucher puis viser) : 21 cases (5×5 sans les coins) |
| Tornade | Remplace tout le bac |

Dans le code les ids restent `rotate`, `nitro`, `shield`, `bomb`, `reroll` (compatibilité des sauvegardes).

## Aventure

Menu > Aventure : 8 mondes de 10 niveaux (Plaine, Sous-marin, Espace, Glace, Forêt, Rétro, Arcade, Volcan).
Chaque niveau a un objectif (lignes, points ou cases spéciales à détruire) et un nombre de coups (un chrono en Arcade).
1 à 3 étoiles selon les coups restants. Chaque monde a un avantage et un inconvénient (voir `docs/features/worlds.md`).
Battre le boss (niveau 10) offre le thème du monde et, avec assez d'étoiles, ouvre le monde suivant.
Pièces : +5 coups quand on n'en a plus (20, 40, 80…), partir avec une Bombe (30), passer un niveau (250).
Équilibrage : `node tools/balance.js 10` fait jouer un bot sur les 80 niveaux.
Icônes : `python3 tools/make_icons.py` redessine `icons/*.png` depuis `tools/icons.html`.

## Niveau du jour, série et Profil

- **Niveau du jour** (menu) : le même niveau pour tout le monde ce jour-là, 3 essais, texte à partager après une victoire.
- **Série** : réussir le niveau du jour le jour même fait avancer la série (pièces chaque jour, coffre tous les 7 jours,
  blocs « Or » au 30e). Un gel de série (100 pièces, 2 max) protège un jour manqué.
- **Profil** : album de 26 autocollants et trophées du mois, calendrier pour rattraper les jours passés, statistiques.

## Progression

- **Pièces sur la grille** : ~12 % des pièces du bac portent une pièce (+1) ou un sac (+5) ; effacer le bloc la ramasse.
  En fin de partie s'ajoutent : +10 par grille vide, +5 si combo ×5, +5 si une bombe fait sauter 15 blocs, + missions.
  Recommencer en cours de partie verse aussi les pièces.
- **Pub récompensée** : bouton « Regarder une pub » en fin de partie, double les gains (une fois par partie).
  Dans l'app native : AdMob (`@capacitor-community/admob`) avec le formulaire de consentement Google ; sur le web, une pub simulée. IDs de test Google pour l'instant, voir `docs/features/economy.md`.
- **Légende** : bouton « ? » à côté de l'inventaire, et infobulle au survol sur ordinateur.
- **Missions du jour** : 3 missions différentes par jour (même tirage pour tout le monde ce jour-là), renouvelées à minuit.
  Une mission réussie reste « Terminée » jusqu'au lendemain. Difficulté qui monte toutes les 6 missions réussies.
  Annoncées en jeu quand l'objectif est atteint, payées en fin de partie.
- **Boutique** (bouton pièces en haut à gauche) : skins purement cosmétiques.
  - Blocs : Classique, Néon (200), Pixel (600)
  - Thèmes (tout l'habillage : fond, plateau, score, menus, typo) : Jouet (gratuit), Plaine (150), Sous-marin (300),
    Espace (450), Glace (600), Forêt (800), Rétro (1000), Arcade (1200), Volcan (1500).
    Les thèmes gardent l'id `boards` dans la sauvegarde. Voir `DESIGN.md`.
  - Les anciens thèmes « route » et les blocs Bonbon ont été retirés : `M.migrate` les rembourse au prix d'achat.

## App native (Capacitor)

`npm install` une fois, puis :

- `npm run ios` / `npm run android` : copie `www/` dans le projet natif et l'ouvre dans Xcode / Android Studio.
- `npm run sync` : recopie seulement `www/` après une modif du jeu.
- `npm run assets` : régénère icônes et splash natifs depuis `resources/` (eux-mêmes produits par `tools/make_icons.py`).

iOS : Xcode (les dépendances passent par Swift Package Manager, pas de CocoaPods). Android : Android Studio (JDK 21).

## Tests

`npm test` depuis la racine (Node 18+ ; lance `tests/*.test.js`).

## Architecture

Pour ajouter une fonctionnalité : lire `docs/CLAUDE.md`.

- `www/src/core/logic.js` — règles pures, zéro DOM. `createGame(seed)`, `place(state, trayIndex, row, col)` → `{ state, events }`,
  `rotate(state, trayIndex)`, `use(state, type, target?)` pour l'inventaire, `tick(state, dtMs)` pour les chronos.
  State sérialisable en JSON, RNG seedé dans le state. Réutilisable tel quel dans un `useReducer`.
- `www/src/core/worlds.js` / `www/src/core/levels.js` — règles des mondes et génération des niveaux de l'Aventure (purs).
- `www/src/core/meta.js` — progression pure : `migrate`, `applyLevel`, `worldOpen`, `applyRun(profile, runStats)`, `missionStatus`, `buy`, `equip`, `nextGoal`.
- `www/src/` (hors `core/`) — l'app : rendu canvas, drag, sons (WebAudio), vibrations, sauvegarde `localStorage`,
  un fichier par entité (`themes/`, `mascot/`, `screens/`, `render/`, `game/`, `ui/`...). Ordre de chargement dans `docs/CLAUDE.md`.
