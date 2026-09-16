import { useState } from 'react';
import { X, Flag, Send } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export default function ReportModal({ question, user, onClose }) {
  const [selectedCorrect, setSelectedCorrect] = useState('');
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCorrect && !comment.trim()) {
      alert('Por favor, indica cuál debería ser la respuesta correcta o añade un comentario.');
      return;
    }

    setSending(true);
    try {
      if (!db) throw new Error('Firebase no está inicializado');
      
      await addDoc(collection(db, 'reports'), {
        questionId: question.id || question.pregunta,
        preguntaTexto: question.pregunta,
        tema: question.tema,
        correctaActual: question.correcta,
        correctaSugerida: selectedCorrect || null,
        comentario: comment.trim() || null,
        userId: user?.uid || 'anonimo',
        createdAt: serverTimestamp(),
        estado: 'pendiente'
      });
      
      setSuccess(true);
      setTimeout(onClose, 2000);
    } catch (err) {
      console.error('Error al enviar reporte:', err);
      alert('Hubo un error al enviar el reporte. Inténtalo de nuevo más tarde.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-700 rounded-3xl p-6 w-full max-w-md shadow-2xl relative" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-300">
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="bg-red-500/20 p-2 rounded-xl border border-red-500/30">
            <Flag className="w-5 h-5 text-red-400" />
          </div>
          <h3 className="text-lg font-bold text-gray-100">Reportar error en la pregunta</h3>
        </div>

        {success ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-500/30">
              <Send className="w-8 h-8" />
            </div>
            <h4 className="text-xl font-bold text-white mb-2">¡Reporte enviado!</h4>
            <p className="text-gray-400">Gracias por ayudarnos a mejorar el test.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="bg-gray-800/50 border border-gray-700 p-3 rounded-xl mb-4">
              <p className="text-sm font-medium text-gray-300 line-clamp-2">{question.pregunta}</p>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-300 mb-2">
                ¿La respuesta marcada como correcta es errónea? Indica cuál debería ser:
              </label>
              <select
                value={selectedCorrect}
                onChange={(e) => setSelectedCorrect(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-gray-200 text-sm rounded-xl focus:ring-indigo-500 focus:border-indigo-500 block p-3"
              >
                <option value="">No lo sé / Es otro tipo de error</option>
                {question.opciones.map((opt, i) => (
                  <option key={i} value={opt} className={opt === question.correcta ? 'bg-gray-700' : ''}>
                    {opt === question.correcta ? '(Actual) ' : ''}{opt}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-300 mb-2">
                Explica el problema (opcional si has elegido la respuesta arriba):
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                className="w-full bg-gray-800 border border-gray-700 text-gray-200 text-sm rounded-xl focus:ring-indigo-500 focus:border-indigo-500 block p-3 resize-none"
                placeholder="Ej: Hay una falta de ortografía, la pregunta está desactualizada, falta contexto..."
              />
            </div>

            <button
              type="submit"
              disabled={sending}
              className="w-full flex items-center justify-center gap-2 py-3 bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-bold text-white transition-all mt-6"
            >
              {sending ? 'Enviando...' : 'Enviar reporte'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
