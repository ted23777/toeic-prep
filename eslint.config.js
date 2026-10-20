import js from '@eslint/js';
import globals from 'globals';
import security from 'eslint-plugin-security';
import noUnsanitized from 'eslint-plugin-no-unsanitized';

export default [
  { ignores: ['node_modules/'] },
  js.configs.recommended,
  security.configs.recommended,
  noUnsanitized.configs.recommended,
  {
    files: ['site/assets/js/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: globals.browser,
    },
  },
  {
    files: ['tests/**/*.mjs', 'eslint.config.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: globals.node,
    },
  },
  {
    // Faux positifs vérifiés à la main (revue de sécurité) :
    // - detect-object-injection : uniquement des indices numériques internes (mélange du quiz) ;
    // - detect-non-literal-fs-filename : les tests lisent des chemins construits depuis le dépôt.
    rules: {
      'security/detect-object-injection': 'off',
    },
  },
  {
    files: ['tests/**/*.mjs'],
    rules: {
      'security/detect-non-literal-fs-filename': 'off',
    },
  },
  {
    rules: {
      eqeqeq: ['error', 'always'],
      'no-var': 'error',
      'prefer-const': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-script-url': 'error',
      'no-restricted-properties': [
        'error',
        { property: 'innerHTML', message: 'Utiliser les helpers de dom.js (textContent).' },
        { property: 'outerHTML', message: 'Utiliser les helpers de dom.js.' },
        { property: 'insertAdjacentHTML', message: 'Utiliser les helpers de dom.js.' },
      ],
    },
  },
];
