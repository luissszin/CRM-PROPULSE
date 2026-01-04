import { tokenService } from './tokenService';

const BASE = import.meta.env.VITE_API_BASE_URL || '';

async function request(endpoint: string, options: RequestInit = {}) {
  const url = `${BASE}${endpoint}`;
  const token = tokenService.getAccessToken();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Add Authorization header if token exists
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response = await fetch(url, { ...options, headers });

  // If unauthorized, try to refresh token
  if (response.status === 401 || response.status === 403) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      // Retry request with new token
      const newToken = tokenService.getAccessToken();
      if (newToken) {
        headers['Authorization'] = `Bearer ${newToken}`;
      }
      response = await fetch(url, { ...options, headers });
    }
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error ${response.status}: ${errorText}`);
  }

  // Handle empty responses
  if (response.status === 204) return null;

  return response.json();
}

// Refresh access token using refresh token
async function refreshAccessToken(): Promise<boolean> {
  try {
    const refreshToken = tokenService.getRefreshToken();
    if (!refreshToken) return false;

    const response = await fetch(`${BASE}/admin/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      tokenService.clearTokens();
      return false;
    }

    const { accessToken } = await response.json();
    tokenService.setAccessToken(accessToken);
    return true;
  } catch (error) {
    tokenService.clearTokens();
    return false;
  }
}

// Admin
export const getAdminMessages = () => request('/admin/messages');
export const resendMessage = (id: string) => request(`/admin/messages/${id}/resend`, { method: 'POST' });

// Authenticate (Mock implementation using backend if available, or simulation)
// Real auth would be POST /auth/login. Using leads/units/etc as proxy for access in this MVP.
export const checkHealth = () => request('/health');

// Units
export const getUnits = () => request('/admin/units'); // Assuming admin/units exists or similar
export const createUnit = (data: any) => request('/admin/units', { method: 'POST', body: JSON.stringify(data) });
export const updateUnit = (id: string, data: any) => request(`/admin/units/${id}`, { method: 'PUT', body: JSON.stringify(data) });

// Leads
export const getLeads = async (unitId?: string) => {
  const query = unitId ? `?unitId=${unitId}` : '';
  const res = await request(`/leads${query}`);
  return res.leads || res;
};
export const createLead = (data: any) => request('/leads', { method: 'POST', body: JSON.stringify(data) });
export const updateLead = (id: string, data: any) => request(`/leads/${id}`, { method: 'PATCH', body: JSON.stringify(data) });

// Conversations & Messages
export const getConversations = (unitId?: string) => {
  const query = unitId ? `?unitId=${unitId}` : '';
  return request(`/conversations${query}`);
};
export const sendMessage = (phone: string, content: string) => request('/messages', {
  method: 'POST',
  body: JSON.stringify({ phone, message: content }) // Backend expects 'message', not 'content' usually? Checking spec.
});

// Users (Admin)
export const getUsers = () => request('/admin/users');
export const createUser = (data: any) => request('/admin/users', { method: 'POST', body: JSON.stringify(data) });
export const login = (email: string, password: string, unitSlug?: string) => request('/admin/login', { method: 'POST', body: JSON.stringify({ email, password, unitSlug }) });

// WhatsApp
export const getWhatsappInstances = (unitId: string) => request(`/whatsapp/instances?unitId=${unitId}`);
export const createWhatsappInstance = (data: { unitId: string, instanceName: string, provider?: string, config?: any }) => request('/whatsapp/instances', { method: 'POST', body: JSON.stringify(data) });
export const connectWhatsappInstance = (id: string) => request(`/whatsapp/instances/${id}/connect`, { method: 'POST' });
export const getWhatsappInstanceStatus = (id: string) => request(`/whatsapp/instances/${id}/status`);
export const disconnectWhatsappInstance = (id: string) => request(`/whatsapp/instances/${id}/disconnect`, { method: 'DELETE' });
export const sendWhatsappMessage = (data: { instanceId: string, phone: string, message?: string, mediaUrl?: string, mediaType?: string }) => request('/whatsapp/send', { method: 'POST', body: JSON.stringify(data) });

// Automation Flow Designer
export const getAutomationFlows = (unitId: string) => request(`/automation/flows?unitId=${unitId}`);
export const createAutomationFlow = (data: any) => request('/automation/flows', { method: 'POST', body: JSON.stringify(data) });
export const updateAutomationFlow = (id: string, data: any) => request(`/automation/flows/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
export const deleteAutomationFlow = (id: string) => request(`/automation/flows/${id}`, { method: 'DELETE' });
export const getAutomationLogs = (unitId: string) => request(`/automation/logs?unitId=${unitId}`);

// Dashboard
export const getDashboardStats = (unitId: string, days: number = 7) => request(`/dashboard/stats?unitId=${unitId}&days=${days}`);

// Default export for legacy support if needed
export default {
  getAdminMessages,
  resendMessage,
  checkHealth,
  getUnits,
  createUnit,
  getLeads,
  createLead,
  updateLead,
  getConversations,
  sendMessage,
  getUsers,
  createUser,
  login,
  getWhatsappInstances,
  createWhatsappInstance,
  connectWhatsappInstance,
  getWhatsappInstanceStatus,
  disconnectWhatsappInstance,
  sendWhatsappMessage,
  getAutomationFlows,
  createAutomationFlow,
  updateAutomationFlow,
  deleteAutomationFlow,
  getAutomationLogs,
  getDashboardStats,
  updateUnit,
};
