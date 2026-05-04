/**
 * Capa de persistencia local (localStorage).
 * Supabase sync está en lib/sync.js.
 * Esta capa funciona siempre, con o sin conexión.
 */

const KEYS = {
  history: 'opo_history',
  results: 'opo_results',
  mistakes: 'opo_mistakes',
};

const parse = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
};

export const loadHistory = () => parse(KEYS.history, []);
export const saveHistory = (s) => localStorage.setItem(KEYS.history, JSON.stringify(s));

export const loadMistakes = () => parse(KEYS.mistakes, []);
export const saveMistakes = (m) => localStorage.setItem(KEYS.mistakes, JSON.stringify(m));

export const loadResults = () => {
  const r = parse(KEYS.results, {});
  Object.keys(r).forEach(k => { if (!r[k].optionsCount) r[k].optionsCount = {}; });
  return r;
};
export const saveResults = (r) => localStorage.setItem(KEYS.results, JSON.stringify(r));

export const recordAnswerLocal = (questionId, isCorrect, selectedOption, currentResults) => {
  const results = { ...currentResults };
  if (!results[questionId]) results[questionId] = { correctCount: 0, failCount: 0, optionsCount: {} };
  if (!results[questionId].optionsCount) results[questionId].optionsCount = {};
  if (isCorrect) results[questionId].correctCount += 1;
  else results[questionId].failCount += 1;
  if (selectedOption != null) {
    results[questionId].optionsCount[selectedOption] =
      (results[questionId].optionsCount[selectedOption] || 0) + 1;
  }
  saveResults(results);
  return results;
};

export const clearLocalData = () => Object.values(KEYS).forEach(k => localStorage.removeItem(k));
