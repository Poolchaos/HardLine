import { useState } from 'react';
import Dashboard from './components/Dashboard';
import QuickAdd from './components/QuickAdd';
import ShoppingPlanner from './components/ShoppingPlanner';
import Settings from './components/Settings';

type View = 'dashboard' | 'shopping' | 'settings';

function App() {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border bg-secondary">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold">HardLine</h1>
          <p className="text-sm text-muted-foreground">Personal Finance Enforcement</p>
        </div>
      </header>

      {/* Navigation */}
      <nav className="border-b border-border bg-secondary" role="navigation" aria-label="Main navigation">
        <div className="container mx-auto px-4">
          <div className="flex gap-4">
            <button
              onClick={() => setCurrentView('dashboard')}
              className={`px-4 py-3 font-medium transition-colors ${
                currentView === 'dashboard'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              aria-current={currentView === 'dashboard' ? 'page' : undefined}
            >
              Dashboard
            </button>
            <button
              onClick={() => setCurrentView('shopping')}
              className={`px-4 py-3 font-medium transition-colors ${
                currentView === 'shopping'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              aria-current={currentView === 'shopping' ? 'page' : undefined}
            >
              Shopping
            </button>
            <button
              onClick={() => setCurrentView('settings')}
              className={`px-4 py-3 font-medium transition-colors ${
                currentView === 'settings'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              aria-current={currentView === 'settings' ? 'page' : undefined}
            >
              Settings
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {currentView === 'dashboard' && <Dashboard />}
        {currentView === 'shopping' && <ShoppingPlanner />}
        {currentView === 'settings' && <Settings />}
      </main>

      {/* Floating Action Button */}
      <button
        onClick={() => setShowQuickAdd(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        aria-label="Add expense"
      >
        <span className="text-2xl font-bold">+</span>
      </button>

      {/* Quick Add Modal */}
      {showQuickAdd && (
        <QuickAdd onClose={() => setShowQuickAdd(false)} />
      )}
    </div>
  );
}

export default App;
