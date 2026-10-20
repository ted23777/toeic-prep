# TOEIC Prep

Application web de révision du **TOEIC Listening & Reading** et de l'**anglais des affaires** :
26 fiches de cours avec quiz corrigé, 5 **parcours métier** de 6 semaines (IT & Projets, Data & BI, Marketing,
Finance, Audit & Conformité) et un mode d'entraînement aléatoire, global ou par parcours.

- **Aucun compte**, aucun cookie, aucun stockage local, aucun traceur.
- **Aucune dépendance à l'exécution** : HTML, CSS et JavaScript natifs (modules ES).
- **Hébergement gratuit** sur GitHub Pages, déploiement automatique à chaque push.

## Structure

```
site/                    ← seul dossier publié
├── index.html           ← CSP stricte, aucun script inline
├── assets/
│   ├── css/main.css     ← thème clair/sombre automatique, responsive
│   └── js/
│       ├── app.js       ← routeur (#/…), chargement et rendu des chapitres
│       ├── dom.js       ← création sûre d'éléments (jamais d'innerHTML)
│       └── quiz.js      ← quiz à choix unique, sans persistance
└── data/
    ├── index.json       ← liste ordonnée des chapitres
    ├── tracks.json      ← parcours métier (étapes par semaine)
    └── chapters/*.json  ← contenu de chaque chapitre
tests/content.test.mjs   ← validation du contenu et des règles de sécurité
.github/workflows/       ← CI (lint + tests + audit) et déploiement Pages
```

## Lancer en local

Prérequis : Node.js 20+ (pour les outils) et Python 3 (pour le serveur local).

```bash
npm ci            # installe ESLint (développement uniquement)
npm run check     # lint + tests
npm start         # http://127.0.0.1:8000
```

> Ouvrir `index.html` directement (`file://`) ne fonctionne pas : les navigateurs bloquent
> le chargement des fichiers JSON. Passez par `npm start`.

## Publier sur GitHub Pages

1. Créez un dépôt sur GitHub et poussez le projet sur la branche `main`.
2. Dans le dépôt : **Settings → Pages → Build and deployment → Source : GitHub Actions**.
3. Le workflow `Déploiement GitHub Pages` vérifie le code puis publie le dossier `site/`.
   L'adresse s'affiche dans l'onglet **Actions** (`https://<utilisateur>.github.io/<dépôt>/`).

Recommandé : activez aussi **Settings → Code security → Dependabot alerts**, **Private
vulnerability reporting**, et une règle de protection de `main` exigeant le passage de la CI.

## Ajouter ou modifier un chapitre

1. Créez `site/data/chapters/<id>.json` (`id` en minuscules et tirets, ex. `phrasal-verbs`).
2. Ajoutez l'entrée correspondante dans `site/data/index.json` (même `title`, `category`,
   `summary`, `toeicParts`). L'ordre de l'index est l'ordre d'affichage.
3. Lancez `npm test` : toute incohérence est signalée.

Blocs disponibles dans une section :

| `type` | Champs | Rendu |
| --- | --- | --- |
| `p` | `text` | paragraphe |
| `list` | `items`, `ordered?` | liste à puces ou numérotée |
| `example` | `en`, `fr?` | exemple anglais + traduction |
| `tip` | `text`, `label?` | encadré « Astuce TOEIC » (ou le libellé fourni) |
| `warning` | `text`, `label?` | encadré « Piège » (ou le libellé fourni) |
| `table` | `head`, `rows`, `caption?` | tableau |

Questions de quiz : `{ "q", "choices": [...], "answer": <index à partir de 0>, "explanation" }`.

Mise en forme : seul `**gras**` est interprété. Le HTML est refusé par les tests.

## Ajouter ou modifier un parcours

Dans `site/data/tracks.json`, chaque parcours a un `id`, un `title`, une `audience`, un `summary`,
un `outcome` et des `steps` : `{ "week": 1, "chapter": "<id du chapitre>", "why": "…" }`.
Les tests vérifient que chaque chapitre cité existe, que les semaines sont dans l'ordre et que
chaque chapitre « Métier » appartient à au moins un parcours.

URL utiles : `#/parcours`, `#/parcours/<id>`, `#/entrainement/<id>` (questions du parcours).

## Sécurité

Voir [SECURITY.md](SECURITY.md).

## Licence

Code sous licence [MIT](LICENSE). Projet indépendant, non affilié à ETS ; TOEIC est une
marque déposée d'ETS.
