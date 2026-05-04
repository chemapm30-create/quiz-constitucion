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
    <nav className="bg-gray-950 border-b border-gray-900 md:border-b-0 md:border-r md:w-52 md:min-h-screen flex md:flex-col">
      {/* Logo (solo desktop) */}
      <div className="hidden md:flex items-center gap-2 px-4 py-5 border-b border-gray-900">
        <BookOpen className="w-5 h-5 text-indigo-400" />
        <div>
          <div className="font-bold text-sm text-white leading-tight">Quiz CE</div>
          <div className="text-[10px] text-gray-500">{questionCount.toLocaleString()} preguntas</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex md:flex-col gap-1 p-2 flex-1">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all flex-1 md:flex-none
              ${activeTab === id
                ? 'bg-indigo-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-900'}`}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Usuario (solo desktop) */}
      {user && (
        <div className="hidden md:block border-t border-gray-900 p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-full bg-indigo-700 flex items-center justify-center shrink-0">
              <User className="w-3.5 h-3.5 text-indigo-200" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-medium text-gray-300 truncate">{displayName}</div>
              {syncing && (
                <div className="flex items-center gap-1 text-[10px] text-indigo-400">
                  <Loader2 className="w-2.5 h-2.5 animate-spin" /> Sincronizando…
                </div>
              )}
              {!syncing && (
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
  );
}
