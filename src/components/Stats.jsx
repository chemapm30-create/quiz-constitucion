import { BarChart3, TrendingUp, Target, Clock } from 'lucide-react';

function formatTime(secs) {
  if (secs < 60) return `${secs}s`;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}m ${s}s`;
}

export default function Stats({ history, allQuestions, questionResults, onClearHistory }) {
  if (history.length === 0) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20 text-gray-600">
        <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-30" />
        <p>Aún no hay sesiones registradas.</p>
        <p className="text-sm mt-1">Completa un test para ver estadísticas.</p>
      </div>
    );
  }

  const totalSessions = history.length;
  const totalAnswered = history.reduce((s, h) => s + (h.aciertos + h.fallos), 0);
  const totalCorrect = history.reduce((s, h) => s + h.aciertos, 0);
  const globalPct = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;

  // Top 5 preguntas más falladas
  const sortedFailed = Object.entries(questionResults)
    .filter(([, r]) => r.failCount > 0)
    .sort(([, a], [, b]) => b.failCount - a.failCount)
    .slice(0, 5);

  const idToQ = Object.fromEntries(allQuestions.map(q => [q.id, q]));

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <h2 className="text-2xl font-bold">Estadísticas</h2>

      {/* Resumen global */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Sesiones', value: totalSessions, icon: Clock, color: 'text-indigo-400' },
          { label: 'Preguntas', value: totalAnswered.toLocaleString(), icon: Target, color: 'text-blue-400' },
          { label: 'Correctas', value: `${globalPct}%`, icon: TrendingUp, color: globalPct >= 70 ? 'text-green-400' : 'text-yellow-400' },
          { label: 'Vistas', value: Object.keys(questionResults).length.toLocaleString(), icon: BarChart3, color: 'text-purple-400' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-gray-900 border border-gray-800 rounded-2xl p-4 text-center">
            <Icon className={`w-5 h-5 mx-auto mb-2 ${color}`} />
            <div className={`text-2xl font-black ${color}`}>{value}</div>
            <div className="text-xs text-gray-500 mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Top falladas */}
      {sortedFailed.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Preguntas más falladas</h3>
          <div className="space-y-2">
            {sortedFailed.map(([id, r]) => {
              const q = idToQ[id];
              const total = r.failCount + r.correctCount;
              const pct = Math.round((r.failCount / total) * 100);
              return (
                <div key={id} className="bg-gray-900 border border-gray-800 rounded-xl p-3">
                  <div className="text-sm text-gray-200 mb-3">
                    {q?.pregunta ?? id}
                  </div>
                  
                  {q && (
                    <div className="space-y-1.5 mb-3 text-sm">
                      <div className="flex items-start gap-2 text-green-400">
                        <span className="shrink-0 mt-0.5">✓</span>
                        <span>{q.correcta}</span>
                      </div>
                      
                      {(() => {
                        // Buscar la respuesta incorrecta más votada
                        if (!r.optionsCount) return null;
                        const wrongOptions = Object.entries(r.optionsCount)
                          .filter(([opt]) => opt !== q.correcta)
                          .sort((a, b) => b[1] - a[1]);
                        
                        if (wrongOptions.length === 0) return null;
                        const mostChosenWrong = wrongOptions[0][0];
                        
                        return (
                          <div className="flex items-start gap-2 text-red-400">
                            <span className="shrink-0 mt-0.5">✗</span>
                            <div>
                              <span>{mostChosenWrong}</span>
                              <span className="text-xs opacity-60 ml-2">
                                (Tu respuesta más frecuente)
                              </span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full bg-red-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-red-400 font-bold shrink-0">{r.failCount} fallos ({pct}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Historial */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Historial de sesiones</h3>
          <button
            onClick={() => { if (confirm('¿Borrar todo el historial y estadísticas?')) onClearHistory(); }}
            className="text-xs text-red-500 hover:text-red-400"
          >
            Borrar todo
          </button>
        </div>
        <div className="space-y-2">
          {history.slice(0, 20).map((session, i) => {
            const pct = session.totalPreguntas > 0
              ? Math.round((session.aciertos / session.totalPreguntas) * 100)
              : 0;
            const date = new Date(session.fecha);
            return (
              <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-3 flex items-center gap-3">
                <div className={`text-xl font-black w-12 text-center shrink-0
                  ${pct >= 70 ? 'text-green-400' : pct >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {pct}%
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-300 truncate">
                    {session.modo === 'topic' ? session.tema : session.modo}
                  </div>
                  <div className="text-xs text-gray-600">
                    {session.aciertos}/{session.totalPreguntas} · {date.toLocaleDateString('es-ES')}
                    {session.duracion ? ` · ${formatTime(session.duracion)}` : ''}
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
