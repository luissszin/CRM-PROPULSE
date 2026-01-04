import { Lead, Conversation, Message } from '@/store/multiTenantStore';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Utility to convert data to CSV format
const convertToCSV = (data: Record<string, any>[], headers: { key: string; label: string }[]): string => {
  const headerRow = headers.map(h => `"${h.label}"`).join(',');
  
  const dataRows = data.map(row => {
    return headers.map(h => {
      const value = row[h.key];
      if (value === null || value === undefined) return '""';
      if (typeof value === 'string') return `"${value.replace(/"/g, '""')}"`;
      if (value instanceof Date) return `"${format(value, 'dd/MM/yyyy HH:mm', { locale: ptBR })}"`;
      if (Array.isArray(value)) return `"${value.join(', ')}"`;
      return `"${String(value)}"`;
    }).join(',');
  });

  return [headerRow, ...dataRows].join('\n');
};

// Utility to download CSV file
const downloadCSV = (csvContent: string, filename: string) => {
  const BOM = '\uFEFF'; // UTF-8 BOM for Excel compatibility
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Export leads to CSV
export const exportLeadsToCSV = (leads: Lead[], unitName?: string) => {
  const headers = [
    { key: 'name', label: 'Nome' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Telefone' },
    { key: 'company', label: 'Empresa' },
    { key: 'value', label: 'Valor (R$)' },
    { key: 'stage', label: 'Etapa' },
    { key: 'tags', label: 'Tags' },
    { key: 'createdAt', label: 'Data de Criação' },
    { key: 'lastContact', label: 'Último Contato' },
  ];

  const stageLabels: Record<string, string> = {
    new: 'Novo',
    contact: 'Contato',
    negotiation: 'Negociação',
    won: 'Ganho',
    lost: 'Perdido',
  };

  const data = leads.map(lead => ({
    ...lead,
    stage: stageLabels[lead.stage] || lead.stage,
    value: lead.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
  }));

  const csv = convertToCSV(data, headers);
  const filename = unitName ? `leads_${unitName.replace(/\s/g, '_')}` : 'leads';
  downloadCSV(csv, filename);
  
  return leads.length;
};

// Export conversations to CSV
export const exportConversationsToCSV = (
  conversations: Conversation[], 
  leads: Lead[],
  messages: Message[],
  unitName?: string
) => {
  const headers = [
    { key: 'leadName', label: 'Nome do Lead' },
    { key: 'leadEmail', label: 'Email' },
    { key: 'leadPhone', label: 'Telefone' },
    { key: 'channel', label: 'Canal' },
    { key: 'lastMessage', label: 'Última Mensagem' },
    { key: 'messageCount', label: 'Qtd. Mensagens' },
    { key: 'unread', label: 'Não Lidas' },
    { key: 'updatedAt', label: 'Última Atualização' },
  ];

  const channelLabels: Record<string, string> = {
    whatsapp: 'WhatsApp',
    instagram: 'Instagram',
    telegram: 'Telegram',
    web: 'Web',
  };

  const data = conversations.map(conv => {
    const lead = leads.find(l => l.id === conv.leadId);
    const convMessages = messages.filter(m => m.conversationId === conv.id);
    
    return {
      leadName: lead?.name || 'Desconhecido',
      leadEmail: lead?.email || '',
      leadPhone: lead?.phone || '',
      channel: channelLabels[conv.channel] || conv.channel,
      lastMessage: conv.lastMessage,
      messageCount: convMessages.length,
      unread: conv.unread,
      updatedAt: conv.updatedAt,
    };
  });

  const csv = convertToCSV(data, headers);
  const filename = unitName ? `conversas_${unitName.replace(/\s/g, '_')}` : 'conversas';
  downloadCSV(csv, filename);
  
  return conversations.length;
};

// Export messages from a conversation to CSV
export const exportMessagesToCSV = (
  messages: Message[], 
  leadName: string,
  conversationId: string
) => {
  const headers = [
    { key: 'timestamp', label: 'Data/Hora' },
    { key: 'senderLabel', label: 'Remetente' },
    { key: 'content', label: 'Mensagem' },
  ];

  const senderLabels: Record<string, string> = {
    user: 'Atendente',
    lead: 'Lead',
    bot: 'Bot',
  };

  const data = messages.map(msg => ({
    timestamp: msg.timestamp,
    senderLabel: senderLabels[msg.sender] || msg.sender,
    content: msg.content,
  }));

  const csv = convertToCSV(data, headers);
  const filename = `mensagens_${leadName.replace(/\s/g, '_')}`;
  downloadCSV(csv, filename);
  
  return messages.length;
};

// Export all data for a unit
export const exportAllUnitData = (
  leads: Lead[],
  conversations: Conversation[],
  messages: Message[],
  unitName: string
) => {
  // Export leads
  exportLeadsToCSV(leads, unitName);
  
  // Small delay before next download
  setTimeout(() => {
    exportConversationsToCSV(conversations, leads, messages, unitName);
  }, 500);
  
  return { leadsCount: leads.length, conversationsCount: conversations.length };
};