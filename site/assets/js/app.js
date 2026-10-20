import { h, clear, richText } from './dom.js';
import { renderQuiz, shuffle } from './quiz.js';

const SITE_NAME = 'TOEIC Prep';
/**
 * Identifiants autorisés (chapitres, parcours) : minuscules, chiffres et tirets, 64 caractères max.
 * Empêche toute manipulation de chemin via l'URL ; regex linéaire et bornée (pas de ReDoS).
 */
const ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;
const TRAINING_SIZE = 10;

const main = document.getElementById('main');
const chapterCache = new Map();
let indexPromise = null;
let tracksPromise = null;

/* ------------------------------------------------------------------ */
/* Données                                                             */
/* ------------------------------------------------------------------ */

async function getJSON(url) {
  // credentials: 'omit' — aucun cookie n'est jamais envoyé.
  const response = await fetch(url, { credentials: 'omit' });
  if (!response.ok) throw new Error(`HTTP ${response.status} sur ${url}`);
  return response.json();
}

function loadIndex() {
  indexPromise ??= getJSON('data/index.json').catch((err) => {
    indexPromise = null; // autorise un nouvel essai
    throw err;
  });
  return indexPromise;
}

function loadTracks() {
  tracksPromise ??= getJSON('data/tracks.json').catch((err) => {
    tracksPromise = null;
    throw err;
  });
  return tracksPromise;
}

async function loadTrack(id) {
  if (!ID_PATTERN.test(id)) return null;
  const data = await loadTracks();
  return data.tracks.find((t) => t.id === id) ?? null;
}

async function loadChapter(id) {
  if (!ID_PATTERN.test(id)) return null;
  const index = await loadIndex();
  // Liste blanche : seul un chapitre déclaré dans l'index peut être chargé.
  if (!index.chapters.some((c) => c.id === id)) return null;
  if (!chapterCache.has(id)) {
    chapterCache.set(id, getJSON(`data/chapters/${id}.json`));
  }
  try {
    return await chapterCache.get(id);
  } catch (err) {
    chapterCache.delete(id);
    throw err;
  }
}

/* ------------------------------------------------------------------ */
/* Rendu des blocs de contenu                                          */
/* ------------------------------------------------------------------ */

const blockRenderers = {
  p: (b) => h('p', {}, richText(b.text)),
  list: (b) => h(b.ordered ? 'ol' : 'ul', {}, b.items.map((item) => h('li', {}, richText(item)))),
  example: (b) =>
    h(
      'div',
      { class: 'example' },
      h('p', { class: 'en', lang: 'en' }, richText(b.en)),
      b.fr ? h('p', { class: 'fr' }, richText(b.fr)) : null,
    ),
  tip: (b) => h('aside', { class: 'tip' }, h('p', {}, h('strong', {}, `${b.label ?? 'Astuce TOEIC'} : `), richText(b.text))),
  warning: (b) => h('aside', { class: 'warning' }, h('p', {}, h('strong', {}, `${b.label ?? 'Piège'} : `), richText(b.text))),
  table: (b) =>
    h(
      'div',
      { class: 'table-wrap' },
      h(
        'table',
        {},
        b.caption ? h('caption', {}, b.caption) : null,
        h('thead', {}, h('tr', {}, b.head.map((cell) => h('th', { scope: 'col' }, cell)))),
        h('tbody', {}, b.rows.map((row) => h('tr', {}, row.map((cell) => h('td', {}, richText(cell)))))),
      ),
    ),
};

function renderBlock(block) {
  const render = blockRenderers[block.type];
  if (!render) {
    console.warn(`Type de bloc inconnu : ${block.type}`);
    return null;
  }
  return render(block);
}

/* ------------------------------------------------------------------ */
/* Vues                                                                */
/* ------------------------------------------------------------------ */

/** Construit la description d'une page ; c'est le routeur qui l'affiche. */
function page(title, ...nodes) {
  return { title, nodes };
}

function setPage({ title, nodes }) {
  document.title = title ? `${title} · ${SITE_NAME}` : SITE_NAME;
  clear(main);
  main.append(...nodes.flat().filter(Boolean));
  window.scrollTo(0, 0);
  main.focus({ preventScroll: true });
  updateActiveNav();
}

function updateActiveNav() {
  const hash = location.hash || '#/';
  document.querySelectorAll('.nav-list a').forEach((link) => {
    const target = link.getAttribute('href');
    const active = target === '#/' ? hash === '#/' || hash.startsWith('#/chapitre/') : hash.startsWith(target);
    if (active) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
}

function partsLabel(parts) {
  if (!parts?.length) return null;
  return `Parties ${parts.join(', ')}`;
}

function trackCard(track) {
  return h(
    'li',
    {},
    h(
      'a',
      { class: 'card card-track', href: `#/parcours/${track.id}` },
      h('span', { class: 'card-title' }, track.title),
      h('span', { class: 'card-summary' }, track.audience),
      h('span', { class: 'badge' }, `${new Set(track.steps.map((s) => s.week)).size} semaines · ${track.steps.length} étapes`),
    ),
  );
}

async function viewHome() {
  const [index, tracksData] = await Promise.all([loadIndex(), loadTracks()]);
  const groups = new Map();
  for (const chapter of index.chapters) {
    if (!groups.has(chapter.category)) groups.set(chapter.category, []);
    groups.get(chapter.category).push(chapter);
  }

  return page(
    null,
    h(
      'section',
      { class: 'hero' },
      h('h1', {}, 'Préparer le TOEIC, chapitre par chapitre'),
      h(
        'p',
        { class: 'lead' },
        `${index.chapters.length} fiches de cours avec un quiz corrigé à la fin de chacune. `,
        'Pas de compte, pas de cookie, rien n’est enregistré.',
      ),
      h(
        'div',
        { class: 'actions' },
        h('a', { class: 'btn btn-primary', href: '#/parcours' }, 'Choisir un parcours métier'),
        h('a', { class: 'btn', href: '#/entrainement' }, 'Entraînement aléatoire'),
      ),
    ),
    h(
      'section',
      { class: 'category' },
      h('h2', {}, 'Parcours métier'),
      h('ul', { class: 'cards' }, tracksData.tracks.map(trackCard)),
    ),
    ...[...groups].map(([category, chapters]) =>
      h(
        'section',
        { class: 'category' },
        h('h2', {}, category),
        h(
          'ul',
          { class: 'cards' },
          chapters.map((c) =>
            h(
              'li',
              {},
              h(
                'a',
                { class: 'card', href: `#/chapitre/${c.id}` },
                h('span', { class: 'card-title' }, c.title),
                h('span', { class: 'card-summary' }, c.summary),
                c.toeicParts?.length ? h('span', { class: 'badge' }, partsLabel(c.toeicParts)) : null,
              ),
            ),
          ),
        ),
      ),
    ),
  );
}

async function viewChapter(id) {
  const chapter = await loadChapter(id);
  if (!chapter) return viewNotFound();

  const index = await loadIndex();
  const pos = index.chapters.findIndex((c) => c.id === id);
  const prev = index.chapters[pos - 1];
  const next = index.chapters[pos + 1];

  const sectionId = (i) => `section-${i + 1}`;

  return page(
    chapter.title,
    h(
      'nav',
      { class: 'breadcrumb', 'aria-label': 'Fil d’Ariane' },
      h('a', { href: '#/' }, 'Chapitres'),
      ' / ',
      h('span', { 'aria-current': 'page' }, chapter.title),
    ),
    h(
      'article',
      { class: 'chapter' },
      h(
        'header',
        {},
        h('p', { class: 'eyebrow' }, chapter.category, chapter.toeicParts?.length ? ` · ${partsLabel(chapter.toeicParts)}` : ''),
        h('h1', {}, chapter.title),
        h('p', { class: 'lead' }, richText(chapter.summary)),
      ),
      h(
        'nav',
        { class: 'toc', 'aria-label': 'Sommaire du chapitre' },
        h('h2', {}, 'Sommaire'),
        h(
          'ol',
          {},
          chapter.sections.map((s, i) => h('li', {}, h('a', { href: `#${sectionId(i)}`, 'data-anchor': sectionId(i) }, s.heading))),
          chapter.quiz?.length ? h('li', {}, h('a', { href: '#quiz', 'data-anchor': 'quiz' }, 'Quiz')) : null,
        ),
      ),
      chapter.sections.map((s, i) =>
        h('section', { id: sectionId(i), class: 'lesson' }, h('h2', {}, s.heading), s.blocks.map(renderBlock)),
      ),
      chapter.quiz?.length
        ? h('section', { id: 'quiz', class: 'quiz-section' }, renderQuiz(chapter.quiz, { title: 'Quiz du chapitre' }))
        : null,
    ),
    h(
      'nav',
      { class: 'pager', 'aria-label': 'Chapitres voisins' },
      prev ? h('a', { class: 'btn', href: `#/chapitre/${prev.id}`, rel: 'prev' }, '← ', prev.title) : h('span'),
      next ? h('a', { class: 'btn', href: `#/chapitre/${next.id}`, rel: 'next' }, next.title, ' →') : h('span'),
    ),
  );
}

async function viewTracks() {
  const data = await loadTracks();
  return page(
    'Parcours métier',
    h(
      'section',
      { class: 'hero hero-small' },
      h('h1', {}, 'Parcours métier'),
      h(
        'p',
        { class: 'lead' },
        `Six semaines pour préparer le TOEIC tout en apprenant l’anglais de votre métier. Rythme conseillé : ${data.weeklyEffort}.`,
      ),
    ),
    h('ul', { class: 'cards' }, data.tracks.map(trackCard)),
  );
}

async function viewTrack(id) {
  const track = await loadTrack(id);
  if (!track) return viewNotFound();
  const [index, data] = await Promise.all([loadIndex(), loadTracks()]);
  const byId = new Map(index.chapters.map((c) => [c.id, c]));

  const weeks = new Map();
  for (const step of track.steps) {
    if (!weeks.has(step.week)) weeks.set(step.week, []);
    weeks.get(step.week).push(step);
  }

  return page(
    `Parcours ${track.title}`,
    h(
      'nav',
      { class: 'breadcrumb', 'aria-label': 'Fil d’Ariane' },
      h('a', { href: '#/parcours' }, 'Parcours'),
      ' / ',
      h('span', { 'aria-current': 'page' }, track.title),
    ),
    h(
      'article',
      { class: 'chapter' },
      h(
        'header',
        {},
        h('p', { class: 'eyebrow' }, `Parcours métier · ${weeks.size} semaines · ${data.weeklyEffort}`),
        h('h1', {}, track.title),
        h('p', { class: 'lead' }, track.summary),
        h('p', {}, h('strong', {}, 'Pour qui : '), track.audience),
        h('p', {}, h('strong', {}, 'À la fin : '), track.outcome),
      ),
      [...weeks].map(([week, steps]) =>
        h(
          'section',
          { class: 'week' },
          h('h2', {}, `Semaine ${week}`),
          h(
            'ol',
            { class: 'steps' },
            steps.map((step) => {
              const chapter = byId.get(step.chapter);
              if (!chapter) return null;
              return h(
                'li',
                {},
                h('a', { class: 'step-link', href: `#/chapitre/${chapter.id}` }, chapter.title),
                h('span', { class: 'step-category' }, chapter.category),
                h('p', { class: 'step-why' }, step.why),
              );
            }),
          ),
        ),
      ),
      h(
        'section',
        { class: 'week' },
        h('h2', {}, 'Bilan'),
        h('p', {}, 'Faites une série de questions tirées des chapitres de ce parcours, puis un test blanc complet en conditions réelles.'),
        h('a', { class: 'btn btn-primary', href: `#/entrainement/${track.id}` }, 'S’entraîner sur ce parcours'),
      ),
    ),
  );
}

async function viewTraining(trackId) {
  const index = await loadIndex();
  let track = null;
  if (trackId) {
    track = await loadTrack(trackId);
    if (!track) return viewNotFound();
  }
  const ids = track ? [...new Set(track.steps.map((s) => s.chapter))] : index.chapters.map((c) => c.id);
  const chapters = await Promise.all(ids.map((id) => loadChapter(id)));
  const pool = chapters
    .filter(Boolean)
    .flatMap((c) => (c.quiz ?? []).map((q) => ({ ...q, source: c.title })));
  const selection = shuffle(pool).slice(0, TRAINING_SIZE);

  const container = h('div', {}, renderQuiz(selection, { title: `${selection.length} questions au hasard` }));
  const again = h(
    'button',
    { type: 'button', class: 'btn', on: { click: () => route() } },
    'Nouvelle série',
  );

  const scope = track ? `du parcours ${track.title}` : 'du site';
  return page(
    track ? `Entraînement ${track.title}` : 'Entraînement',
    h(
      'section',
      { class: 'hero hero-small' },
      h('h1', {}, track ? `Entraînement : ${track.title}` : 'Entraînement'),
      h('p', { class: 'lead' }, `Questions tirées au hasard parmi les ${pool.length} ${scope}. Rien n’est enregistré.`),
      h(
        'div',
        { class: 'actions' },
        again,
        track ? h('a', { class: 'btn', href: `#/parcours/${track.id}` }, 'Retour au parcours') : null,
      ),
    ),
    container,
  );
}

function viewAbout() {
  return page(
    'À propos',
    h(
      'article',
      { class: 'chapter' },
      h('h1', {}, 'À propos'),
      h('h2', {}, 'Vie privée'),
      h(
        'ul',
        {},
        h('li', {}, 'Aucun compte, aucun formulaire, aucun cookie.'),
        h('li', {}, 'Aucun outil de mesure d’audience, aucune police ou bibliothèque chargée depuis un service tiers.'),
        h('li', {}, 'Les réponses aux quiz restent dans votre navigateur et disparaissent quand vous quittez la page.'),
        h(
          'li',
          {},
          'Seul l’hébergeur (GitHub Pages) reçoit, comme pour tout site web, les journaux techniques de connexion (adresse IP, navigateur).',
        ),
      ),
      h('h2', {}, 'Le TOEIC Listening & Reading'),
      h(
        'p',
        {},
        'Ce site couvre l’épreuve Listening & Reading : 200 questions en 2 heures, score de 10 à 990. ',
        'Le contenu est original et indépendant ; TOEIC est une marque d’ETS, qui n’est pas associée à ce projet.',
      ),
      h('h2', {}, 'Signaler une erreur'),
      h('p', {}, 'Le code et le contenu sont publics : ouvrez une issue sur le dépôt GitHub du projet.'),
    ),
  );
}

function viewNotFound() {
  return page(
    'Page introuvable',
    h(
      'section',
      { class: 'hero hero-small' },
      h('h1', {}, 'Page introuvable'),
      h('p', {}, 'Cette page n’existe pas ou a été déplacée.'),
      h('a', { class: 'btn btn-primary', href: '#/' }, 'Retour aux chapitres'),
    ),
  );
}

function viewError(err) {
  console.error(err);
  return page(
    'Erreur',
    h(
      'section',
      { class: 'hero hero-small' },
      h('h1', {}, 'Le contenu n’a pas pu être chargé'),
      h('p', {}, 'Vérifiez votre connexion puis réessayez.'),
      h('button', { type: 'button', class: 'btn btn-primary', on: { click: () => route() } }, 'Réessayer'),
    ),
  );
}

/* ------------------------------------------------------------------ */
/* Routeur (hash) — compatible GitHub Pages sans configuration         */
/* ------------------------------------------------------------------ */

let routeSeq = 0;

function decodeParam(param) {
  try {
    return decodeURIComponent(param);
  } catch {
    return null; // encodage invalide (ex. « %E0 »)
  }
}

async function resolveView(view, rawParam) {
  const param = decodeParam(rawParam);
  if (param === null) return viewNotFound();
  if (view === '') return viewHome();
  if (view === 'chapitre') return viewChapter(param);
  if (view === 'parcours') return param ? viewTrack(param) : viewTracks();
  if (view === 'entrainement') return viewTraining(param || null);
  if (view === 'a-propos') return viewAbout();
  return viewNotFound();
}

async function route() {
  const hash = location.hash || '#/';

  // Ancres internes à un chapitre (#section-2, #quiz) : on ne change pas de vue.
  if (!hash.startsWith('#/')) return;

  // Chaque navigation reçoit un numéro : si l'utilisateur a navigué entre-temps,
  // le résultat d'un chargement plus lent est ignoré au lieu d'écraser la page.
  const seq = ++routeSeq;
  const [, view = '', param = ''] = hash.slice(1).split('/');
  let result;
  try {
    result = await resolveView(view, param);
  } catch (err) {
    result = viewError(err);
  }
  if (seq === routeSeq) setPage(result);
}

// Les liens du sommaire défilent vers la section sans casser la route du chapitre.
main.addEventListener('click', (event) => {
  const link = event.target.closest('a[data-anchor]');
  if (!link) return;
  event.preventDefault();
  const target = document.getElementById(link.dataset.anchor);
  if (target) {
    target.setAttribute('tabindex', '-1');
    target.scrollIntoView({ block: 'start' });
    target.focus({ preventScroll: true });
  }
});

window.addEventListener('hashchange', route);
route();
