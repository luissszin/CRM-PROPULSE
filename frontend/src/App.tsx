import { useMultiTenantStore } from "@/store/multiTenantStore";
import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";

// Pages
import Login from "@/pages/Login";
import SelectUnit from "@/pages/SelectUnit";
import NotFound from "@/pages/NotFound";

// Admin Pages
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminUnits from "@/pages/admin/AdminUnits";
import AdminUsers from "@/pages/admin/AdminUsers";
import AdminSettings from "@/pages/admin/AdminSettings";
import AdminOnboarding from "@/pages/admin/AdminOnboarding";

// Unit Pages - All are default exports
import UnitDashboard from "@/pages/unit/UnitDashboard";
import UnitFunnel from "@/pages/unit/UnitFunnel";
import UnitInbox from "@/pages/unit/UnitInbox";
import UnitLogin from "@/pages/unit/UnitLogin";
import UnitFieldsConfig from "@/pages/unit/UnitFieldsConfig";
import UnitChatbot from "@/pages/unit/UnitChatbot";
import UnitLeads from "@/pages/unit/UnitLeads";
import UnitAutomations from '@/pages/unit/UnitAutomations';
import UnitWhatsAppConfig from "@/pages/unit/UnitWhatsAppConfig";

// Layouts - These are named exports
import { AdminLayout } from "@/components/layout/AdminLayout";
import { UnitLayout } from "@/components/layout/UnitLayout";

const queryClient = new QueryClient();

const App = () => {
    const synchronize = useMultiTenantStore(state => state.synchronize);

    useEffect(() => {
        synchronize()
            .catch(err => console.error("App: sync error:", err));
    }, [synchronize]);

    return (
        <QueryClientProvider client={queryClient}>
            <TooltipProvider>
                <BrowserRouter>
                    <Routes>
                        <Route path="/" element={<Navigate to="/login" replace />} />
                        <Route path="/login" element={<Login />} />
                        <Route path="/:slug/login" element={<UnitLogin />} />
                        <Route path="/select-unit" element={<SelectUnit />} />

                        {/* Admin Routes */}
                        <Route path="/admin" element={<AdminLayout />}>
                            <Route index element={<Navigate to="/admin/dashboard" replace />} />
                            <Route path="dashboard" element={<AdminDashboard />} />
                            <Route path="units" element={<AdminUnits />} />
                            <Route path="users" element={<AdminUsers />} />
                            <Route path="settings" element={<AdminSettings />} />
                            <Route path="onboarding" element={<AdminOnboarding />} />
                        </Route>

                        {/* Unit Routes */}
                        <Route path="/:slug" element={<UnitLayout />}>
                            <Route index element={<Navigate to="dashboard" replace />} />
                            <Route path="dashboard" element={<UnitDashboard />} />
                            <Route path="funnel" element={<UnitFunnel />} />
                            <Route path="inbox" element={<UnitInbox />} />
                            <Route path="leads" element={<UnitLeads />} />
                            <Route path="automations" element={<UnitAutomations />} />
                            <Route path="fields" element={<UnitFieldsConfig />} />
                            <Route path="chatbot" element={<UnitChatbot />} />
                            <Route path="whatsapp" element={<UnitWhatsAppConfig />} />
                        </Route>

                        <Route path="*" element={<NotFound />} />
                    </Routes>
                </BrowserRouter>
            </TooltipProvider>
        </QueryClientProvider>
    );
};
export default App;
