import { BookOpen, BarChart3, Home, LogOut, Loader2, User } from 'lucide-react';

export default function Navbar({ activeTab, onTabChange, questionCount, user, syncing, onLogout }) {
  const tabs = [
    { id: 'practice', label: 'Practicar', icon: Home },
    { id: 'stats', label: 'Estadísticas', icon: BarChart3 },
  ];

  const displayName = user?.user_metadata?.full_name
    || user?.email?.split('@')[0]
    || 'Usuario';

  return (
    <>
      {/* ── Mobile: top header ──────────────────────────────────── */}
      <header className="md:hidden fixed top-0 inset-x-0 z-40 bg-gray-950/95 backdrop-blur-sm border-b border-gray-900 h-14 flex items-center justify-between px-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0">
            <BookOpen className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="font-bold text-sm text-white leading-tight">Quiz CE</div>
            <div className="text-[10px] text-gray-500">{questionCount.toLocaleString()} preguntas</div>
          </div>
        </div>

        {user && (
          <div className="flex items-center gap-2">
            {syncing && (
              <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
            )}
            <button
              onClick={onLogout}
              className="w-8 h-8 rounded-full bg-indigo-700/80 flex items-center justify-center active:opacity-70 transition-opacity"
              title={`${displayName} · Cerrar sesión`}
            >
              <User className="w-4 h-4 text-indigo-200" />
            </button>
          </div>
        )}
      </header>

      {/* ── Mobile: bottom tabs ─────────────────────────────────── */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-gray-950/95 backdrop-blur-sm border-t border-gray-900"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="flex">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              className={`flex-1 flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold transition-colors active:opacity-70
                ${activeTab === id ? 'text-indigo-400' : 'text-gray-600 hover:text-gray-400'}`}
            >
              <Icon
                className={`w-5 h-5 transition-transform duration-150 ${activeTab === id ? 'scale-110' : ''}`}
              />
              {label}
            </button>
          ))}
        </div>
      </nav>

      {/* ── Desktop: sidebar ────────────────────────────────────── */}
      <nav className="hidden md:flex flex-col bg-gray-950 border-r border-gray-900 w-52 shrink-0 min-h-screen">
        <div className="flex items-center gap-2.5 px-4 py-5 border-b border-gray-900">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0">
            <BookOpen className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="font-bold text-sm text-white leading-tight">Quiz CE</div>
            <div className="text-[10px] text-gray-500">{questionCount.toLocaleString()} preguntas</div>
          </div>
        </div>

        <div className="flex flex-col gap-1 p-2 flex-1">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                ${activeTab === id
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/30'
                  : 'text-gray-400 hover:text-white hover:bg-gray-900'}`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </button>
          ))}
        </div>

        {user && (
          <div className="border-t border-gray-900 p-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-full bg-indigo-700 flex items-center justify-center shrink-0">
                <User className="w-3.5 h-3.5 text-indigo-200" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-medium text-gray-300 truncate">{displayName}</div>
                {syncing ? (
                  <div className="flex items-center gap-1 text-[10px] text-indigo-400">
                    <Loader2 className="w-2.5 h-2.5 animate-spin" /> Sincronizando…
                  </div>
                ) : (
                  <div className="text-[10px] text-gray-600">Sincronizado ✓</div>
                )}
              </div>
            </div>
            <button
              onClick={onLogout}
              className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-gray-600 hover:text-red-400 rounded-lg hover:bg-gray-900 transition-all"
            >
              <LogOut className="w-3 h-3" /> Cerrar sesión
            </button>
          </div>
        )}
      </nav>
    </>
  );
}
