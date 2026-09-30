# Gridlock

Puzzle de blocs 8×8 : pose les pièces, remplis lignes/colonnes, enchaîne les combos.

## Jouer

Ouvrir `index.html` dans un navigateur (aucun build, aucune dépendance, marche hors-ligne).

Sur téléphone : `python3 -m http.server 8000` puis `http://<ip-du-mac>:8000` sur le même Wi-Fi,
ou déposer le dossier sur n'importe quel hébergement statique (Netlify Drop, GitHub Pages…).
Une fois ouvert sur iOS, « Ajouter à l'écran d'accueil » pour le mode plein écran.

## Mettre en ligne (GitHub Pages) et jouer hors-ligne

1. Pousser le dossier sur un repo GitHub, puis Settings > Pages > Source : branche `main`, dossier `/ (root)`.
2. Sur iPhone, ouvrir `https://<compte>.github.io/<repo>/` dans Safari, Partager > « Sur l'écran d'accueil ».
3. Lancer une fois depuis l'icône avec du réseau : tout est mis en cache, ensuite ça marche en mode avion.

- `sw.js` met en cache tous les fichiers (liste `ASSETS`). **À chaque mise à jour, incrémenter `CACHE`**
  (`gridlock-v2`, …) sinon le téléphone garde l'ancienne version ; ajouter tout nouveau fichier à `ASSETS`.
- Le service worker ne tourne qu'en http(s) : en ouvrant `index.html` directement, le jeu marche mais sans mode hors-ligne.
- Sur iOS, l'app installée a sa propre sauvegarde, séparée de Safari.

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

## Progression

- **Pièces sur la grille** : ~12 % des pièces du bac portent une pièce (+1) ou un sac (+5) ; effacer le bloc la ramasse.
  En fin de partie s'ajoutent : +10 par grille vide, +5 si combo ×5, +5 si une bombe fait sauter 15 blocs, + missions.
  Recommencer en cours de partie verse aussi les pièces.
- **Pub récompensée** : bouton « Regarder une pub » en fin de partie, double les gains (une fois par partie).
  `src/ads.js` simule la pub ; en React Native, remplacer `showRewarded()` par AdMob rewarded (même promesse).
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

## Tests

`node --test` depuis la racine (Node 18+, aucune dépendance ; lance `tests/*.test.js`).

## Architecture (pour le portage React Native)

Pour ajouter une fonctionnalité : lire `docs/CLAUDE.md`.

- `src/logic.js` — règles pures, zéro DOM. `createGame(seed)`, `place(state, trayIndex, row, col)` → `{ state, events }`,
  `rotate(state, trayIndex)`, `use(state, type, target?)` pour l'inventaire, `tick(state, dtMs)` pour les chronos.
  State sérialisable en JSON, RNG seedé dans le state. Réutilisable tel quel dans un `useReducer`.
- `src/worlds.js` / `src/levels.js` — règles des mondes et génération des niveaux de l'Aventure (purs).
- `src/meta.js` — progression pure : `migrate`, `applyLevel`, `worldOpen`, `applyRun(profile, runStats)`, `missionStatus`, `buy`, `equip`, `nextGoal`.
- `src/main.js` — rendu canvas, drag, sons (WebAudio), vibrations, sauvegarde `localStorage`.
  À remplacer côté RN par Skia / Reanimated + Gesture Handler, `expo-haptics`, `expo-av`, `AsyncStorage`.
