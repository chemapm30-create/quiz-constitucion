import { useState } from 'react';
import { Layout, Target, BookOpen, ChevronRight, Trophy, AlertCircle, Shuffle, List, X, Flame, EyeOff, BarChart3, SkipForward } from 'lucide-react';

const QUICK_COUNTS = [10, 20, 30, 50];

function TopicModal({ tema, count, questionResults, mistakes, onSelect, onClose }) {
  const [nPreguntas, setNPreguntas] = useState(Math.min(30, count));

  const getQuestionId = (q) => q.id || q.pregunta;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4" onClick={onClose}>
      <div
        className="bg-gray-900 border border-gray-700 rounded-t-3xl sm:rounded-3xl p-6 w-full sm:max-w-sm shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-5">
          <div>
            <div className="text-xs text-gray-500 uppercase font-bold mb-1">Tema seleccionado</div>
            <h3 className="font-bold text-base text-gray-100 leading-tight">{tema}</h3>
            <div className="text-sm text-gray-500 mt-1">{count} preguntas disponibles</div>
          </div>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-400 p-1 -mr-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-5">
          <label className="text-xs text-gray-500 font-bold mb-2 block">Número de preguntas</label>
          <div className="flex gap-2 mb-2">
            {QUICK_COUNTS.filter(n => n <= count).map(n => (
              <button
                key={n}
                onClick={() => setNPreguntas(n)}
                className={`flex-1 py-2 rounded-xl text-sm font-bold border transition-all
                  ${nPreguntas === n ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-indigo-500'}`}
              >
                {n}
              </button>
            ))}
            {count > 50 && (
              <button
                onClick={() => setNPreguntas(count)}
                className={`flex-1 py-2 rounded-xl text-sm font-bold border transition-all
                  ${nPreguntas === count ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-indigo-500'}`}
              >
                Todas
              </button>
            )}
          </div>
          <input
            type="range"
            min={1}
            max={count}
            value={nPreguntas}
            onChange={e => setNPreguntas(Number(e.target.value))}
            className="w-full accent-indigo-500"
          />
          <div className="text-center text-indigo-400 font-bold text-sm mt-1">{nPreguntas} preguntas</div>
        </div>

        <div className="space-y-2">
          <button
            onClick={() => onSelect('topic', tema, nPreguntas)}
            className="w-full flex items-center gap-3 p-4 bg-gray-800 hover:bg-indigo-600 border border-gray-700 hover:border-indigo-500 rounded-2xl transition-all text-left group"
          >
            <List className="w-5 h-5 text-indigo-400 group-hover:text-white shrink-0" />
            <div>
              <div className="font-bold text-sm">Todas las preguntas</div>
              <div className="text-xs text-gray-400 group-hover:text-indigo-200">{count} preguntas, sin límite</div>
            </div>
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onSelect('topic_least_seen', tema, nPreguntas)}
              className="flex items-center gap-2 p-3 bg-gray-800 hover:bg-emerald-600 border border-gray-700 hover:border-emerald-500 rounded-xl transition-all text-left group"
            >
              <EyeOff className="w-4 h-4 text-emerald-400 group-hover:text-white shrink-0" />
              <div>
                <div className="font-bold text-xs">Menos vistas</div>
                <div className="text-[10px] text-gray-400">Hasta {nPreguntas} preg.</div>
              </div>
            </button>

            {(() => {
              const hasMistakesInTopic = (mistakes || []).length > 0;
              return (
                <button
                  onClick={() => onSelect('topic_mistakes', tema, nPreguntas)}
                  disabled={!hasMistakesInTopic}
                  className={`flex items-center gap-2 p-3 bg-gray-800 border border-gray-700 rounded-xl transition-all text-left group
                    ${!hasMistakesInTopic ? 'opacity-40 grayscale cursor-not-allowed' : 'hover:bg-red-600 hover:border-red-500'}`}
                >
                  <Target className="w-4 h-4 text-red-400 group-hover:text-white shrink-0" />
                  <div>
                    <div className="font-bold text-xs">Mis fallos</div>
                    <div className="text-[10px] text-gray-400">
                      {!hasMistakesInTopic ? 'Sin fallos' : 'Hasta ' + nPreguntas + ' preg.'}
                    </div>
                  </div>
                </button>
              );
            })()}

            {(() => {
              const hardCount = Object.entries(questionResults).filter(([, res]) =>
                res && res.failCount >= 2 && res.failCount >= res.correctCount
              ).length;
              return (
                <button
                  onClick={() => onSelect('topic_hard', tema, nPreguntas)}
                  disabled={hardCount === 0}
                  className={`flex items-center gap-2 p-3 bg-gray-800 border border-gray-700 rounded-xl transition-all text-left group
                    ${hardCount === 0 ? 'opacity-40 grayscale cursor-not-allowed' : 'hover:bg-orange-600 hover:border-orange-500'}`}
                >
                  <Flame className="w-4 h-4 text-orange-400 group-hover:text-white shrink-0" />
                  <div>
                    <div className="font-bold text-xs">Críticas</div>
                    <div className="text-[10px] text-gray-400">
                      {hardCount === 0 ? '¡Perfecto!' : 'Hasta ' + nPreguntas + ' preg.'}
                    </div>
                  </div>
                </button>
              );
            })()}

            <button
              onClick={() => onSelect('topic_random', tema, nPreguntas)}
              className="flex items-center gap-2 p-3 bg-gray-800 hover:bg-yellow-600 border border-gray-700 hover:border-yellow-500 rounded-xl transition-all text-left group"
            >
              <Shuffle className="w-4 h-4 text-yellow-400 group-hover:text-white shrink-0" />
              <div>
                <div className="font-bold text-xs">Al azar</div>
                <div className="text-[10px] text-gray-400">Hasta {nPreguntas} preg.</div>
              </div>
            </button>
          </div>
        </div>

        {/* Drag handle for mobile sheet */}
        <div className="sm:hidden mx-auto mt-5 w-10 h-1 bg-gray-700 rounded-full" />
      </div>
    </div>
  );
}

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
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [nPreguntas, setNPreguntas] = useState(30);

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
    ? Math.round(
        Object.values(questionResults).filter(r => r.correctCount > 0).length / totalSeen * 100
      )
    : null;

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

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header + stats rápidas */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-100">Constitución Española</h1>
          <p className="text-gray-500 text-sm mt-0.5">{allQuestions.length.toLocaleString()} preguntas · 3 fuentes</p>
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
              onClick={() => setNPreguntas(n)}
              className={`px-3.5 py-1.5 rounded-full text-sm font-bold border transition-all
                ${nPreguntas === n ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-indigo-500'}`}
            >
              {n}
            </button>
          ))}
          <button
            onClick={() => setNPreguntas(maxAll)}
            className={`px-3.5 py-1.5 rounded-full text-sm font-bold border transition-all
              ${nPreguntas === maxAll ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-indigo-500'}`}
          >
            Todas
          </button>
        </div>
        <input
          type="range"
          min={5}
          max={maxAll}
          value={nPreguntas}
          onChange={e => setNPreguntas(Number(e.target.value))}
          className="w-full accent-indigo-500"
        />
        <div className="text-center text-indigo-400 font-bold mt-1 mb-4 text-sm">{nPreguntas} preguntas</div>

        <div className="flex items-center justify-between border-t border-gray-800 pt-4">
          <div>
            <div className="font-bold text-sm text-gray-200">Corrección instantánea</div>
            <div className="text-xs text-gray-500">Ver si acertaste al marcar la respuesta</div>
          </div>
          <button
            onClick={() => setInstantFeedback(!instantFeedback)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${instantFeedback ? 'bg-indigo-600' : 'bg-gray-700'}`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${instantFeedback ? 'translate-x-6' : 'translate-x-1'}`}
            />
          </button>
        </div>
      </div>

      {/* Modos globales — 2 columnas siempre */}
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

      {/* Lista de temas */}
      <div className="space-y-2">
        <div className="text-xs text-gray-500 font-bold uppercase tracking-wider">Por tema</div>
        {temasDisponibles.map(tema => {
          const topicQs = allQuestions.filter(q => q.tema === tema);
          const count = topicQs.length;
          const results = topicQs
            .map(q => questionResults[q.id || `${q.pregunta.slice(0, 40)}_${q.correcta.slice(0, 20)}`])
            .filter(Boolean);
          const seen = results.length;
          const correct = results.filter(r => r.correctCount > 0).length;
          const seenPct = Math.round((seen / count) * 100);
          const correctPct = seen > 0 ? Math.round((correct / seen) * 100) : null;

          return (
            <button
              key={tema}
              onClick={() => setSelectedTopic(tema)}
              className="w-full flex items-center gap-3 p-4 bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-gray-700 rounded-2xl transition-all text-left group active:scale-[0.99]"
            >
              <BookOpen className="w-4 h-4 text-gray-600 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate text-gray-200">{tema}</div>
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
              {correctPct !== null && (
                <div className={`text-sm font-bold shrink-0 ${correctPct >= 70 ? 'text-green-400' : correctPct >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {correctPct}%
                </div>
              )}
              <ChevronRight className="w-4 h-4 text-gray-700 group-hover:text-gray-400 shrink-0" />
            </button>
          );
        })}
      </div>

      {selectedTopic && (
        <TopicModal
          tema={selectedTopic}
          count={allQuestions.filter(q => q.tema === selectedTopic).length}
          questionResults={questionResults}
          mistakes={mistakes}
          onSelect={(mode, tema, n) => { setSelectedTopic(null); onStart(mode, tema, n); }}
          onClose={() => setSelectedTopic(null)}
        />
      )}
    </div>
  );
}
