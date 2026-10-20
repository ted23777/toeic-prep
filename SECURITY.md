# Sécurité et vie privée

## Modèle de menace

TOEIC Prep est un **site statique** : pas de serveur applicatif, pas de base de données,
pas de compte, pas de formulaire. La surface d'attaque se limite donc à :

1. l'injection de contenu dans la page (XSS) ;
2. le chargement de ressources tierces (traçage, compromission d'un CDN) ;
3. la chaîne de publication (dépôt GitHub, GitHub Actions).

## Mesures en place

| Risque | Mesure |
| --- | --- |
| XSS | Le DOM est construit uniquement avec `createElement` / `textContent` (`site/assets/js/dom.js`). `innerHTML`, `eval` et équivalents sont interdits par ESLint **et** par un test automatique. |
| XSS / ressources tierces | Content Security Policy stricte : `default-src 'none'`, scripts, styles et données uniquement depuis la même origine, aucun `unsafe-inline`. |
| Manipulation de l'URL | Les identifiants de chapitre sont validés par une expression régulière **et** une liste blanche (l'index) avant tout chargement. |
| Fuite d'information | `Referrer-Policy: no-referrer`, requêtes `fetch` avec `credentials: 'omit'`. |
| Collecte de données | Aucun cookie, aucun `localStorage`, aucun analytics, aucune police externe. Les réponses aux quiz restent en mémoire et disparaissent au rechargement. |
| Contenu malformé | Les fichiers JSON sont validés en CI (structure, réponses dans les bornes, absence de balises HTML). |
| Chaîne CI/CD | Actions épinglées par hash de commit, permissions minimales (`contents: read`), `persist-credentials: false`, `npm ci --ignore-scripts`, `npm audit`, Dependabot. Seul le dossier `site/` est publié. |

## Limites connues

- **GitHub Pages ne permet pas de définir des en-têtes HTTP.** La CSP est donc déclarée
  par une balise `<meta>`, qui ne prend pas en charge `frame-ancestors` (protection contre
  l'intégration dans une iframe) ni `X-Content-Type-Options`. Le risque est faible ici
  (aucune action sensible à détourner). Pour les obtenir, placer le site derrière un
  hébergeur qui accepte les en-têtes (Cloudflare Pages, Netlify) : voir le README.
- GitHub, en tant qu'hébergeur, reçoit les journaux de connexion habituels (adresse IP,
  navigateur). Le projet n'y a pas accès.

## Signaler une vulnérabilité

Merci de ne pas ouvrir d'issue publique : utilisez l'onglet **Security → Report a vulnerability**
du dépôt (signalement privé GitHub).
