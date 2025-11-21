import React from 'react';
import { Dashboard } from './components/Dashboard';

/*
  NOTE: This application mimics the UI required (Bus Management Dashboard).
  
  Framework: React 18 + Typescript
  Styling: TailwindCSS (No external CSS files)
  Icons: Lucide React
  
  Architecture Note:
  While the request asked for NextJS + PostgreSQL, this output is a client-side
  React SPA generation (per the system prompt constraints). 
  
  To adapt to NextJS/Postgres:
  1. Move `components/Dashboard.tsx` to `app/dashboard/page.tsx` (Client Component).
  2. Replace `services/geminiService.ts` with a Server Action or API Route.
  3. Connect the Table data fetch (`useEffect`) to a Prisma/Postgres database query.
*/

const App: React.FC = () => {
  return (
    <div className="antialiased">
      <Dashboard />
    </div>
  );
};

export default App;