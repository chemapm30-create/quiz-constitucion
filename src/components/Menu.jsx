import { useState } from 'react';
import { Shuffle, List, Target, EyeOff, Flame, ChevronRight, X, BookOpen, AlertCircle } from 'lucide-react';

const QUICK_COUNTS = [10, 20, 30, 50];

function TopicModal({ tema, count, questionCount, onSelect, onClose }) {
  const [nPreguntas, setNPreguntas] = useState(Math.min(30, count));

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-700 rounded-3xl p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-5">
          <div>
            <div className="text-xs text-gray-500 uppercase font-bold mb-1">Tema seleccionado</div>
            <h3 className="font-bold text-lg text-gray-100 leading-tight">{tema}</h3>
            <div className="text-sm text-gray-500 mt-1">{count} preguntas disponibles</div>
          </div>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-400 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selector de número de preguntas */}
        <div className="mb-4">
          <label className="text-xs text-gray-500 font-bold mb-2 block">Número de preguntas</label>
          <div className="flex gap-2 mb-2">
            {QUICK_COUNTS.filter(n => n <= count).map(n => (
              <button
                key={n}
                onClick={() => setNPreguntas(n)}
                className={`flex-1 py-1.5 rounded-lg text-sm font-bold border transition-all
                  ${nPreguntas === n ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-indigo-500'}`}
              >
                {n}
              </button>
            ))}
            {count > 50 && (
              <button
                onClick={() => setNPreguntas(count)}
                className={`flex-1 py-1.5 rounded-lg text-sm font-bold border transition-all
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
              <div className="font-bold text-sm">Aleatorio del tema</div>
              <div className="text-xs text-gray-400">{nPreguntas} preguntas</div>
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
                <div className="text-[10px] text-gray-400">{nPreguntas} preg.</div>
              </div>
            </button>
            <button
              onClick={() => onSelect('topic_hard', tema, nPreguntas)}
              className="flex items-center gap-2 p-3 bg-gray-800 hover:bg-orange-600 border border-gray-700 hover:border-orange-500 rounded-xl transition-all text-left group"
            >
              <Flame className="w-4 h-4 text-orange-400 group-hover:text-white shrink-0" />
              <div>
                <div className="font-bold text-xs">Difíciles</div>
                <div className="text-[10px] text-gray-400">{nPreguntas} preg.</div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Menu({ allQuestions, temasDisponibles, questionResults = {}, onStart }) {
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [nPreguntas, setNPreguntas] = useState(30);

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
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-100">Constitución Española</h1>
        <p className="text-gray-500 text-sm mt-1">{allQuestions.length.toLocaleString()} preguntas · 3 fuentes</p>
      </div>

      {/* Selector global de número de preguntas */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
        <div className="text-xs text-gray-500 font-bold uppercase mb-3">Número de preguntas por test</div>
        <div className="flex gap-2 mb-3 flex-wrap">
          {[10, 20, 30, 50, 100].filter(n => n <= maxAll).map(n => (
            <button
              key={n}
              onClick={() => setNPreguntas(n)}
              className={`px-4 py-1.5 rounded-full text-sm font-bold border transition-all
                ${nPreguntas === n ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-indigo-500'}`}
            >
              {n}
            </button>
          ))}
          <button
            onClick={() => setNPreguntas(maxAll)}
            className={`px-4 py-1.5 rounded-full text-sm font-bold border transition-all
              ${nPreguntas === maxAll ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-indigo-500'}`}
          >
            Todas ({maxAll.toLocaleString()})
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
        <div className="text-center text-indigo-400 font-bold mt-1">{nPreguntas} preguntas</div>
      </div>

      {/* Modos globales */}
      <div className="space-y-3">
        <div className="text-xs text-gray-500 font-bold uppercase tracking-wider">Modos de práctica</div>

        <button
          onClick={() => onStart('all', null, nPreguntas)}
          className="w-full flex items-center gap-4 p-5 bg-gray-900 hover:bg-indigo-600 border border-gray-800 hover:border-indigo-500 rounded-2xl transition-all text-left group"
        >
          <Shuffle className="w-5 h-5 text-indigo-400 group-hover:text-white shrink-0" />
          <div>
            <div className="font-bold">Preguntas al azar</div>
            <div className="text-sm text-gray-400">{nPreguntas} preguntas aleatorias de todos los temas</div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-700 group-hover:text-white ml-auto shrink-0" />
        </button>

        <button
          onClick={() => onStart('least_seen', null, nPreguntas)}
          className="w-full flex items-center gap-4 p-5 bg-gray-900 hover:bg-emerald-600 border border-gray-800 hover:border-emerald-500 rounded-2xl transition-all text-left group"
        >
          <EyeOff className="w-5 h-5 text-emerald-400 group-hover:text-white shrink-0" />
          <div>
            <div className="font-bold">Menos practicadas</div>
            <div className="text-sm text-gray-400">Preguntas que has visto menos veces</div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-700 group-hover:text-white ml-auto shrink-0" />
        </button>

        <button
          onClick={() => onStart('hard', null, nPreguntas)}
          className="w-full flex items-center gap-4 p-5 bg-gray-900 hover:bg-orange-600 border border-gray-800 hover:border-orange-500 rounded-2xl transition-all text-left group"
        >
          <Flame className="w-5 h-5 text-orange-400 group-hover:text-white shrink-0" />
          <div>
            <div className="font-bold">Preguntas difíciles</div>
            <div className="text-sm text-gray-400">Las que más has fallado</div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-700 group-hover:text-white ml-auto shrink-0" />
        </button>
      </div>

      {/* Lista de temas */}
      <div className="space-y-3">
        <div className="text-xs text-gray-500 font-bold uppercase tracking-wider">Por tema</div>
        <div className="space-y-2">
          {temasDisponibles.map(tema => {
            const count = allQuestions.filter(q => q.tema === tema).length;
            const results = allQuestions
              .filter(q => q.tema === tema)
              .map(q => questionResults[q.id || `${q.pregunta.slice(0, 40)}_${q.correcta.slice(0, 20)}`])
              .filter(Boolean);
            const seen = results.length;
            const correct = results.filter(r => r.correctCount > 0).length;

            return (
              <button
                key={tema}
                onClick={() => setSelectedTopic(tema)}
                className="w-full flex items-center gap-4 p-4 bg-gray-900 hover:bg-gray-800 border border-gray-800 rounded-2xl transition-all text-left group"
              >
                <BookOpen className="w-4 h-4 text-gray-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{tema}</div>
                  <div className="text-xs text-gray-500">{count} preguntas</div>
                </div>
                {seen > 0 && (
                  <div className="text-xs text-right shrink-0">
                    <div className="text-green-400 font-bold">{Math.round(correct/seen*100)}%</div>
                    <div className="text-gray-600">{seen} vistas</div>
                  </div>
                )}
                <ChevronRight className="w-4 h-4 text-gray-700 group-hover:text-gray-400 shrink-0" />
              </button>
            );
          })}
        </div>
      </div>

      {selectedTopic && (
        <TopicModal
          tema={selectedTopic}
          count={allQuestions.filter(q => q.tema === selectedTopic).length}
          questionCount={nPreguntas}
          onSelect={(mode, tema, n) => { setSelectedTopic(null); onStart(mode, tema, n); }}
          onClose={() => setSelectedTopic(null)}
        />
      )}
    </div>
  );
}
