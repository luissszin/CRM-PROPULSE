import { Navigate, Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { useCRMStore } from '@/store/crmStore';

export function MainLayout() {
  const isAuthenticated = useCRMStore(state => state.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="ml-64 min-h-screen transition-all duration-300">
        <Outlet />
      </main>
    </div>
  );
}
