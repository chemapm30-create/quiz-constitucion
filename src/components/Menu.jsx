import { useState, useMemo } from 'react';
import { Layout, Target, BookOpen, Trophy, AlertCircle, Flame, EyeOff, BarChart3, SkipForward, Play, CheckSquare, Square, CheckCheck } from 'lucide-react';

const MODE_CARDS = [
  {
    mode: 'simulacro',
    label: 'Simulacro',
    icon: Trophy,
    color: 'yellow',
    desc: (n) => `${n} preguntas para ponerte a prueba`,
    enabled: () => true,
  },
  {
    mode: 'all',
    label: 'Modo Libre',
    icon: Layout,
    color: 'indigo',
    desc: (n) => `${n} preguntas al azar`,
    enabled: () => true,
  },
  {
    mode: 'least_seen',
    label: 'Menos Vistas',
    icon: EyeOff,
    color: 'emerald',
    desc: (n) => `${n} menos practicadas`,
    enabled: () => true,
  },
  {
    mode: 'mistakes',
    label: 'Mis Fallos',
    icon: Target,
    color: 'red',
    desc: (n, _, mistakes) => mistakes.length === 0 ? 'Sin fallos pendientes' : `${mistakes.length} por repasar`,
    enabled: (_, mistakes) => mistakes.length > 0,
  },
  {
    mode: 'hard',
    label: 'Críticas',
    icon: Flame,
    color: 'orange',
    desc: (n, hardCount) => hardCount === 0 ? '¡Todo bajo control!' : `≥2 fallos: ${hardCount} pregs.`,
    enabled: (hardCount) => hardCount > 0,
  },
  {
    mode: 'most_failed_pct',
    label: 'Peor %',
    icon: BarChart3,
    color: 'pink',
    desc: (n, _, __, mostFailedPctCount) => mostFailedPctCount === 0 ? 'Sin preguntas falladas' : `${n} con mayor % fallo`,
    enabled: (_, __, mostFailedPctCount) => mostFailedPctCount > 0,
  },
  {
    mode: 'skipped_qs',
    label: 'Omitidas',
    icon: SkipForward,
    color: 'purple',
    desc: (n, _, __, ___, skippedList) => skippedList.length === 0 ? 'Sin omitidas' : `${skippedList.length} sin responder`,
    enabled: (_, __, ___, skippedList) => skippedList.length > 0,
  },
];

const COLOR_MAP = {
  yellow:  { border: 'hover:border-yellow-500',  icon: 'bg-yellow-500/10 text-yellow-400',  hover: 'group-hover:bg-yellow-500' },
  indigo:  { border: 'hover:border-indigo-500',  icon: 'bg-indigo-500/10 text-indigo-400',  hover: 'group-hover:bg-indigo-500' },
  emerald: { border: 'hover:border-emerald-500', icon: 'bg-emerald-500/10 text-emerald-400', hover: 'group-hover:bg-emerald-500' },
  red:     { border: 'hover:border-red-500',     icon: 'bg-red-500/10 text-red-400',        hover: 'group-hover:bg-red-500' },
  orange:  { border: 'hover:border-orange-500',  icon: 'bg-orange-500/10 text-orange-400',  hover: 'group-hover:bg-orange-500' },
  pink:    { border: 'hover:border-pink-500',    icon: 'bg-pink-500/10 text-pink-400',      hover: 'group-hover:bg-pink-500' },
  purple:  { border: 'hover:border-purple-500',  icon: 'bg-purple-500/10 text-purple-400',  hover: 'group-hover:bg-purple-500' },
};

export default function Menu({ allQuestions, temasDisponibles, questionResults = {}, mistakes = [], skippedList = [], onStart, instantFeedback, setInstantFeedback }) {
  const [nPreguntas, setNPreguntas] = useState(30);
  const [inputValue, setInputValue] = useState('30');
  const [selectedTopics, setSelectedTopics] = useState(new Set());

  const setN = (n) => {
    setNPreguntas(n);
    setInputValue(String(n));
  };

  const getQuestionId = (q) => q.id || q.pregunta;

  const hardQuestionsCount = allQuestions.filter(q => {
    const res = questionResults[getQuestionId(q)];
    return res && res.failCount >= 2 && res.failCount >= res.correctCount;
  }).length;

  const mostFailedPctCount = allQuestions.filter(q => {
    const res = questionResults[getQuestionId(q)];
    return res && res.failCount > 0;
  }).length;

  const totalSeen = Object.keys(questionResults).length;
  const totalCorrectPct = totalSeen > 0
    ? Math.round(Object.values(questionResults).filter(r => r.correctCount > 0).length / totalSeen * 100)
    : null;

  // Datos por tema (memoizados para no recalcular en cada render)
  const topicStats = useMemo(() => {
    return temasDisponibles.map(tema => {
      const topicQs = allQuestions.filter(q => q.tema === tema);
      const count = topicQs.length;
      const results = topicQs
        .map(q => questionResults[q.id || `${q.pregunta.slice(0, 40)}_${q.correcta.slice(0, 20)}`])
        .filter(Boolean);
      const seen = results.length;
      const correct = results.filter(r => r.correctCount > 0).length;
      const seenPct = Math.round((seen / count) * 100);
      const correctPct = seen > 0 ? Math.round((correct / seen) * 100) : null;
      return { tema, count, seen, correct, seenPct, correctPct };
    });
  }, [temasDisponibles, allQuestions, questionResults]);

  // Multi-select helpers
  const allSelected = selectedTopics.size === temasDisponibles.length;
  const someSelected = selectedTopics.size > 0;

  const toggleTopic = (tema) => {
    setSelectedTopics(prev => {
      const next = new Set(prev);
      if (next.has(tema)) next.delete(tema);
      else next.add(tema);
      return next;
    });
  };

  const toggleAll = () => {
    if (allSelected) setSelectedTopics(new Set());
    else setSelectedTopics(new Set(temasDisponibles));
  };

  const availableCount = useMemo(
    () => allQuestions.filter(q => selectedTopics.has(q.tema)).length,
    [allQuestions, selectedTopics]
  );
  const questionsToRun = Math.min(nPreguntas, availableCount);

  if (allQuestions.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-10 border-2 border-dashed border-gray-900 rounded-3xl">
        <AlertCircle className="w-16 h-16 text-gray-800 mb-6" />
        <h2 className="text-2xl font-bold mb-2">No hay preguntas</h2>
        <p className="text-gray-500 max-w-sm">No se pudieron cargar las preguntas.</p>
      </div>
    );
  }

  const maxAll = allQuestions.length;
  const numFuentes = new Set(allQuestions.map(q => q.fuente).filter(Boolean)).size;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-100">Constitución Española</h1>
          <p className="text-gray-500 text-sm mt-0.5">{allQuestions.length.toLocaleString()} preguntas · {numFuentes} {numFuentes === 1 ? 'fuente' : 'fuentes'}</p>
        </div>
        {totalCorrectPct !== null && (
          <div className="text-right shrink-0">
            <div className={`text-2xl font-black ${totalCorrectPct >= 70 ? 'text-green-400' : totalCorrectPct >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
              {totalCorrectPct}%
            </div>
            <div className="text-[10px] text-gray-600">{totalSeen} vistas</div>
          </div>
        )}
      </div>

      {/* Configuración */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
        <div className="text-xs text-gray-500 font-bold uppercase mb-3">Preguntas por test</div>
        <div className="flex gap-2 mb-3 flex-wrap">
          {[10, 20, 30, 50, 100].filter(n => n <= maxAll).map(n => (
            <button
              key={n}
              onClick={() => setN(n)}
              className={`px-3.5 py-1.5 rounded-full text-sm font-bold border transition-all
                ${nPreguntas === n ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-indigo-500'}`}
            >
              {n}
            </button>
          ))}
          <button
            onClick={() => setN(maxAll)}
            className={`px-3.5 py-1.5 rounded-full text-sm font-bold border transition-all
              ${nPreguntas === maxAll ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-indigo-500'}`}
          >
            Todas
          </button>
        </div>
        <input
          type="range" min={5} max={maxAll} value={nPreguntas}
          onChange={e => setN(Number(e.target.value))}
          className="w-full accent-indigo-500"
        />
        <div className="flex items-center justify-center gap-2 mt-1 mb-4">
          <input
            type="number"
            min={1}
            max={maxAll}
            value={inputValue}
            onChange={e => {
              setInputValue(e.target.value);
              const v = parseInt(e.target.value, 10);
              if (!isNaN(v) && v >= 1) setNPreguntas(Math.min(v, maxAll));
            }}
            onBlur={() => {
              const v = parseInt(inputValue, 10);
              const clamped = isNaN(v) || v < 1 ? 1 : Math.min(v, maxAll);
              setN(clamped);
            }}
            className="w-20 text-center bg-gray-800 border border-gray-700 focus:border-indigo-500 text-indigo-400 font-bold text-sm rounded-xl px-2 py-1 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <span className="text-gray-500 text-sm">preguntas</span>
        </div>

        <div className="flex items-center justify-between border-t border-gray-800 pt-4">
          <div>
            <div className="font-bold text-sm text-gray-200">Corrección instantánea</div>
            <div className="text-xs text-gray-500">Ver si acertaste al marcar la respuesta</div>
          </div>
          <button
            onClick={() => setInstantFeedback(!instantFeedback)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${instantFeedback ? 'bg-indigo-600' : 'bg-gray-700'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${instantFeedback ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
      </div>

      {/* Modos globales */}
      <div className="grid grid-cols-2 gap-3">
        {MODE_CARDS.map(({ mode, label, icon: Icon, color, desc, enabled }) => {
          const isEnabled = enabled(hardQuestionsCount, mistakes, mostFailedPctCount, skippedList);
          const c = COLOR_MAP[color];
          return (
            <button
              key={mode}
              onClick={() => onStart(mode, null, nPreguntas)}
              disabled={!isEnabled}
              className={`flex flex-col gap-3 p-4 bg-gray-900 border border-gray-800 rounded-2xl transition-all text-left group
                ${!isEnabled ? 'opacity-40 grayscale cursor-not-allowed' : `active:scale-[0.97] ${c.border}`}`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${c.icon} ${isEnabled ? c.hover + ' group-hover:text-white' : ''}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-sm text-gray-100 leading-tight">{label}</div>
                <div className="text-xs text-gray-500 mt-0.5 leading-snug">
                  {desc(nPreguntas, hardQuestionsCount, mistakes, mostFailedPctCount, skippedList)}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Por tema: selección múltiple ──────────────────── */}
      <div className="space-y-3">
        {/* Cabecera */}
        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-500 font-bold uppercase tracking-wider">Por tema</div>
          <button
            onClick={toggleAll}
            className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            {allSelected ? 'Deseleccionar todo' : 'Seleccionar todo'}
          </button>
        </div>

        {/* Lista de temas con checkboxes */}
        <div className="space-y-1.5">
          {topicStats.map(({ tema, count, seen, seenPct, correctPct }) => {
            const isSelected = selectedTopics.has(tema);
            return (
              <button
                key={tema}
                onClick={() => toggleTopic(tema)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl border-2 transition-all text-left
                  ${isSelected
                    ? 'bg-indigo-600/10 border-indigo-500/60 hover:border-indigo-400'
                    : 'bg-gray-900 border-gray-800 hover:border-gray-700'}`}
              >
                {/* Checkbox */}
                <div className={`shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all
                  ${isSelected ? 'bg-indigo-600 border-indigo-500' : 'border-gray-600'}`}>
                  {isSelected && (
                    <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>

                {/* Nombre + barra */}
                <div className="flex-1 min-w-0">
                  <div className={`font-medium text-sm truncate ${isSelected ? 'text-indigo-200' : 'text-gray-200'}`}>
                    {tema}
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="flex-1 h-1 bg-gray-800 rounded-full overflow-hidden">
                      {seenPct > 0 && (
                        <div
                          className={`h-full rounded-full ${correctPct !== null && correctPct >= 70 ? 'bg-green-500' : correctPct !== null && correctPct >= 50 ? 'bg-yellow-500' : 'bg-indigo-500'}`}
                          style={{ width: `${seenPct}%` }}
                        />
                      )}
                    </div>
                    <div className="text-[10px] text-gray-600 shrink-0 w-16 text-right">
                      {seen > 0 ? `${seen}/${count} vistas` : `${count} pregs.`}
                    </div>
                  </div>
                </div>

                {/* % acierto */}
                {correctPct !== null && (
                  <div className={`text-sm font-bold shrink-0 ${correctPct >= 70 ? 'text-green-400' : correctPct >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {correctPct}%
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Botón de inicio — aparece cuando hay temas seleccionados */}
        <div className={`transition-all duration-200 ${someSelected ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'}`}>
          <button
            onClick={() => someSelected && onStart('multi_topic', Array.from(selectedTopics), nPreguntas)}
            className="w-full flex items-center justify-between gap-3 p-4 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] rounded-2xl font-bold text-white transition-all shadow-lg shadow-indigo-900/40"
          >
            <div className="flex items-center gap-3">
              <Play className="w-5 h-5 shrink-0" />
              <div className="text-left">
                <div className="text-sm font-bold">Iniciar test por temas</div>
                <div className="text-xs text-indigo-200 font-normal">
                  {selectedTopics.size} tema{selectedTopics.size !== 1 ? 's' : ''} · {availableCount.toLocaleString()} preguntas disponibles
                </div>
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-lg font-black">{questionsToRun}</div>
              <div className="text-[10px] text-indigo-200 font-normal">pregs.</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
