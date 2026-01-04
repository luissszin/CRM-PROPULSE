import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import api from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { socketService } from '@/lib/socketService';

// Types
export interface LeadCustomField {
  id: string;
  name: string;
  type: 'text' | 'number' | 'select' | 'checkbox' | 'date';
  options?: string[];
  required: boolean;
  order: number;
}

export interface Unit {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  createdAt: Date;
  active: boolean;
  customFields: LeadCustomField[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: 'super_admin' | 'unit_admin' | 'agent';
  unitId?: string;
  avatar: string;
  unitIds?: string[];
}

export interface Lead {
  id: string;
  unitId: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  value: number;
  stage: 'new' | 'contact' | 'negotiation' | 'won' | 'lost';
  tags: string[];
  avatar: string;
  createdAt: Date;
  lastContact: Date;
  customFieldValues?: Record<string, string | number | boolean>;
  responsibleUser?: string;
  position?: string;
  notes?: string;
}

export interface Message {
  id: string;
  conversationId: string;
  content: string;
  sender: 'user' | 'lead' | 'bot' | 'customer';
  timestamp: Date;
  status?: 'sent' | 'delivered' | 'read' | 'failed';
  media_url?: string;
  media_type?: string;
}

export interface Conversation {
  id: string;
  unitId: string;
  leadId: string;
  lastMessage: string;
  unread: number;
  updatedAt: Date;
  channel: 'whatsapp' | 'instagram' | 'telegram' | 'web';
  instance_id?: string;
  external_id?: string;
}

export interface ChatbotFlow {
  id: string;
  unitId: string;
  name: string;
  trigger: string;
  messages: { id: string; content: string; delay: number }[];
  active: boolean;
  createdAt: Date;
}

interface MultiTenantState {
  // Auth
  isAuthenticated: boolean;
  currentUser: User | null;
  currentUnit: Unit | null;

  // Data
  units: Unit[];
  users: User[];
  leads: Lead[];
  conversations: Conversation[];
  messages: Message[];
  chatbotFlows: ChatbotFlow[];

  // UI State
  selectedLead: Lead | null;
  selectedConversation: string | null;
  searchQuery: string;

  // Auth Actions
  login: (email: string, password: string, unitSlug?: string) => Promise<{ success: boolean; redirect: string }>;
  logout: () => void;
  setCurrentUnit: (slug: string) => boolean;

  // Logic Actions
  synchronize: () => Promise<void>;

  // Unit Actions
  createUnit: (unit: Omit<Unit, 'id' | 'createdAt'>) => Promise<void>;
  updateUnit: (id: string, updates: Partial<Unit>) => void;
  deleteUnit: (id: string) => void;

  // User Actions
  createUser: (user: Omit<User, 'id' | 'avatar'>) => void;
  updateUser: (id: string, updates: Partial<User>) => void;
  deleteUser: (id: string) => void;

  // Lead Actions
  createLead: (lead: Omit<Lead, 'id' | 'createdAt' | 'lastContact' | 'avatar'>) => Promise<void>;
  updateLead: (id: string, updates: Partial<Lead>) => void;
  deleteLead: (id: string) => void;
  moveLead: (id: string, stage: Lead['stage']) => void;
  setSelectedLead: (lead: Lead | null) => void;

  // Conversation Actions
  selectConversation: (id: string) => void;
  sendMessage: (conversationId: string, content: string, sender?: 'user' | 'lead' | 'bot') => Promise<void>;
  setSearchQuery: (query: string) => void;

  // Chatbot Actions
  createChatbotFlow: (flow: Omit<ChatbotFlow, 'id' | 'createdAt'>) => void;
  updateChatbotFlow: (id: string, updates: Partial<ChatbotFlow>) => void;
  deleteChatbotFlow: (id: string) => void;
  toggleChatbotFlow: (id: string) => void;

  // Custom Fields Actions
  addCustomField: (unitId: string, field: Omit<LeadCustomField, 'id' | 'order'>) => void;
  updateCustomField: (unitId: string, fieldId: string, updates: Partial<LeadCustomField>) => void;
  deleteCustomField: (unitId: string, fieldId: string) => void;
  reorderCustomFields: (unitId: string, fieldIds: string[]) => void;

  // Getters
  getUnitLeads: () => Lead[];
  getUnitConversations: () => Conversation[];
  getUnitChatbotFlows: () => ChatbotFlow[];
  getUnitUsers: () => User[];
  getUnitCustomFields: () => LeadCustomField[];
}

const generateId = () => Math.random().toString(36).substr(2, 9);

// Initial Static Data (Fallback)
const staticUnits: Unit[] = [];
const staticUsers: User[] = [
  {
    id: 'user-super',
    name: 'Super Admin',
    email: 'admin@propulse.com',
    password: 'admin123',
    role: 'super_admin',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=SuperAdmin',
  },
];

export const useMultiTenantStore = create<MultiTenantState>()(
  persist(
    (set, get) => ({
      // Initial State
      isAuthenticated: false,
      currentUser: null,
      currentUnit: null,
      units: staticUnits,
      users: staticUsers,
      leads: [],
      conversations: [],
      messages: [],
      chatbotFlows: [],
      selectedLead: null,
      selectedConversation: null,
      searchQuery: '',

      // Sync Data
      synchronize: async () => {
        try {
          try {
            const units = await api.getUnits();
            if (units && Array.isArray(units)) set({ units });
          } catch (e) { console.warn("Sync Units failed", e); }

          try {
            const leads = await api.getLeads();
            if (leads && Array.isArray(leads)) set({ leads });
          } catch (e) { console.warn("Sync Leads failed", e); }

          try {
            const users = await api.getUsers();
            if (users && Array.isArray(users)) {
              const staticAdmin = get().users.find(u => u.role === 'super_admin') || staticUsers[0];
              const backendUsers = users.filter(u => u.email !== staticAdmin.email);
              set({ users: [staticAdmin, ...backendUsers] });
            }
          } catch (e) { console.warn("Sync Users failed", e); }

          try {
            const conversations = await api.getConversations();
            if (conversations && Array.isArray(conversations)) set({ conversations });
          } catch (e) { console.warn("Sync Conversations failed", e); }

          // Note: Messages are usually fetched per conversation for performance, 
          // but we'll sync initial ones if available or let the view handle it.
        } catch (error) {
          console.error("Deep Sync failed", error);
        }
      },

      // Auth Actions
      login: async (email, password, unitSlug) => {
        // Use API for authentication (bcrypt verification)
        try {
          const response = await api.login(email, password);
          const { user, accessToken, refreshToken } = response;

          if (!user) return { success: false, redirect: '' };

          // Save JWT tokens
          const { tokenService } = await import('@/lib/tokenService');
          tokenService.setTokens(accessToken, refreshToken);

          // Ensure we have latest units data
          await get().synchronize();
          const { units } = get();

          // Set authenticated user
          set({ isAuthenticated: true, currentUser: user });

          if (user.role === 'super_admin') {
            set({ currentUnit: null });
            return { success: true, redirect: '/admin' };
          }

          // Handle unit-based login for agents/unit_admins
          if (user.unitId) {
            const unit = units.find(u => u.id === user.unitId);
            if (unit) {
              set({ currentUnit: unit });
              return { success: true, redirect: `/${unit.slug}/dashboard` };
            }
          }

          // Fallback if slug provided
          if (unitSlug) {
            const unit = units.find(u => u.slug === unitSlug);
            if (unit) {
              set({ currentUnit: unit });
              return { success: true, redirect: `/${unit.slug}/dashboard` };
            }
          }

          return { success: false, redirect: '' };
        } catch (error) {
          console.error('Login failed:', error);
          return { success: false, redirect: '' };
        }
      },

      logout: () => {
        // Clear JWT tokens
        import('@/lib/tokenService').then(({ tokenService }) => {
          tokenService.clearTokens();
        });

        set({
          isAuthenticated: false,
          currentUser: null,
          currentUnit: null,
          selectedLead: null,
          selectedConversation: null,
        });
      },

      setCurrentUnit: (slug: string) => {
        const unit = get().units.find((u) => u.slug === slug);
        if (unit) {
          set({ currentUnit: unit });

          // Connect to socket for this unit
          socketService.connect(unit.id);

          // Listen for new messages
          socketService.off('new_message');
          socketService.on('new_message', (data: { conversation: any, message: any }) => {
            console.log('[Socket] New message:', data);

            set(state => {
              // Normalize data from DB (snake_case to camelCase)
              const newConv = {
                ...data.conversation,
                unitId: data.conversation.unit_id || data.conversation.unitId,
                leadId: data.conversation.lead_id || data.conversation.leadId,
              };

              const newMessage = {
                ...data.message,
                conversationId: data.message.conversation_id || data.message.conversationId,
              };

              // Update conversations list
              const exists = state.conversations.some(c => c.id === newConv.id);
              const updatedConversations = exists
                ? state.conversations.map(c => c.id === newConv.id ? {
                  ...c,
                  ...newConv,
                  instance_id: newConv.instance_id || c.instance_id,
                  external_id: newConv.external_id || c.external_id,
                  unread: c.id === state.selectedConversation ? 0 : (c.unread + 1)
                } : c)
                : [newConv, ...state.conversations];

              // Update messages if this is the selected conversation
              const updatedMessages = newMessage.conversationId === state.selectedConversation
                ? [...state.messages, newMessage]
                : state.messages;

              return {
                conversations: updatedConversations,
                messages: updatedMessages
              };
            });

            if (data.message.conversation_id !== get().selectedConversation && data.message.conversationId !== get().selectedConversation) {
              toast({
                title: "Nova mensagem",
                description: data.message.content?.substring(0, 50) + "..."
              });
            }
          });

          // Listen for new leads
          socketService.off('new_lead');
          socketService.on('new_lead', (lead: any) => {
            console.log('[Socket] New lead received:', lead);
            set(state => ({
              leads: [lead, ...state.leads]
            }));
            toast({ title: "Novo Lead", description: `Um novo lead foi criado para ${lead.name}` });
          });

          // Listen for connection updates
          socketService.off('connection_update');
          socketService.on('connection_update', (data: any) => {
            console.log('[Socket] Connection update:', data);
            // Auto-refresh instances if on config page (not strictly needed but good for UX)
          });

          return true;
        }
        return false;
      },

      // Unit Actions
      createUnit: async (unitData) => {
        const newUnit: Unit = {
          ...unitData,
          id: generateId(),
          createdAt: new Date(),
          customFields: [],
          active: true
        };
        set(state => ({ units: [...state.units, newUnit] }));
        try { await api.createUnit(unitData); } catch (e) { console.error(e); }
      },

      updateUnit: (id, updates) => {
        set(state => ({
          units: state.units.map(u => u.id === id ? { ...u, ...updates } : u),
          currentUnit: state.currentUnit?.id === id ? { ...state.currentUnit, ...updates } : state.currentUnit,
        }));
      },

      deleteUnit: (id) => {
        set(state => ({
          units: state.units.filter(u => u.id !== id),
          users: state.users.filter(u => u.unitId !== id),
          leads: state.leads.filter(l => l.unitId !== id),
          conversations: state.conversations.filter(c => c.unitId !== id),
          chatbotFlows: state.chatbotFlows.filter(f => f.unitId !== id),
        }));
      },

      // User Actions
      createUser: async (user) => {
        const newUser: User = {
          ...user,
          id: generateId(),
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name.replace(/\s/g, '')}`,
        };
        set(state => ({ users: [...state.users, newUser] }));
        try {
          await api.createUser({
            name: user.name,
            email: user.email,
            password: user.password,
            role: user.role,
            unitId: user.unitId
          });
        } catch (e) { console.error(e); }
      },

      updateUser: (id, updates) => {
        set(state => ({
          users: state.users.map(u => u.id === id ? { ...u, ...updates } : u),
        }));
      },

      deleteUser: (id) => {
        set(state => ({ users: state.users.filter(u => u.id !== id) }));
      },

      // Lead Actions
      createLead: async (leadData) => {
        const newLead: Lead = {
          ...leadData,
          id: generateId(),
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${leadData.name.replace(/\s/g, '')}`,
          createdAt: new Date(),
          lastContact: new Date(),
          value: leadData.value || 0,
          stage: leadData.stage || 'new',
          tags: leadData.tags || []
        };
        set(state => ({ leads: [...state.leads, newLead] }));
        try {
          await api.createLead({
            unit_id: leadData.unitId,
            name: leadData.name,
            phone: leadData.phone,
            email: leadData.email,
            status: leadData.stage
          });
        } catch (e) { console.error(e); }
      },

      updateLead: (id, updates) => {
        set(state => ({
          leads: state.leads.map(l => l.id === id ? { ...l, ...updates } : l),
          selectedLead: state.selectedLead?.id === id ? { ...state.selectedLead, ...updates } : state.selectedLead,
        }));
        try { api.updateLead(id, updates); } catch (e) { console.error(e); }
      },

      deleteLead: (id) => {
        set(state => ({
          leads: state.leads.filter(l => l.id !== id),
          conversations: state.conversations.filter(c => c.leadId !== id),
          messages: state.messages.filter(m => {
            const conv = state.conversations.find(c => c.leadId === id);
            return conv ? m.conversationId !== conv.id : true;
          }),
        }));
      },

      moveLead: (id, stage) => {
        set(state => ({
          leads: state.leads.map(l => l.id === id ? { ...l, stage } : l),
        }));
        try { api.updateLead(id, { status: stage }); } catch (e) { console.error(e); }
      },

      setSelectedLead: (lead) => set({ selectedLead: lead }),

      // Conversation Actions
      selectConversation: (id: string) => {
        const conversations = get().conversations;
        const conv = conversations.find(c => c.id === id);
        if (conv) {
          set({
            selectedConversation: id,
            selectedLead: get().leads.find(l => l.id === conv.leadId) || null
          });
          // Update unread count locally
          set({
            conversations: conversations.map(c => c.id === id ? { ...c, unread: 0 } : c)
          });
        }
      },

      sendMessage: async (conversationId: string, content: string) => {
        if (!content.trim()) return;

        const conversation = get().conversations.find(c => c.id === conversationId);
        if (!conversation) return;

        // Optimistic update
        const newMessage: Message = {
          id: `temp-${Date.now()}`,
          conversationId,
          content,
          sender: 'user',
          timestamp: new Date(),
        };

        set(state => ({
          messages: [...state.messages, newMessage],
          conversations: state.conversations.map(c =>
            c.id === conversationId ? { ...c, lastMessage: content, updatedAt: new Date() } : c
          )
        }));

        try {
          // If it's a WhatsApp conversation, use the whatsapp API
          if (conversation.channel === 'whatsapp') {
            // We need the instanceId. For now assuming it's stored in the conversation or we fetch it.
            // Since we updated the schema to include instance_id, we should use it.
            const instanceId = (conversation as any).instance_id;
            const phone = (conversation as any).external_id;

            if (instanceId && phone) {
              await api.sendWhatsappMessage({
                instanceId,
                phone,
                message: content
              });
            } else {
              // Fallback to generic sendMessage if not fully setup
              await api.sendMessage(phone || '', content);
            }
          } else {
            // Other channels
            await api.sendMessage('', content);
          }
        } catch (error) {
          console.error("Failed to send message", error);
          // Assuming 'toast' is available in the context or imported
          // import { toast } from '@/components/ui/use-toast'; // Example import
          // toast({ title: "Erro ao enviar mensagem", variant: "destructive" });
        }
      },

      setSearchQuery: (query) => set({ searchQuery: query }),

      // Chatbot Actions
      createChatbotFlow: (flow) => {
        const newFlow: ChatbotFlow = {
          ...flow,
          id: generateId(),
          createdAt: new Date(),
        };
        set(state => ({ chatbotFlows: [...state.chatbotFlows, newFlow] }));
      },

      updateChatbotFlow: (id, updates) => {
        set(state => ({
          chatbotFlows: state.chatbotFlows.map(f => f.id === id ? { ...f, ...updates } : f),
        }));
      },

      deleteChatbotFlow: (id) => set(state => ({ chatbotFlows: state.chatbotFlows.filter(f => f.id !== id) })),

      toggleChatbotFlow: (id) => {
        set(state => ({
          chatbotFlows: state.chatbotFlows.map(f =>
            f.id === id ? { ...f, active: !f.active } : f
          ),
        }));
      },

      // Custom Fields Actions
      addCustomField: async (unitId, field) => {
        const newField = { ...field, id: generateId(), order: 0 };
        set(state => ({
          units: state.units.map(u => {
            if (u.id !== unitId) return u;
            const updatedUnit = { ...u, customFields: [...u.customFields, newField] };
            // Persist
            api.updateUnit(unitId, { customFields: updatedUnit.customFields }).catch(console.error);
            return updatedUnit;
          }),
          currentUnit: state.currentUnit?.id === unitId
            ? { ...state.currentUnit, customFields: [...state.currentUnit.customFields, newField] }
            : state.currentUnit
        }));
      },

      updateCustomField: (unitId, fieldId, updates) => {
        set(state => {
          let updatedFields: LeadCustomField[] = [];
          const newUnits = state.units.map(u => {
            if (u.id !== unitId) return u;
            updatedFields = u.customFields.map(f => f.id === fieldId ? { ...f, ...updates } : f);
            return { ...u, customFields: updatedFields };
          });

          // Persist
          api.updateUnit(unitId, { customFields: updatedFields }).catch(console.error);

          return {
            units: newUnits,
            currentUnit: state.currentUnit?.id === unitId
              ? { ...state.currentUnit, customFields: updatedFields }
              : state.currentUnit
          };
        });
      },

      deleteCustomField: (unitId, fieldId) => {
        set(state => {
          let updatedFields: LeadCustomField[] = [];
          const newUnits = state.units.map(u => {
            if (u.id !== unitId) return u;
            updatedFields = u.customFields.filter(f => f.id !== fieldId);
            return { ...u, customFields: updatedFields };
          });

          // Persist
          api.updateUnit(unitId, { customFields: updatedFields }).catch(console.error);

          return {
            units: newUnits,
            currentUnit: state.currentUnit?.id === unitId
              ? { ...state.currentUnit, customFields: updatedFields }
              : state.currentUnit
          };
        });
      },

      reorderCustomFields: (unitId, fieldIds) => {
        set(state => {
          let updatedFields: LeadCustomField[] = [];
          const newUnits = state.units.map(u => {
            if (u.id !== unitId) return u;
            // Sort fields based on the index in fieldIds
            updatedFields = [...u.customFields].sort((a, b) => {
              const indexA = fieldIds.indexOf(a.id);
              const indexB = fieldIds.indexOf(b.id);
              return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
            });
            return { ...u, customFields: updatedFields };
          });

          // Persist
          api.updateUnit(unitId, { customFields: updatedFields }).catch(console.error);

          return {
            units: newUnits,
            currentUnit: state.currentUnit?.id === unitId
              ? { ...state.currentUnit, customFields: updatedFields }
              : state.currentUnit
          };
        });
      },

      // Getters
      getUnitLeads: () => {
        const { currentUnit, leads } = get();
        return currentUnit ? leads.filter(l => l.unitId === currentUnit.id) : [];
      },

      getUnitConversations: () => {
        const { currentUnit, conversations } = get();
        return currentUnit ? conversations.filter(c => c.unitId === currentUnit.id) : [];
      },

      getUnitChatbotFlows: () => {
        const { currentUnit, chatbotFlows } = get();
        return currentUnit ? chatbotFlows.filter(f => f.unitId === currentUnit.id) : [];
      },

      getUnitUsers: () => {
        const { currentUnit, users } = get();
        return currentUnit ? users.filter(u => u.unitId === currentUnit.id) : [];
      },

      getUnitCustomFields: () => {
        const { currentUnit } = get();
        return currentUnit ? currentUnit.customFields : [];
      },

    }),
    {
      name: 'propulse-crm-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        currentUser: state.currentUser,
        currentUnit: state.currentUnit,
        units: state.units,
        users: state.users,
      }),
    }
  )
);