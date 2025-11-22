
import React, { useEffect } from 'react';
import { Dashboard } from './components/Dashboard';
import { db } from './services/database';

/*
  NOTE: This application mimics the UI required (Bus Management Dashboard).
  
  Framework: React 18 + Typescript
  Styling: TailwindCSS (No external CSS files)
  Icons: Lucide React
  Data: Simulated MongoDB via LocalStorage (services/database.ts)
*/

const App: React.FC = () => {
  useEffect(() => {
    // Initialize Database (Seed with Mock Data if empty)
    db.init();
  }, []);

  return (
    <div className="antialiased">
      <Dashboard />
    </div>
  );
};

export default App;
