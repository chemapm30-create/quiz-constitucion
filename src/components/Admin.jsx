import { useState, useEffect, useCallback } from 'react';
import { db } from '../lib/firebase';
import {
  collection, getDocs, doc, updateDoc,
  orderBy, query, serverTimestamp,
} from 'firebase/firestore';
import { Flag, CheckCircle2, XCircle, Clock, RefreshCw, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';

const ESTADOS = {
  pendiente: { label: 'Pendiente',  color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-600/40' },
  resuelto:  { label: 'Resuelto',   color: 'text-green-400',  bg: 'bg-green-500/10 border-green-600/40'  },
  descartado:{ label: 'Descartado', color: 'text-gray-500',   bg: 'bg-gray-800 border-gray-700'          },
};

function ReportCard({ report, onUpdate }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const estado = ESTADOS[report.estado] ?? ESTADOS.pendiente;

  const cambiarEstado = async (nuevoEstado) => {
    setLoading(true);
    try {
      await updateDoc(doc(db, 'reports', report.id), {
        estado: nuevoEstado,
        updatedAt: serverTimestamp(),
      });
      onUpdate(report.id, nuevoEstado);
    } catch (e) {
      alert('Error al actualizar: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const fecha = report.createdAt?.toDate
    ? report.createdAt.toDate().toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
    : '—';

  return (
    <div className={`border rounded-2xl overflow-hidden transition-all ${estado.bg}`}>
      {/* Cabecera */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-start gap-3 p-4 text-left hover:bg-white/5 transition-colors"
      >
        <Flag className={`w-4 h-4 shrink-0 mt-0.5 ${estado.color}`} />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-200 line-clamp-2 leading-snug">{report.preguntaTexto}</p>
          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            <span className={`text-[10px] font-bold uppercase ${estado.color}`}>{estado.label}</span>
            <span className="text-[10px] text-gray-600">·</span>
            <span className="text-[10px] text-gray-600">{report.tema}</span>
            <span className="text-[10px] text-gray-600">·</span>
            <span className="text-[10px] text-gray-600">{fecha}</span>
          </div>
        </div>
        {open
          ? <ChevronUp className="w-4 h-4 text-gray-600 shrink-0 mt-0.5" />
          : <ChevronDown className="w-4 h-4 text-gray-600 shrink-0 mt-0.5" />}
      </button>

      {/* Detalle expandido */}
      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-white/10 pt-3">
          {/* Respuesta actual */}
          <div>
            <div className="text-[10px] text-gray-600 uppercase font-bold mb-1">Respuesta actual (marcada como correcta)</div>
            <div className="flex items-start gap-2 text-green-400 text-sm">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{report.correctaActual}</span>
            </div>
          </div>

          {/* Respuesta sugerida */}
          {report.correctaSugerida && (
            <div>
              <div className="text-[10px] text-gray-600 uppercase font-bold mb-1">Respuesta sugerida por el usuario</div>
              <div className="flex items-start gap-2 text-yellow-400 text-sm">
                <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{report.correctaSugerida}</span>
              </div>
            </div>
          )}

          {/* Comentario */}
          {report.comentario && (
            <div>
              <div className="text-[10px] text-gray-600 uppercase font-bold mb-1">Comentario</div>
              <p className="text-sm text-gray-300 bg-gray-800/60 rounded-xl p-3 leading-snug">{report.comentario}</p>
            </div>
          )}

          {/* Usuario */}
          <div className="text-[10px] text-gray-700">ID usuario: {report.userId}</div>

          {/* Acciones */}
          {report.estado !== 'resuelto' && report.estado !== 'descartado' && (
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => cambiarEstado('resuelto')}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 rounded-xl text-sm font-bold text-white transition-all"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                Marcar resuelto
              </button>
              <button
                onClick={() => cambiarEstado('descartado')}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 border border-gray-700 rounded-xl text-sm font-bold text-gray-400 transition-all"
              >
                <XCircle className="w-3.5 h-3.5" />
                Descartar
              </button>
            </div>
          )}

          {/* Reabrir */}
          {(report.estado === 'resuelto' || report.estado === 'descartado') && (
            <button
              onClick={() => cambiarEstado('pendiente')}
              disabled={loading}
              className="w-full flex items-center justify-center gap-1.5 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 border border-gray-700 rounded-xl text-sm text-gray-400 transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Reabrir
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function Admin() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pendiente');
  const [error, setError] = useState(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const q = query(collection(db, 'reports'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      setReports(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const handleUpdate = (id, nuevoEstado) => {
    setReports(prev => prev.map(r => r.id === id ? { ...r, estado: nuevoEstado } : r));
  };

  const filtered = reports.filter(r => {
    if (filter === 'todos') return true;
    return (r.estado ?? 'pendiente') === filter;
  });

  const counts = {
    pendiente:  reports.filter(r => (r.estado ?? 'pendiente') === 'pendiente').length,
    resuelto:   reports.filter(r => r.estado === 'resuelto').length,
    descartado: reports.filter(r => r.estado === 'descartado').length,
    todos:      reports.length,
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-100">Administración</h2>
          <p className="text-sm text-gray-500 mt-0.5">{counts.todos} reportes en total</p>
        </div>
        <button
          onClick={fetchReports}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-white border border-gray-800 px-3 py-1.5 rounded-xl transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
      </div>

      {/* Resumen de estado */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { key: 'pendiente',  label: 'Pendientes',  icon: Clock,         color: 'text-yellow-400' },
          { key: 'resuelto',   label: 'Resueltos',   icon: CheckCircle2,  color: 'text-green-400'  },
          { key: 'descartado', label: 'Descartados', icon: XCircle,       color: 'text-gray-500'   },
        ].map(({ key, label, icon: Icon, color }) => (
          <div key={key} className="bg-gray-900 border border-gray-800 rounded-2xl p-4 text-center">
            <Icon className={`w-5 h-5 mx-auto mb-1.5 ${color}`} />
            <div className={`text-2xl font-black ${color}`}>{counts[key]}</div>
            <div className="text-xs text-gray-600 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {[
          { key: 'pendiente',   label: `Pendientes (${counts.pendiente})`   },
          { key: 'resuelto',    label: `Resueltos (${counts.resuelto})`     },
          { key: 'descartado',  label: `Descartados (${counts.descartado})` },
          { key: 'todos',       label: `Todos (${counts.todos})`            },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3.5 py-1.5 rounded-full text-sm font-bold border transition-all shrink-0
              ${filter === f.key ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-gray-900 border-gray-800 text-gray-400 hover:text-white'}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
        </div>
      ) : error ? (
        <div className="text-center py-12 text-red-400">
          <XCircle className="w-8 h-8 mx-auto mb-2" />
          <p className="text-sm">{error}</p>
          <p className="text-xs text-gray-600 mt-1">Comprueba las reglas de Firestore</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-600">
          <Flag className="w-8 h-8 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No hay reportes en esta categoría.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(report => (
            <ReportCard key={report.id} report={report} onUpdate={handleUpdate} />
          ))}
        </div>
      )}
    </div>
  );
}
