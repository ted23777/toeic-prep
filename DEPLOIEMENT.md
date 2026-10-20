# Mettre TOEIC Prep en ligne sur GitHub Pages

Durée : **15 à 20 minutes**. Coût : **gratuit**.
Résultat : une adresse `https://<votre-pseudo>.github.io/toeic-prep/` qui s'ouvre sur PC, tablette et
téléphone, et qui se met à jour automatiquement à chaque `git push`.

> Dans tout ce guide, remplacez `<votre-pseudo>` par votre nom d'utilisateur GitHub.
> Les libellés de l'interface GitHub peuvent légèrement varier selon les mises à jour.

---

## Étape 0 — Prérequis (2 min)

- Un compte GitHub.
- **Git** installé : `git --version` dans un terminal doit afficher une version.
  Sinon : <https://git-scm.com/downloads>.
- Le dossier `toeic-prep` décompressé sur votre ordinateur. Il contient déjà un dépôt Git avec
  l'historique des commits (dossier caché `.git`).

Ne mettez **pas** le dossier `node_modules` dans le dépôt : il est déjà exclu par `.gitignore`.

---

## Étape 1 — Créer le dépôt sur GitHub (2 min)

1. Sur <https://github.com/new> :
   - **Repository name** : `toeic-prep` (ce nom apparaîtra dans l'URL).
   - **Visibility** : **Public**.
     GitHub Pages est gratuit pour les dépôts publics. Pour un dépôt privé, il faut un abonnement payant.
   - **Ne cochez rien** (pas de README, pas de .gitignore, pas de licence) : le projet les contient déjà.
2. Cliquez **Create repository**.

---

## Étape 2 — Activer GitHub Pages AVANT le premier envoi (1 min)

C'est l'étape la plus souvent oubliée. Si elle manque, le premier déploiement échoue.

1. Dans le dépôt : **Settings** → **Pages** (menu de gauche).
2. Section **Build and deployment** → **Source** : choisissez **GitHub Actions**.

Rien d'autre à configurer : le fichier `.github/workflows/deploy.yml` fait le reste.

---

## Étape 3 — Envoyer le code (3 min)

Ouvrez un terminal **dans le dossier `toeic-prep`**, puis :

```bash
git remote add origin https://github.com/<votre-pseudo>/toeic-prep.git
git branch -M main
git push -u origin main
```

**Authentification.** GitHub n'accepte plus le mot de passe du compte dans le terminal. Trois options,
de la plus simple à la plus technique :

| Option | Comment |
| --- | --- |
| Git Credential Manager (Windows, inclus avec Git) | Une fenêtre de connexion GitHub s'ouvre au premier `push`. |
| GitHub CLI | `gh auth login`, puis relancez `git push`. |
| Jeton personnel | GitHub → Settings → Developer settings → **Fine-grained tokens**, droits *Contents : Read and write* sur ce seul dépôt, durée limitée. Collez-le à la place du mot de passe. |

> **Variante sans terminal** : GitHub Desktop (<https://desktop.github.com>) → *File* → *Add local
> repository* → choisissez le dossier → *Publish repository* (décochez *Keep this code private*).

---

## Étape 4 — Suivre le déploiement (2 à 3 min)

1. Onglet **Actions** du dépôt : deux workflows démarrent.
   - **CI** : lint, tests, audit.
   - **Déploiement GitHub Pages** : vérifications → préparation du site → publication.
2. Quand les trois jobs du déploiement sont verts, cliquez sur le job **Publication** :
   l'adresse du site s'affiche. C'est aussi visible dans **Settings → Pages**.

Votre site est en ligne à : **`https://<votre-pseudo>.github.io/toeic-prep/`**

---

## Étape 5 — Ouvrir sur téléphone et l'installer comme une application (2 min)

Ouvrez l'adresse dans le navigateur du téléphone. Le site s'adapte automatiquement à l'écran
(menu, cartes et quiz sont prévus pour le tactile, thème sombre suivi automatiquement).

Pour avoir une icône sur l'écran d'accueil, sans passer par un store :

| Téléphone | Manipulation |
| --- | --- |
| **iPhone** (Safari) | Bouton **Partager** → **Sur l'écran d'accueil** → **Ajouter**. |
| **Android** (Chrome) | Menu **⋮** → **Ajouter à l'écran d'accueil** (ou **Installer l'application**). |

L'application s'ouvre alors en plein écran, avec l'icône « TP ».

Pour l'ouvrir facilement sur PC : ajoutez-la à vos favoris, ou dans Chrome/Edge utilisez
l'icône d'installation dans la barre d'adresse.

**Partager l'accès** : envoyez simplement l'URL. Aucun compte n'est nécessaire pour la consulter.

---

## Mettre à jour le site

Modifiez les fichiers, puis :

```bash
npm ci          # une seule fois, installe les outils de vérification
npm run check   # lint + tests : à faire passer avant chaque envoi
git add -A
git commit -m "Ajout du chapitre X"
git push
```

Le site est republié en 1 à 3 minutes. Si un test échoue, le déploiement s'arrête et **l'ancienne
version reste en ligne** : un contenu cassé ne peut pas être publié.

Sur téléphone, si l'ancienne version s'affiche encore : rechargez la page. GitHub Pages met en cache
les fichiers une dizaine de minutes.

---

## En cas de problème

| Symptôme | Cause probable | Solution |
| --- | --- | --- |
| Le job *Préparation du site* échoue avec « Get Pages site failed » ou « Not Found » | Pages n'était pas activé au moment du push | Étape 2, puis **Actions** → *Déploiement GitHub Pages* → **Run workflow** |
| Page 404 sur l'URL | Déploiement pas encore terminé, ou mauvaise adresse | Attendez la fin du workflow ; vérifiez l'URL exacte dans **Settings → Pages** (avec `/toeic-prep/` à la fin) |
| Page blanche ou « Le contenu n'a pas pu être chargé » | Site ouvert depuis le disque (`file://`) | Utilisez l'URL GitHub Pages, ou `npm start` en local |
| `git push` refusé (« Authentication failed ») | Mot de passe de compte utilisé | Voir les options d'authentification à l'étape 3 |
| `git push` refusé (« rejected… fetch first ») | Le dépôt GitHub a été créé avec un README | `git pull --rebase origin main` puis `git push` |
| Job *Publication* bloqué « waiting » ou refusé | Règle de protection de l'environnement `github-pages` | **Settings → Environments → github-pages** : autoriser la branche `main` |
| La CI échoue sur `npm audit` | Nouvelle vulnérabilité dans un outil de développement | Acceptez la pull request Dependabot correspondante, ou `npm update` puis commit |

---

## Recommandé une fois en ligne (5 min)

Dans **Settings** du dépôt :

- **Pages** → cochez **Enforce HTTPS** (normalement déjà actif sur `github.io`).
- **Code security** → activez **Dependabot alerts**, **Dependabot security updates** et
  **Private vulnerability reporting** (utilisé par `SECURITY.md`).
- **Rules** → **Rulesets** → nouvelle règle sur `main` : *Require status checks to pass* (job
  « Lint, tests et audit ») et *Block force pushes*.
- **Actions** → **General** → *Workflow permissions* : **Read repository contents** (lecture seule
  par défaut ; les workflows demandent eux-mêmes les droits nécessaires).

### Option : nom de domaine personnalisé

Si vous possédez un domaine (ex. `toeic.mon-domaine.fr`) : **Settings → Pages → Custom domain**,
puis créez chez votre registrar un enregistrement **CNAME** `toeic` → `<votre-pseudo>.github.io`.
Vérifiez d'abord le domaine dans les paramètres de votre compte GitHub (*Pages → Verified domains*)
pour éviter qu'un tiers puisse le détourner.
