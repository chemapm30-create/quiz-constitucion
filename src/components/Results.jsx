import { CheckCircle2, XCircle, SkipForward, Home, RotateCcw, ChevronDown, ChevronUp, Flag } from 'lucide-react';
import { useState } from 'react';
import ReportModal from './ReportModal';

function AnswerReview({ entry, index, user }) {
  const [open, setOpen] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const { question: q, selected, skipped } = entry;

  let statusIcon, statusLabel, statusColor;
  if (skipped) {
    statusIcon = <SkipForward className="w-4 h-4" />;
    statusLabel = 'Omitida';
    statusColor = 'text-yellow-400';
  } else if (selected === q.correcta) {
    statusIcon = <CheckCircle2 className="w-4 h-4" />;
    statusLabel = 'Correcta';
    statusColor = 'text-green-400';
  } else if (!selected) {
    statusIcon = <SkipForward className="w-4 h-4" />;
    statusLabel = 'Sin contestar';
    statusColor = 'text-gray-400';
  } else {
    statusIcon = <XCircle className="w-4 h-4" />;
    statusLabel = 'Incorrecta';
    statusColor = 'text-red-400';
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-800/60 transition-colors"
      >
        <span className={`shrink-0 ${statusColor}`}>{statusIcon}</span>
        <div className="flex-1 min-w-0">
          <span className={`text-sm text-gray-200 ${!open ? 'line-clamp-2' : ''}`}>{index + 1}. {q.pregunta}</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-gray-600 shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-600 shrink-0" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-2 border-t border-gray-800 pt-3">
          <div className="text-xs text-indigo-400/80 mb-2">{q.tema}</div>
          {q.opciones.map((opt, i) => {
            const isCorrect = opt === q.correcta;
            const isSelected = opt === selected;
            let cls = 'text-gray-600';
            if (isCorrect) cls = 'text-green-400 font-bold';
            else if (isSelected && !isCorrect) cls = 'text-red-400 line-through';
            return (
              <div key={i} className={`text-sm flex items-start gap-2 ${cls}`}>
                <span className="shrink-0 mt-px">{isCorrect ? '✓' : isSelected ? '✗' : '·'}</span>
                <span>{opt}</span>
              </div>
            );
          })}

          <div className="pt-3 flex justify-end">
            <button
              onClick={() => setShowReport(true)}
              className="text-xs text-gray-500 hover:text-red-400 flex items-center gap-1.5 transition-colors bg-gray-800/50 hover:bg-red-500/10 px-3 py-1.5 rounded-lg"
            >
              <Flag className="w-3.5 h-3.5" /> Reportar error
            </button>
          </div>
        </div>
      )}

      {showReport && (
        <ReportModal
          question={q}
          user={user}
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  );
}

export default function Results({ answers, questions, onMenu, onRetry, user }) {
  const [filter, setFilter] = useState('all');

  const stats = questions.map((q, i) => {
    const a = answers[i];
    if (!a || a.skipped) return { q, selected: null, skipped: a?.skipped ?? false };
    return { q, selected: a.selected, skipped: false };
  });

  const nCorrect = stats.filter(s => !s.skipped && s.selected === s.q.correcta).length;
  const nWrong = stats.filter(s => !s.skipped && s.selected && s.selected !== s.q.correcta).length;
  const nSkipped = stats.filter(s => s.skipped || !s.selected).length;
  const total = questions.length;
  const pct = total > 0 ? Math.round((nCorrect / total) * 100) : 0;

  const pctColor = pct >= 70 ? 'text-green-400' : pct >= 50 ? 'text-yellow-400' : 'text-red-400';
  const ringColor = pct >= 70 ? 'border-green-500/40' : pct >= 50 ? 'border-yellow-500/40' : 'border-red-500/40';

  const filtered = stats.filter(s => {
    if (filter === 'wrong') return !s.skipped && s.selected && s.selected !== s.q.correcta;
    if (filter === 'skipped') return s.skipped || !s.selected;
    return true;
  });

  const filters = [
    { id: 'all', label: 'Todas', count: total },
    { id: 'wrong', label: 'Incorrectas', count: nWrong },
    { id: 'skipped', label: 'Sin contestar', count: nSkipped },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Resultado */}
      <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6">
        <div className="flex items-center gap-5">
          <div className={`w-20 h-20 rounded-full border-4 ${ringColor} flex items-center justify-center shrink-0`}>
            <div className={`text-2xl font-black ${pctColor}`}>{pct}%</div>
          </div>
          <div className="flex-1">
            <div className="text-gray-400 text-sm mb-3">{nCorrect} de {total} correctas</div>
            <div className="flex gap-4 text-sm">
              <div>
                <div className="text-green-400 font-bold text-lg">{nCorrect}</div>
                <div className="text-gray-600 text-xs">Correctas</div>
              </div>
              <div>
                <div className="text-red-400 font-bold text-lg">{nWrong}</div>
                <div className="text-gray-600 text-xs">Incorrectas</div>
              </div>
              <div>
                <div className="text-yellow-400 font-bold text-lg">{nSkipped}</div>
                <div className="text-gray-600 text-xs">Sin contestar</div>
              </div>
            </div>
          </div>
        </div>

        {/* Barra visual */}
        <div className="mt-5 h-2 bg-gray-800 rounded-full overflow-hidden flex">
          <div className="h-full bg-green-500 transition-all" style={{ width: `${(nCorrect / total) * 100}%` }} />
          <div className="h-full bg-red-500 transition-all" style={{ width: `${(nWrong / total) * 100}%` }} />
          <div className="h-full bg-yellow-600/60 transition-all" style={{ width: `${(nSkipped / total) * 100}%` }} />
        </div>
      </div>

      {/* Botones de acción */}
      <div className="flex gap-3">
        <button
          onClick={onMenu}
          className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-gray-900 hover:bg-gray-800 border border-gray-800 rounded-2xl font-bold text-gray-300 transition-all active:scale-95"
        >
          <Home className="w-4 h-4" /> Menú
        </button>
        <button
          onClick={onRetry}
          className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-indigo-600 hover:bg-indigo-500 rounded-2xl font-bold text-white transition-all active:scale-95"
        >
          <RotateCcw className="w-4 h-4" /> Repetir
        </button>
      </div>

      {/* Revisión */}
      <div>
        {/* Filtros — scrollables en móvil */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1 no-scrollbar">
          {filters.map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-3.5 py-1.5 rounded-full text-sm font-bold border transition-all shrink-0
                ${filter === f.id ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-gray-900 border-gray-800 text-gray-400 hover:text-white'}`}
            >
              {f.label} ({f.count})
            </button>
          ))}
        </div>

        <div className="space-y-2">
          {filtered.map((entry, i) => (
            <AnswerReview
              key={i}
              entry={{ question: entry.q, selected: entry.selected, skipped: entry.skipped }}
              index={stats.indexOf(entry)}
              user={user}
            />
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-10 text-gray-600">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-600" />
              <p className="text-sm">¡No hay preguntas en esta categoría!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
