import { useState } from 'react';
import { BookOpen, Mail, Lock, Eye, EyeOff, Loader2, LogIn, UserPlus } from 'lucide-react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithPopup,
  GoogleAuthProvider,
} from 'firebase/auth';
import { auth } from '../lib/firebase';

const googleProvider = new GoogleAuthProvider();

export default function Auth() {
  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'forgot'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
        // onAuthStateChanged en App.jsx se encarga del resto
      } else if (mode === 'register') {
        await createUserWithEmailAndPassword(auth, email, password);
      } else if (mode === 'forgot') {
        await sendPasswordResetEmail(auth, email);
        setInfo('Te hemos enviado un enlace para restablecer la contraseña.');
      }
    } catch (err) {
      setError(translateError(err.code));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError('');
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setError(translateError(err.code));
      }
    }
  };

  const switchMode = (m) => { setMode(m); setError(''); setInfo(''); };

  return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600 mb-4">
            <BookOpen className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-black text-white">Quiz CE</h1>
          <p className="text-gray-500 text-sm mt-1">Constitución Española</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 space-y-5">
          {/* Tabs login/registro */}
          {mode !== 'forgot' && (
            <div className="flex gap-2 bg-gray-950 rounded-xl p-1">
              {[
                { id: 'login', label: 'Entrar', icon: LogIn },
                { id: 'register', label: 'Registrarse', icon: UserPlus },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => switchMode(id)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all
                    ${mode === id ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:text-white'}`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                <input
                  type="email" required value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-9 pr-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            {mode !== 'forgot' && (
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1.5">Contraseña</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                  <input
                    type={showPwd ? 'text' : 'password'} required minLength={6}
                    value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-9 pr-10 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                  <button type="button" onClick={() => setShowPwd(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400">
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {error && <p className="text-sm text-red-400 bg-red-900/20 border border-red-800 rounded-xl px-3 py-2">{error}</p>}
            {info  && <p className="text-sm text-green-400 bg-green-900/20 border border-green-800 rounded-xl px-3 py-2">{info}</p>}

            <button type="submit" disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 py-3 rounded-xl font-bold text-white transition-all flex items-center justify-center gap-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {mode === 'login' ? 'Entrar' : mode === 'register' ? 'Crear cuenta' : 'Enviar enlace'}
            </button>
          </form>

          {/* Google */}
          {mode !== 'forgot' && (
            <>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-gray-800" />
                <span className="text-xs text-gray-600">o</span>
                <div className="flex-1 h-px bg-gray-800" />
              </div>
              <button onClick={handleGoogle}
                className="w-full flex items-center justify-center gap-2 py-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl font-medium text-sm text-gray-300 transition-all">
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continuar con Google
              </button>
            </>
          )}

          <div className="text-center">
            {mode === 'login' && (
              <button onClick={() => switchMode('forgot')} className="text-xs text-gray-600 hover:text-gray-400">
                ¿Olvidaste tu contraseña?
              </button>
            )}
            {mode === 'forgot' && (
              <button onClick={() => switchMode('login')} className="text-xs text-gray-600 hover:text-gray-400">
                ← Volver al inicio de sesión
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function translateError(code) {
  const map = {
    'auth/invalid-credential':         'Email o contraseña incorrectos.',
    'auth/user-not-found':             'No existe una cuenta con ese email.',
    'auth/wrong-password':             'Contraseña incorrecta.',
    'auth/email-already-in-use':       'Este email ya tiene una cuenta.',
    'auth/weak-password':              'La contraseña debe tener al menos 6 caracteres.',
    'auth/invalid-email':              'Email no válido.',
    'auth/too-many-requests':          'Demasiados intentos. Espera unos minutos.',
    'auth/network-request-failed':     'Sin conexión. Comprueba tu red.',
    'auth/popup-blocked':              'El popup fue bloqueado. Permite ventanas emergentes.',
  };
  return map[code] ?? `Error: ${code}`;
}
