/**
 * Validation du contenu : structure des chapitres, cohérence avec l'index,
 * et absence de HTML dans les textes (le rendu est en texte brut, mais on
 * refuse quand même toute balise pour éviter les mauvaises surprises).
 *
 * Lancer : npm test
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'site');
const ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;
const HTML_TAG = /<\/?[a-z!][^>]*>/i;
const BLOCK_TYPES = new Set(['p', 'list', 'example', 'tip', 'warning', 'table']);

const readJSON = async (rel) => JSON.parse(await readFile(path.join(root, rel), 'utf8'));

const index = await readJSON('data/index.json');
const chapterFiles = (await readdir(path.join(root, 'data/chapters'))).filter((f) => f.endsWith('.json'));

/** Parcourt récursivement toutes les chaînes d'un objet. */
function* strings(value, where = '$') {
  if (typeof value === 'string') yield [value, where];
  else if (Array.isArray(value)) for (const [i, v] of value.entries()) yield* strings(v, `${where}[${i}]`);
  else if (value && typeof value === 'object') for (const [k, v] of Object.entries(value)) yield* strings(v, `${where}.${k}`);
}

function assertNonEmptyString(value, label) {
  assert.equal(typeof value, 'string', `${label} doit être une chaîne`);
  assert.ok(value.trim().length > 0, `${label} ne doit pas être vide`);
}

test('index : identifiants valides et uniques', () => {
  assert.ok(Array.isArray(index.chapters) && index.chapters.length > 0);
  const ids = index.chapters.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length, 'identifiants dupliqués');
  for (const id of ids) assert.match(id, ID_PATTERN);
});

test('index : chaque chapitre a son fichier, et inversement', () => {
  const declared = new Set(index.chapters.map((c) => `${c.id}.json`));
  assert.deepEqual([...declared].sort(), [...chapterFiles].sort());
});

for (const entry of index.chapters) {
  test(`chapitre « ${entry.id} »`, async () => {
    const chapter = await readJSON(`data/chapters/${entry.id}.json`);

    assert.equal(chapter.id, entry.id);
    for (const key of ['title', 'category', 'summary']) {
      assertNonEmptyString(chapter[key], key);
      assert.equal(chapter[key], entry[key], `${key} différent entre l'index et le chapitre`);
    }
    assert.deepEqual(chapter.toeicParts, entry.toeicParts);
    for (const part of chapter.toeicParts) assert.ok(Number.isInteger(part) && part >= 1 && part <= 7);

    assert.ok(Array.isArray(chapter.sections) && chapter.sections.length > 0, 'au moins une section');
    for (const [si, section] of chapter.sections.entries()) {
      assertNonEmptyString(section.heading, `sections[${si}].heading`);
      assert.ok(section.blocks.length > 0, `sections[${si}] vide`);
      for (const [bi, block] of section.blocks.entries()) {
        const label = `sections[${si}].blocks[${bi}]`;
        assert.ok(BLOCK_TYPES.has(block.type), `${label} : type inconnu « ${block.type} »`);
        if (['p', 'tip', 'warning'].includes(block.type)) assertNonEmptyString(block.text, `${label}.text`);
        if ('label' in block) {
          assert.ok(['tip', 'warning'].includes(block.type), `${label} : label réservé aux encadrés`);
          assertNonEmptyString(block.label, `${label}.label`);
        }
        if (block.type === 'example') assertNonEmptyString(block.en, `${label}.en`);
        if (block.type === 'list') assert.ok(block.items.length > 0, `${label} : liste vide`);
        if (block.type === 'table') {
          assert.ok(block.head.length > 0, `${label} : en-tête vide`);
          for (const row of block.rows) assert.equal(row.length, block.head.length, `${label} : ligne de mauvaise largeur`);
        }
      }
    }

    assert.ok(Array.isArray(chapter.quiz) && chapter.quiz.length >= 3, 'au moins 3 questions de quiz');
    for (const [qi, q] of chapter.quiz.entries()) {
      assertNonEmptyString(q.q, `quiz[${qi}].q`);
      assertNonEmptyString(q.explanation, `quiz[${qi}].explanation`);
      assert.ok(q.choices.length >= 2, `quiz[${qi}] : au moins 2 choix`);
      assert.equal(new Set(q.choices).size, q.choices.length, `quiz[${qi}] : choix dupliqués`);
      assert.ok(Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.choices.length, `quiz[${qi}] : answer hors limites`);
    }

    for (const [text, where] of strings(chapter)) {
      assert.doesNotMatch(text, HTML_TAG, `HTML interdit dans ${where}`);
      assert.equal((text.match(/\*\*/g) ?? []).length % 2, 0, `marqueur ** non fermé dans ${where}`);
    }
  });
}

test('parcours : structure et références valides', async () => {
  const data = await readJSON('data/tracks.json');
  const chapterIds = new Set(index.chapters.map((c) => c.id));
  assertNonEmptyString(data.weeklyEffort, 'weeklyEffort');
  assert.ok(data.tracks.length > 0, 'au moins un parcours');
  const ids = data.tracks.map((t) => t.id);
  assert.equal(new Set(ids).size, ids.length, 'identifiants de parcours dupliqués');

  for (const track of data.tracks) {
    assert.match(track.id, ID_PATTERN);
    for (const key of ['title', 'audience', 'summary', 'outcome']) assertNonEmptyString(track[key], `${track.id}.${key}`);
    assert.ok(track.steps.length > 0, `${track.id} : aucune étape`);
    let lastWeek = 0;
    const seen = new Set();
    for (const step of track.steps) {
      assert.ok(chapterIds.has(step.chapter), `${track.id} : chapitre inconnu « ${step.chapter} »`);
      assert.ok(!seen.has(step.chapter), `${track.id} : « ${step.chapter} » apparaît deux fois`);
      seen.add(step.chapter);
      assert.ok(Number.isInteger(step.week) && step.week >= lastWeek, `${track.id} : semaines non ordonnées`);
      lastWeek = step.week;
      assertNonEmptyString(step.why, `${track.id}/${step.chapter}.why`);
    }
  }
  for (const [text, where] of strings(data)) assert.doesNotMatch(text, HTML_TAG, `HTML interdit dans ${where}`);
});

test('chaque chapitre métier figure dans au moins un parcours', async () => {
  const data = await readJSON('data/tracks.json');
  const used = new Set(data.tracks.flatMap((t) => t.steps.map((s) => s.chapter)));
  for (const c of index.chapters.filter((c) => c.category.startsWith('Métier'))) {
    assert.ok(used.has(c.id), `${c.id} n'est dans aucun parcours`);
  }
});

test('index.html : CSP stricte, aucun script inline ni ressource externe', async () => {
  const html = await readFile(path.join(root, 'index.html'), 'utf8');
  assert.match(html, /http-equiv="Content-Security-Policy"/);
  assert.match(html, /default-src 'none'/);
  assert.doesNotMatch(html, /unsafe-inline|unsafe-eval/);
  assert.doesNotMatch(html, /<script(?![^>]*\bsrc=)[^>]*>/i, 'script inline interdit');
  assert.doesNotMatch(html, /<style/i, 'style inline interdit');
  assert.doesNotMatch(html, /\sstyle="/i, 'attribut style interdit');
  assert.doesNotMatch(html, /(?:src|href)="https?:/i, 'ressource externe interdite');
  assert.doesNotMatch(html, /(?:src|href)="\/\//i, 'ressource externe interdite (URL relative au protocole)');
});

test('installation sur téléphone : manifeste et icônes présents', async () => {
  const manifest = await readJSON('manifest.webmanifest');
  assert.equal(manifest.start_url, './', 'start_url relatif (requis sous /<dépôt>/ sur GitHub Pages)');
  for (const icon of manifest.icons) {
    assert.ok(!icon.src.startsWith('/'), `chemin d'icône relatif attendu : ${icon.src}`);
    await readFile(path.join(root, icon.src));
  }
  await readFile(path.join(root, 'assets/apple-touch-icon.png'));
});

test('JavaScript : aucune API d\'injection HTML ni de stockage', async () => {
  const dir = path.join(root, 'assets/js');
  for (const file of await readdir(dir)) {
    // On retire les commentaires : seul le code exécuté compte.
    const code = (await readFile(path.join(dir, file), 'utf8')).replace(/\/\*[\s\S]*?\*\/|^\s*\/\/.*$/gm, '');
    for (const forbidden of ['innerHTML', 'outerHTML', 'insertAdjacentHTML', 'document.write', 'eval(', 'new Function', 'localStorage', 'sessionStorage', 'document.cookie', 'indexedDB']) {
      assert.ok(!code.includes(forbidden), `${file} utilise ${forbidden}`);
    }
  }
});
