import { useState, useEffect, useCallback } from 'react';
import { CheckCircle2, XCircle, Home, ChevronLeft, ChevronRight, SkipForward, List, X, Flag } from 'lucide-react';
import ReportModal from './ReportModal';

// Panel lateral con todas las preguntas del test
function QuestionPanel({ total, answers, currentIndex, onGoto, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex justify-end" onClick={onClose}>
      <div
        className="bg-gray-950 border-l border-gray-800 w-72 h-full overflow-y-auto p-4 flex flex-col gap-3"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-sm text-gray-300">Preguntas del test</h3>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-300">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="text-xs text-gray-500">
          <span className="text-green-400 font-bold">{answers.filter(a => a?.answered && a.isCorrect).length}</span> correctas ·{' '}
          <span className="text-red-400 font-bold">{answers.filter(a => a?.answered && !a.isCorrect).length}</span> incorrectas ·{' '}
          <span className="text-indigo-400 font-bold">{answers.filter(a => a && !a.answered && !a.skipped).length}</span> pdtes. de corr. ·{' '}
          <span className="text-yellow-400 font-bold">{answers.filter(a => a?.skipped).length}</span> omitidas
        </div>

        <div className="grid grid-cols-5 gap-1.5">
          {Array.from({ length: total }, (_, i) => {
            const ans = answers[i];
            let cls = 'bg-gray-800 text-gray-400 border-gray-700';
            if (i === currentIndex) cls = 'bg-indigo-600 text-white border-indigo-500';
            else if (ans?.answered && ans.isCorrect) cls = 'bg-green-500/20 text-green-400 border-green-700';
            else if (ans?.answered && !ans.isCorrect) cls = 'bg-red-500/20 text-red-400 border-red-700';
            else if (ans && !ans.answered && !ans.skipped) cls = 'bg-indigo-500/20 text-indigo-300 border-indigo-700';
            else if (ans?.skipped) cls = 'bg-yellow-500/10 text-yellow-500 border-yellow-700';

            return (
              <button
                key={i}
                onClick={() => { onGoto(i); onClose(); }}
                className={`aspect-square flex items-center justify-center rounded-lg border text-xs font-bold transition-all hover:opacity-80 ${cls}`}
              >
                {i + 1}
              </button>
            );
          })}
        </div>

        <div className="text-[10px] text-gray-700 mt-auto space-y-0.5">
          <div className="flex gap-2"><span className="w-3 h-3 rounded bg-green-500/20 border border-green-700 inline-block" /> Correcta</div>
          <div className="flex gap-2"><span className="w-3 h-3 rounded bg-red-500/20 border border-red-700 inline-block" /> Incorrecta</div>
          <div className="flex gap-2"><span className="w-3 h-3 rounded bg-indigo-500/20 border border-indigo-700 inline-block" /> Seleccionada</div>
          <div className="flex gap-2"><span className="w-3 h-3 rounded bg-yellow-500/10 border border-yellow-700 inline-block" /> Omitida</div>
          <div className="flex gap-2"><span className="w-3 h-3 rounded bg-gray-800 border border-gray-700 inline-block" /> Sin contestar</div>
        </div>
      </div>
    </div>
  );
}

export default function Quiz({
  question,
  currentIndex,
  totalQuestions,
  answers,        // array de { selected, answered: bool, skipped: bool } | null
  onAnswer,
  onNext,
  onPrev,
  onSkip,
  onGoto,
  onExit,
  onFinish,
  instantFeedback,
  user,
}) {
  const [showPanel, setShowPanel] = useState(false);
  const [showReport, setShowReport] = useState(false);

  const q = question;
  const ans = answers[currentIndex];
  const selectedAnswer = ans?.selected ?? null;
  const isAnswered = !!ans && !ans.skipped && ans.answered; // true only if instantFeedback was true, or if evaluated
  const isSkipped = ans?.skipped ?? false;
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === totalQuestions - 1;

  const unansweredCount = answers.filter(a => !a).length;
  const skippedCount = answers.filter(a => a?.skipped).length;

  // Navegar con teclado
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') onNext();
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') onPrev();
      if (showPanel && e.key === 'Escape') setShowPanel(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onNext, onPrev, showPanel]);

  const canFinish = unansweredCount === 0 && skippedCount === 0;
  const pendingCount = unansweredCount + skippedCount;

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-5">
      {/* Header */}
      <div className="flex justify-between items-center gap-2">
        <button onClick={onExit} className="text-gray-500 hover:text-white flex items-center gap-1.5 text-sm">
          <Home className="w-4 h-4" /> Salir
        </button>

        <div className="flex items-center gap-2">
          {/* Indicador de pendientes */}
          {pendingCount > 0 && (
            <span className="text-xs bg-yellow-900/40 border border-yellow-700 text-yellow-400 px-2.5 py-1 rounded-full font-bold">
              {pendingCount} pendiente{pendingCount !== 1 ? 's' : ''}
            </span>
          )}

          {/* Abrir panel */}
          <button
            onClick={() => setShowPanel(true)}
            className="flex items-center gap-1.5 text-xs bg-gray-900 border border-gray-800 hover:border-indigo-500 text-gray-400 hover:text-white px-3 py-1.5 rounded-full transition-all"
          >
            <List className="w-3.5 h-3.5" />
            <span>{currentIndex + 1}/{totalQuestions}</span>
          </button>
        </div>
      </div>

      {/* Barra de progreso */}
      <div className="h-1.5 bg-gray-900 rounded-full overflow-hidden">
        <div
          className="h-full bg-indigo-600 rounded-full transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / totalQuestions) * 100}%` }}
        />
      </div>

      {/* Tema y Reporte */}
      <div className="flex justify-between items-center">
        <div className="text-xs text-indigo-400 font-medium">{q.tema}</div>
        <button
          onClick={() => setShowReport(true)}
          className="text-xs text-gray-500 hover:text-red-400 flex items-center gap-1 transition-colors"
          title="Reportar un error en esta pregunta"
        >
          <Flag className="w-3.5 h-3.5" /> Reportar
        </button>
      </div>

      {/* Pregunta */}
      <h2 className="text-xl md:text-2xl font-bold leading-tight text-gray-100">{q.pregunta}</h2>

      {/* Opciones */}
      <div className="space-y-3">
        {q.opciones.map((opt, i) => {
          const isCorrect = opt === q.correcta;
          const isSelected = selectedAnswer === opt;
          let cls = 'bg-gray-900 border-gray-800 text-gray-300 hover:border-indigo-500 cursor-pointer';

          if (isAnswered) {
            if (isCorrect) cls = 'bg-green-500/10 border-green-500 text-green-400 cursor-default';
            else if (isSelected) cls = 'bg-red-500/10 border-red-500 text-red-400 cursor-default';
            else cls = 'bg-gray-900 border-gray-800 text-gray-600 opacity-40 cursor-default';
          } else if (isSkipped) {
            cls = 'bg-gray-900 border-gray-800 text-gray-500 cursor-pointer hover:border-indigo-500';
          } else if (isSelected) {
            cls = 'bg-indigo-600/20 border-indigo-500 text-indigo-300 cursor-pointer';
          }

          return (
            <button
              key={i}
              disabled={isAnswered}
              onClick={() => !isAnswered && onAnswer(opt)}
              className={`w-full p-5 text-left rounded-2xl border-2 transition-all font-medium flex justify-between items-center ${cls}`}
            >
              <span>{opt}</span>
              {isAnswered && (isCorrect
                ? <CheckCircle2 className="w-5 h-5 shrink-0" />
                : isSelected ? <XCircle className="w-5 h-5 shrink-0" /> : null)}
              {!isAnswered && isSelected && <CheckCircle2 className="w-5 h-5 shrink-0 opacity-50" />}
            </button>
          );
        })}
      </div>

      {/* Botones de navegación */}
      <div className="flex gap-3">
        {/* Anterior */}
        <button
          onClick={onPrev}
          disabled={isFirst}
          className={`flex items-center gap-2 px-4 py-3 rounded-2xl border font-medium transition-all
            ${isFirst
              ? 'opacity-30 cursor-not-allowed bg-gray-900 border-gray-800 text-gray-500'
              : 'bg-gray-900 border-gray-800 text-gray-300 hover:border-gray-600 hover:text-white'}`}
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="hidden sm:inline">Anterior</span>
        </button>

        {/* Omitir — solo si no está contestada */}
        {!isAnswered && (
          <button
            onClick={onSkip}
            className="flex items-center gap-2 px-4 py-3 rounded-2xl border border-yellow-800/60 bg-yellow-900/20 text-yellow-500 hover:bg-yellow-900/40 font-medium transition-all"
          >
            <SkipForward className="w-4 h-4" />
            <span className="hidden sm:inline">Omitir</span>
          </button>
        )}

        {/* Siguiente / Finalizar */}
        {isLast ? (
          <button
            onClick={onFinish}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold transition-all
              ${canFinish
                ? 'bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-500'
                : 'bg-gray-800 border border-gray-700 text-gray-300 hover:border-indigo-500 hover:text-white'}`}
          >
            {canFinish ? 'Ver resultados' : `Finalizar (${pendingCount} pendiente${pendingCount !== 1 ? 's' : ''})`}
          </button>
        ) : (
          <button
            onClick={onNext}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-2xl font-bold text-white border border-indigo-500 transition-all"
          >
            <span>Siguiente</span>
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Fuente */}
      <div className="text-[10px] text-gray-700 text-right">Fuente: {q.fuente}</div>

      {/* Panel de preguntas */}
      {showPanel && (
        <QuestionPanel
          total={totalQuestions}
          answers={answers}
          currentIndex={currentIndex}
          onGoto={onGoto}
          onClose={() => setShowPanel(false)}
        />
      )}

      {/* Modal de reporte */}
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
