/**
 * Petits utilitaires DOM.
 *
 * Règle de sécurité : on ne construit JAMAIS de HTML à partir de chaînes
 * (pas d'innerHTML / insertAdjacentHTML). Tout le texte passe par des
 * nœuds texte, ce qui rend l'injection de balises impossible.
 */

/** Attributs porteurs d'URL, et préfixes acceptés : ancre, chemin relatif ou https. */
const URL_ATTRIBUTES = new Set(['href', 'src', 'action', 'formaction', 'xlink:href']);
const SAFE_URL = /^(?:#|\.{0,2}\/|https:\/\/)/i;

/**
 * Crée un élément.
 * @param {string} tag
 * @param {Record<string, unknown>} [props] attributs ; `class`, `on` (écouteurs) et booléens gérés
 * @param {...(Node|string|number|null|undefined|false|Array)} children
 * @returns {HTMLElement}
 */
export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value === null || value === undefined || value === false) continue;
    if (key === 'class') {
      el.className = String(value);
    } else if (key === 'on') {
      for (const [type, handler] of Object.entries(value)) {
        el.addEventListener(type, handler);
      }
    } else if (key.startsWith('on')) {
      throw new Error(`Utilisez la propriété "on" pour les écouteurs (${key}).`);
    } else if (key === 'style') {
      throw new Error('Attribut style interdit : utiliser une classe CSS.');
    } else if (URL_ATTRIBUTES.has(key) && !SAFE_URL.test(String(value))) {
      // Défense en profondeur (la CSP bloque déjà javascript:) : seules les ancres,
      // chemins relatifs et URL https sont acceptés.
      throw new Error(`URL refusée pour ${key} : ${value}`);
    } else if (value === true) {
      el.setAttribute(key, '');
    } else {
      el.setAttribute(key, String(value));
    }
  }
  append(el, children);
  return el;
}

/**
 * Ajoute des enfants (nœuds ou texte) à un élément.
 * @param {Node} parent
 * @param {Array} children
 */
export function append(parent, children) {
  for (const child of children.flat(Infinity)) {
    if (child === null || child === undefined || child === false) continue;
    parent.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
}

/** Vide un élément. */
export function clear(el) {
  el.replaceChildren();
}

/**
 * Convertit un texte contenant **gras** en fragment DOM sûr.
 * Seule la syntaxe **…** est interprétée ; tout le reste reste du texte brut.
 * @param {string} text
 * @returns {DocumentFragment}
 */
export function richText(text) {
  const frag = document.createDocumentFragment();
  String(text)
    .split('**')
    .forEach((part, i) => {
      if (!part) return;
      frag.append(i % 2 === 1 ? h('strong', {}, part) : document.createTextNode(part));
    });
  return frag;
}
