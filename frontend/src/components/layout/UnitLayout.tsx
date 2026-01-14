import { useEffect } from 'react';
import { Navigate, Outlet, useParams } from 'react-router-dom';
import { UnitSidebar } from './UnitSidebar';
import { useMultiTenantStore } from '@/store/multiTenantStore';

export function UnitLayout() {
  const { slug } = useParams<{ slug: string }>();
  const { isAuthenticated, currentUser, currentUnit, setCurrentUnit, units } = useMultiTenantStore();

  useEffect(() => {
    console.log('[UnitLayout] Loading unit for slug:', slug, 'Current:', currentUnit?.slug);
    if (slug && (!currentUnit || currentUnit.slug !== slug)) {
      setCurrentUnit(slug);
    }
  }, [slug, currentUnit, setCurrentUnit]);


  // Check if unit exists
  const unitExists = units.some(u => u.slug === slug);
  if (!unitExists) {
    return <Navigate to="/login" replace />;
  }

  // Check authentication
  if (!isAuthenticated) {
    return <Navigate to={`/${slug}/login`} replace />;
  }

  // Check user has access to this unit
  if (currentUser?.role !== 'super_admin' && currentUser?.unitId !== currentUnit?.id) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-background flex w-full">
      <UnitSidebar />
      <main className="flex-1 ml-60 min-h-screen transition-all duration-300">
        <Outlet />
      </main>
    </div>
  );
}