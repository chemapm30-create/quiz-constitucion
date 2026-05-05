import { BarChart3, TrendingUp, Target, Clock, Trash2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { getQuestionId } from '../utils';

function formatTime(secs) {
  if (!secs) return null;
  if (secs < 60) return `${secs}s`;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

const MODE_LABELS = {
  all:               'Modo Libre',
  simulacro:         'Simulacro',
  least_seen:        'Menos Vistas',
  mistakes:          'Mis Fallos',
  hard:              'Preguntas Críticas',
  most_failed_pct:   'Peor Porcentaje',
  skipped_qs:        'Omitidas',
  multi_topic:       'Multitema',
  topic:             'Por tema',
  topic_least_seen:  'Menos Vistas (tema)',
  topic_hard:        'Críticas (tema)',
  topic_random:      'Aleatorio (tema)',
  topic_mistakes:    'Fallos (tema)',
};

function modeLabel(session) {
  if (session.modo === 'topic' && session.tema) return session.tema;
  if (session.modo === 'multi_topic' && session.tema) return `Multitema · ${session.tema}`;
  return MODE_LABELS[session.modo] ?? session.modo;
}

export default function Stats({ history, allQuestions, questionResults, onClearHistory }) {
  // Indexar preguntas por su ID real (el mismo que usa questionResults)
  const idToQ = Object.fromEntries(allQuestions.map(q => [getQuestionId(q), q]));

  if (history.length === 0) {
    return (
      <div className="max-w-2xl mx-auto text-center py-24 text-gray-600">
        <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-30" />
        <p className="font-medium">Aún no hay sesiones registradas.</p>
        <p className="text-sm mt-1 text-gray-700">Completa un test para ver tus estadísticas aquí.</p>
      </div>
    );
  }

  const totalSessions = history.length;
  const totalAnswered = history.reduce((s, h) => s + (h.aciertos + h.fallos), 0);
  const totalCorrect  = history.reduce((s, h) => s + h.aciertos, 0);
  const globalPct = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;
  const uniqueSeen = Object.keys(questionResults).length;

  // Top preguntas más falladas (hasta 5, ordenadas por nº de fallos)
  const sortedFailed = Object.entries(questionResults)
    .filter(([, r]) => r.failCount > 0)
    .sort(([, a], [, b]) => b.failCount - a.failCount)
    .slice(0, 5);

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <h2 className="text-xl font-bold text-gray-100">Estadísticas</h2>

      {/* ── Resumen global ─────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Sesiones',   value: totalSessions,              icon: Clock,      color: 'text-indigo-400',  bg: 'bg-indigo-500/10' },
          { label: 'Respondidas', value: totalAnswered.toLocaleString(), icon: Target, color: 'text-blue-400',   bg: 'bg-blue-500/10' },
          { label: '% global',   value: `${globalPct}%`,            icon: TrendingUp, color: globalPct >= 70 ? 'text-green-400' : globalPct >= 50 ? 'text-yellow-400' : 'text-red-400', bg: globalPct >= 70 ? 'bg-green-500/10' : globalPct >= 50 ? 'bg-yellow-500/10' : 'bg-red-500/10' },
          { label: 'Pregs. vistas', value: uniqueSeen.toLocaleString(), icon: BarChart3, color: 'text-purple-400', bg: 'bg-purple-500/10' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-gray-900 border border-gray-800 rounded-2xl p-4 text-center">
            <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center mx-auto mb-2`}>
              <Icon className={`w-4.5 h-4.5 ${color}`} />
            </div>
            <div className={`text-2xl font-black ${color}`}>{value}</div>
            <div className="text-xs text-gray-600 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* ── Preguntas más falladas ─────────────────────────── */}
      {sortedFailed.length > 0 && (
        <div>
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
            Preguntas más falladas
          </h3>
          <div className="space-y-2">
            {sortedFailed.map(([id, r]) => {
              const q = idToQ[id];
              const total = r.failCount + r.correctCount;
              const pct   = Math.round((r.failCount / total) * 100);

              // Respuesta incorrecta más elegida
              const mostChosenWrong = (() => {
                if (!r.optionsCount || !q) return null;
                const wrong = Object.entries(r.optionsCount)
                  .filter(([opt]) => opt !== q?.correcta)
                  .sort((a, b) => b[1] - a[1]);
                return wrong.length > 0 ? wrong[0][0] : null;
              })();

              return (
                <div key={id} className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-3">
                  {/* Pregunta */}
                  {q ? (
                    <p className="text-sm text-gray-200 leading-snug">{q.pregunta}</p>
                  ) : (
                    <p className="text-xs text-gray-600 italic">Pregunta no disponible</p>
                  )}

                  {/* Respuestas */}
                  {q && (
                    <div className="space-y-1.5">
                      <div className="flex items-start gap-2 text-green-400 text-sm">
                        <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>{q.correcta}</span>
                      </div>
                      {mostChosenWrong && (
                        <div className="flex items-start gap-2 text-red-400 text-sm">
                          <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                          <span>
                            {mostChosenWrong}
                            <span className="text-xs text-red-600 ml-1.5">(tu respuesta más frecuente)</span>
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Barra de fallos */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full bg-red-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-red-400 font-bold shrink-0">
                      {r.failCount} fallo{r.failCount !== 1 ? 's' : ''} · {pct}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Historial de sesiones ──────────────────────────── */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
            Historial de sesiones
          </h3>
          <button
            onClick={() => { if (confirm('¿Borrar todo el historial y estadísticas?')) onClearHistory(); }}
            className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-red-400 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" /> Borrar todo
          </button>
        </div>

        <div className="space-y-2">
          {history.slice(0, 30).map((session, i) => {
            const pct  = session.totalPreguntas > 0
              ? Math.round((session.aciertos / session.totalPreguntas) * 100)
              : 0;
            const date = new Date(session.fecha);
            const dur  = formatTime(session.duracion);
            const pctColor = pct >= 70 ? 'text-green-400' : pct >= 50 ? 'text-yellow-400' : 'text-red-400';
            const ringColor = pct >= 70 ? 'border-green-600/40' : pct >= 50 ? 'border-yellow-600/40' : 'border-red-600/40';

            return (
              <div key={i} className="bg-gray-900 border border-gray-800 rounded-2xl p-3 flex items-center gap-3">
                {/* Círculo de porcentaje */}
                <div className={`w-12 h-12 rounded-full border-2 ${ringColor} flex items-center justify-center shrink-0`}>
                  <span className={`text-sm font-black ${pctColor}`}>{pct}%</span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-200 truncate">
                    {modeLabel(session)}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-600">
                    <span className="text-green-600 font-bold">{session.aciertos}✓</span>
                    <span className="text-red-600 font-bold">{session.fallos}✗</span>
                    <span>·</span>
                    <span>{session.totalPreguntas} pregs.</span>
                    <span>·</span>
                    <span>{date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })}</span>
                    {dur && <><span>·</span><span>{dur}</span></>}
                  </div>
                </div>

                {/* Minibarra */}
                <div className="hidden sm:block w-16 shrink-0">
                  <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${pct >= 70 ? 'bg-green-500' : pct >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
