import { h, richText } from './dom.js';

let quizCounter = 0;

/**
 * Mélange une copie du tableau (Fisher–Yates).
 * @template T
 * @param {T[]} items
 * @returns {T[]}
 */
export function shuffle(items) {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Construit un quiz à choix unique. Aucune donnée n'est envoyée ni stockée :
 * les réponses restent dans la page et disparaissent au rechargement.
 *
 * @param {Array<{q: string, choices: string[], answer: number, explanation: string, source?: string}>} questions
 * @param {{ title?: string }} [options]
 * @returns {HTMLElement}
 */
export function renderQuiz(questions, { title = 'Quiz' } = {}) {
  quizCounter += 1;
  const quizId = `quiz-${quizCounter}`;
  const status = h('p', { class: 'quiz-score', role: 'status', 'aria-live': 'polite' });

  const items = questions.map((question, qi) => {
    const name = `${quizId}-q${qi}`;
    const feedback = h('div', { class: 'feedback', hidden: true });
    const options = question.choices.map((choice, ci) => {
      const id = `${name}-c${ci}`;
      return h(
        'div',
        { class: 'choice' },
        h('input', { type: 'radio', id, name, value: String(ci) }),
        h('label', { for: id }, choice),
      );
    });
    const fieldset = h(
      'fieldset',
      { class: 'question' },
      h('legend', {}, h('span', { class: 'q-num' }, `${qi + 1}.`), ' ', richText(question.q)),
      question.source ? h('p', { class: 'q-source' }, question.source) : null,
      options,
      feedback,
    );
    return { question, name, fieldset, feedback };
  });

  const form = h('form', { class: 'quiz', 'aria-labelledby': `${quizId}-title`, novalidate: true });
  const checkBtn = h('button', { type: 'submit', class: 'btn btn-primary' }, 'Vérifier mes réponses');
  const resetBtn = h('button', { type: 'button', class: 'btn', hidden: true }, 'Recommencer');

  form.append(
    h('h2', { id: `${quizId}-title` }, title),
    ...items.map((item) => item.fieldset),
    h('div', { class: 'quiz-actions' }, checkBtn, resetBtn),
    status,
  );

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    let score = 0;
    for (const { question, name, fieldset, feedback } of items) {
      const selected = form.querySelector(`input[name="${name}"]:checked`);
      const picked = selected ? Number(selected.value) : -1;
      const correct = picked === question.answer;
      if (correct) score += 1;

      fieldset.classList.toggle('is-correct', correct);
      fieldset.classList.toggle('is-wrong', !correct);
      fieldset.querySelectorAll('input').forEach((input) => {
        input.disabled = true;
        const choice = input.closest('.choice');
        choice.classList.toggle('is-answer', Number(input.value) === question.answer);
      });

      const verdict = correct ? 'Correct.' : picked === -1 ? 'Pas de réponse.' : 'Incorrect.';
      feedback.replaceChildren(
        h('p', { class: 'verdict' }, verdict, ' Bonne réponse : ', h('strong', {}, question.choices[question.answer])),
        h('p', {}, richText(question.explanation)),
      );
      feedback.hidden = false;
    }
    status.textContent = `Score : ${score} / ${items.length}`;
    checkBtn.hidden = true;
    resetBtn.hidden = false;
    resetBtn.focus();
  });

  resetBtn.addEventListener('click', () => {
    form.reset();
    for (const { fieldset, feedback } of items) {
      fieldset.classList.remove('is-correct', 'is-wrong');
      fieldset.querySelectorAll('input').forEach((input) => {
        input.disabled = false;
        input.closest('.choice').classList.remove('is-answer');
      });
      feedback.hidden = true;
      feedback.replaceChildren();
    }
    status.textContent = '';
    checkBtn.hidden = false;
    resetBtn.hidden = true;
    form.querySelector('input')?.focus();
  });

  return form;
}
