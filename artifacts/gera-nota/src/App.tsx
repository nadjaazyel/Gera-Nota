import { useState, useEffect } from 'react';
import { GeraNota } from './pages/GeraNota';
import { Instrucoes } from './pages/Instrucoes';
import { Login } from './pages/Login';

const TABS = [
  { label: 'Gerar Nota', icon: '📄' },
  { label: 'Instruções', icon: '📋' },
];

type AuthState = 'loading' | 'authenticated' | 'unauthenticated';

export default function App() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [authState, setAuthState] = useState<AuthState>('loading');

  useEffect(() => {
    fetch('/api/auth/status', { credentials: 'include' })
      .then((r) => r.json())
      .then((d: { authenticated: boolean }) => {
        setAuthState(d.authenticated ? 'authenticated' : 'unauthenticated');
      })
      .catch(() => setAuthState('unauthenticated'));
  }, []);

  if (authState === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-700 rounded-full animate-spin" />
      </div>
    );
  }

  if (authState === 'unauthenticated') {
    return <Login onLogin={() => setAuthState('authenticated')} />;
  }

  return (
    <div className="min-h-screen bg-slate-50" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6">
        <div className="flex items-center gap-4 max-w-4xl mx-auto">
          <span className="font-bold text-lg text-blue-800 py-4 whitespace-nowrap">
            ⚡ GeraNota
          </span>
          <nav className="flex gap-1 flex-1">
            {TABS.map((tab, i) => (
              <button
                key={i}
                onClick={() => setActiveIndex(i)}
                className={[
                  'flex items-center gap-1.5 px-4 py-4 text-sm font-medium border-b-2 transition-colors',
                  activeIndex === i
                    ? 'border-blue-700 text-blue-700'
                    : 'border-transparent text-slate-500 hover:text-slate-700',
                ].join(' ')}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
          <button
            onClick={() => {
              fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).then(() =>
                setAuthState('unauthenticated')
              );
            }}
            className="text-xs text-slate-400 hover:text-slate-600 transition-colors py-4"
          >
            Sair
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-6">
        {activeIndex === 0 && <GeraNota />}
        {activeIndex === 1 && <Instrucoes />}
      </div>

      <div className="text-center py-8 text-xs text-slate-400">
        GeraNota v2.1 — Uso interno. Não substitui emissão fiscal real.
      </div>
    </div>
  );
}
