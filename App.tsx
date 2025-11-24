import React from 'react';
import { Dashboard } from './components/Dashboard';
import { Toaster } from 'sonner';

/*
  NOTE: This application mimics the UI required (Bus Management Dashboard).
  
  Framework: React 18 + Typescript
  Styling: TailwindCSS (No external CSS files)
  Icons: Lucide React
  Data: Real-time JSON File Database via Vite API Middleware
*/

const App: React.FC = () => {
  return (
    <div className="antialiased">
      <Dashboard />
      <Toaster richColors position="top-right" expand={true} />
    </div>
  );
};

export default App;