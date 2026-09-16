export const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export const getQuestionId = (q) => q.id || `${q.pregunta.slice(0, 40)}_${q.correcta.slice(0, 20)}`;

export const formatTime = (secs) => {
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

/**
 * Reparte `n` preguntas entre varios temas respetando pesos relativos.
 *
 * Usa el método de restos mayores y redistribuye en sucesivas rondas lo que
 * un tema no puede absorber (porque tiene menos preguntas de las que le
 * tocarían) entre los temas que aún tienen capacidad libre.
 *
 * @param {Object<string, number>} capacities  preguntas disponibles por tema
 * @param {number} n                           total de preguntas a repartir
 * @param {Object<string, number>} weights     peso relativo de cada tema (>= 0)
 * @returns {Object<string, number>}           preguntas asignadas a cada tema
 */
export const allocateByWeights = (capacities, n, weights) => {
  const temas = Object.keys(capacities);
  const alloc = Object.fromEntries(temas.map(t => [t, 0]));

  const totalCapacity = temas.reduce((s, t) => s + capacities[t], 0);
  let remaining = Math.min(n, totalCapacity);

  let active = temas.filter(t => (weights[t] ?? 0) > 0 && capacities[t] > 0);

  while (remaining > 0 && active.length > 0) {
    const totalW = active.reduce((s, t) => s + (weights[t] ?? 0), 0);
    if (totalW <= 0) break;

    // Reparto ideal de esta ronda: parte entera primero
    const shares = active.map(t => {
      const raw = (remaining * (weights[t] ?? 0)) / totalW;
      const floor = Math.floor(raw);
      return { tema: t, floor, frac: raw - floor };
    });

    let left = remaining;
    for (const s of shares) {
      const give = Math.min(s.floor, capacities[s.tema] - alloc[s.tema]);
      alloc[s.tema] += give;
      left -= give;
    }

    // Los restos, a quien tenga mayor fracción pendiente
    shares.sort((a, b) => b.frac - a.frac);
    for (const s of shares) {
      if (left <= 0) break;
      if (alloc[s.tema] < capacities[s.tema]) {
        alloc[s.tema] += 1;
        left -= 1;
      }
    }

    if (left === remaining) break; // sin progreso: evita bucle infinito
    remaining = left;
    active = active.filter(t => alloc[t] < capacities[t]);
  }

  return alloc;
};
