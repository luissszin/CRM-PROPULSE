import { Navigate, Outlet } from 'react-router-dom';
import { AdminSidebar } from './AdminSidebar';
import { useMultiTenantStore } from '@/store/multiTenantStore';

export function AdminLayout() {
  const { isAuthenticated, currentUser } = useMultiTenantStore();

  if (!isAuthenticated || currentUser?.role !== 'super_admin') {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-background flex w-full">
      <AdminSidebar />
      <main className="flex-1 ml-60 min-h-screen transition-all duration-300">
        <Outlet />
      </main>
    </div>
  );
}