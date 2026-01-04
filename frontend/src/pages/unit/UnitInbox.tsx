import { useState, useRef, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Search, Send, Phone, Mail, Building, Tag, MessageCircle, Plus,
  Edit2, X, Save, Check, ChevronDown, BarChart3, Image, Package, Settings, User,
  Filter, Calendar as CalendarIcon, Download, Instagram
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useMultiTenantStore, Lead } from '@/store/multiTenantStore';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { exportConversationsToCSV, exportMessagesToCSV } from '@/lib/exportUtils';

const channelIcons: Record<string, any> = {
  whatsapp: <MessageCircle className="w-3.5 h-3.5" />,
  instagram: <Instagram className="w-3.5 h-3.5" />,
  messenger: <MessageCircle className="w-3.5 h-3.5" />, // Or Facebook icon if available
  telegram: <Send className="w-3.5 h-3.5" />,
  web: <Package className="w-3.5 h-3.5" />,
};

const channelColors: Record<string, string> = {
  whatsapp: 'bg-green-500/10 text-green-400 border-green-500/30',
  instagram: 'bg-pink-500/10 text-pink-400 border-pink-500/30',
  messenger: 'bg-blue-600/10 text-blue-400 border-blue-600/30',
  telegram: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  web: 'bg-gray-500/10 text-gray-400 border-gray-500/30',
};

const channelLabels: Record<string, string> = {
  whatsapp: 'WhatsApp',
  instagram: 'Instagram',
  messenger: 'Messenger',
  telegram: 'Telegram',
  web: 'Web',
};

// Small inline editors for Note and Task modes
function NoteEditor({ selectedLead, updateLead }: { selectedLead: any; updateLead: any }) {
  const [note, setNote] = useState('');
  const save = () => {
    if (!note.trim()) return;
    const existing = (selectedLead.metadata && selectedLead.metadata.notes) || [];
    updateLead(selectedLead.id, { metadata: { ...(selectedLead.metadata || {}), notes: [...existing, { id: Date.now().toString(), text: note.trim(), createdAt: new Date() }] } });
    setNote('');
    toast({ title: 'Nota salva' });
  };
  return (
    <div className="space-y-2">
      <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Escreva uma nota rápida..." className="w-full h-24 p-2 bg-secondary border-border rounded" />
      <div className="flex gap-2">
        <Button onClick={save} className="gradient-primary text-primary-foreground">Salvar Nota</Button>
      </div>
    </div>
  );
}

function TaskEditor({ selectedLead, updateLead }: { selectedLead: any; updateLead: any }) {
  const [title, setTitle] = useState('');
  const [due, setDue] = useState('');
  const save = () => {
    if (!title.trim()) return;
    const existing = (selectedLead.metadata && selectedLead.metadata.tasks) || [];
    updateLead(selectedLead.id, { metadata: { ...(selectedLead.metadata || {}), tasks: [...existing, { id: Date.now().toString(), title: title.trim(), due, done: false }] } });
    setTitle(''); setDue('');
    toast({ title: 'Tarefa criada' });
  };
  return (
    <div className="space-y-2">
      <Input placeholder="Título da tarefa" value={title} onChange={(e) => setTitle(e.target.value)} className="bg-secondary" />
      <Input placeholder="Vencimento (YYYY-MM-DD)" value={due} onChange={(e) => setDue(e.target.value)} className="bg-secondary" />
      <div className="flex gap-2">
        <Button onClick={save} className="gradient-primary text-primary-foreground">Criar Tarefa</Button>
      </div>
    </div>
  );
}

export default function UnitInbox() {
  const { slug } = useParams<{ slug: string }>();
  const {
    getUnitLeads,
    getUnitConversations,
    getUnitCustomFields,
    getUnitUsers,
    messages,
    selectedConversation,
    selectedLead,
    searchQuery,
    selectConversation,
    sendMessage,
    setSearchQuery,
    updateLead,
    currentUnit,
    createLead,
  } = useMultiTenantStore();

  const leads = getUnitLeads();
  const conversations = getUnitConversations();
  const customFields = getUnitCustomFields();
  const unitUsers = getUnitUsers();

  // Filter states
  const [showFilters, setShowFilters] = useState(false);
  const [channelFilter, setChannelFilter] = useState<string[]>([]);
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);

  const [messageInput, setMessageInput] = useState('');
  const [chatMode, setChatMode] = useState<'chat' | 'note' | 'task'>('chat');
  const [editedLead, setEditedLead] = useState<Partial<Lead>>({});
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string | number | boolean>>({});
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [newLeadForConvo, setNewLeadForConvo] = useState({ name: '', email: '', phone: '', company: '' });
  const [activeTab, setActiveTab] = useState('principal');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Get all unique tags from leads
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    leads.forEach(lead => lead.tags.forEach(tag => tags.add(tag)));
    return Array.from(tags);
  }, [leads]);

  // Count active filters
  const activeFilterCount = channelFilter.length + tagFilter.length + (dateFrom ? 1 : 0) + (dateTo ? 1 : 0);

  const filteredConversations = useMemo(() => {
    return conversations.filter(conv => {
      // Use lead_id if leadId is not present (DB uses lead_id)
      const leadId = (conv as any).leadId || (conv as any).lead_id;
      const lead = leads.find(l => l.id === leadId);
      if (!lead) return false;

      // Text search
      const query = searchQuery.toLowerCase();
      const lastMsg = (conv.lastMessage || '').toLowerCase();
      const matchesSearch = !query ||
        lead.name.toLowerCase().includes(query) ||
        (lead.company || '').toLowerCase().includes(query) ||
        lastMsg.includes(query);

      // Channel filter
      const matchesChannel = channelFilter.length === 0 || channelFilter.includes(conv.channel);

      // Tag filter
      const matchesTags = tagFilter.length === 0 || tagFilter.some(tag => lead.tags.includes(tag));

      // Date filter
      const convDate = new Date(conv.updatedAt);
      const matchesDateFrom = !dateFrom || convDate >= dateFrom;
      const matchesDateTo = !dateTo || convDate <= new Date(dateTo.getTime() + 86400000); // Add 1 day for inclusive

      return matchesSearch && matchesChannel && matchesTags && matchesDateFrom && matchesDateTo;
    });
  }, [conversations, leads, searchQuery, channelFilter, tagFilter, dateFrom, dateTo]);

  const toggleChannelFilter = (channel: string) => {
    setChannelFilter(prev =>
      prev.includes(channel) ? prev.filter(c => c !== channel) : [...prev, channel]
    );
  };

  const toggleTagFilter = (tag: string) => {
    setTagFilter(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const clearFilters = () => {
    setChannelFilter([]);
    setTagFilter([]);
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  const conversationMessages = selectedConversation
    ? messages.filter(m => m.conversationId === selectedConversation)
    : [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversationMessages]);

  useEffect(() => {
    if (selectedLead) {
      setEditedLead({
        name: selectedLead.name,
        email: selectedLead.email,
        phone: selectedLead.phone,
        company: selectedLead.company,
        tags: [...selectedLead.tags],
        responsibleUser: selectedLead.responsibleUser,
        position: selectedLead.position,
        value: selectedLead.value,
      });
      setCustomFieldValues(selectedLead.customFieldValues || {});
    }
  }, [selectedLead]);

  const handleSendMessage = () => {
    if (!messageInput.trim() || !selectedConversation) return;
    sendMessage(selectedConversation, messageInput.trim());
    setMessageInput('');
  };

  const handleSaveLead = () => {
    if (selectedLead) {
      updateLead(selectedLead.id, {
        ...editedLead,
        customFieldValues,
      });
      toast({ title: "Lead atualizado!" });
    }
  };

  const handleStartNewConversation = () => {
    if (!newLeadForConvo.name || !newLeadForConvo.email) {
      toast({ title: "Preencha nome e email", variant: "destructive" });
      return;
    }

    createLead({
      ...newLeadForConvo,
      unitId: currentUnit?.id || '',
      value: 0,
      stage: 'new',
      tags: [],
    });

    setNewLeadForConvo({ name: '', email: '', phone: '', company: '' });
    setShowNewConversation(false);
    toast({ title: "Conversa iniciada!" });
  };

  const handleCustomFieldChange = (fieldId: string, value: string | number | boolean) => {
    setCustomFieldValues(prev => ({ ...prev, [fieldId]: value }));
  };

  const renderCustomFieldInput = (field: typeof customFields[0]) => {
    const value = customFieldValues[field.id];

    switch (field.type) {
      case 'text':
        return (
          <Input
            value={String(value || '')}
            onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
            placeholder="..."
            className="h-8 text-sm bg-secondary/50 border-0 focus:bg-secondary"
          />
        );
      case 'number':
        return (
          <Input
            type="number"
            value={String(value || '')}
            onChange={(e) => handleCustomFieldChange(field.id, Number(e.target.value))}
            placeholder="..."
            className="h-8 text-sm bg-secondary/50 border-0 focus:bg-secondary"
          />
        );
      case 'select':
        return (
          <Select value={String(value || '')} onValueChange={(v) => handleCustomFieldChange(field.id, v)}>
            <SelectTrigger className="h-8 text-sm bg-secondary/50 border-0">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map(opt => (
                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case 'checkbox':
        return (
          <div className="flex items-center gap-2">
            <Checkbox
              checked={Boolean(value)}
              onCheckedChange={(checked) => handleCustomFieldChange(field.id, checked)}
            />
            <span className="text-sm text-muted-foreground">{value ? 'Sim' : 'Não'}</span>
          </div>
        );
      default:
        return <span className="text-sm text-muted-foreground">...</span>;
    }
  };

  return (
    <div className="h-screen flex animate-fade-in">
      {/* Conversations List */}
      <div className="w-80 border-r border-border flex flex-col bg-card">
        <div className="p-4 border-b border-border">
          {/* Header with filter button */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={showFilters ? "default" : "outline"}
                onClick={() => setShowFilters(!showFilters)}
                className={cn("h-7 text-xs", showFilters && "gradient-primary")}
              >
                <Filter className="w-3 h-3 mr-1" />
                Filtros
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="ml-1 h-4 w-4 p-0 text-[10px] flex items-center justify-center">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
              {activeFilterCount > 0 && (
                <Button size="sm" variant="ghost" onClick={clearFilters} className="h-7 text-xs text-muted-foreground">
                  <X className="w-3 h-3 mr-1" />
                  Limpar
                </Button>
              )}
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">{filteredConversations.length}</span>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => {
                  const count = exportConversationsToCSV(filteredConversations, leads, messages, currentUnit?.name);
                  toast({ title: `${count} conversas exportadas!` });
                }}
                className="text-muted-foreground hover:text-primary h-7 w-7"
                title="Exportar conversas"
              >
                <Download className="w-3.5 h-3.5" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => setShowNewConversation(true)} className="text-primary h-7 w-7">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Search input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 bg-secondary border-border text-sm"
            />
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="mt-3 p-3 bg-secondary/50 rounded-lg border border-border space-y-3 animate-fade-in">
              {/* Channel Filter */}
              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">Canal</Label>
                <div className="flex flex-wrap gap-1.5">
                  {Object.keys(channelLabels).map((channel) => (
                    <button
                      key={channel}
                      onClick={() => toggleChannelFilter(channel)}
                      className={cn(
                        "flex items-center gap-1 px-2 py-1 rounded-md text-xs border transition-colors",
                        channelFilter.includes(channel)
                          ? channelColors[channel] + " border-current"
                          : "bg-background border-border text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <span>{channelIcons[channel]}</span>
                      <span>{channelLabels[channel]}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Tag Filter */}
              {allTags.length > 0 && (
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">Tags</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {allTags.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => toggleTagFilter(tag)}
                        className={cn(
                          "px-2 py-1 rounded-md text-xs border transition-colors",
                          tagFilter.includes(tag)
                            ? "bg-accent/20 text-accent border-accent/30"
                            : "bg-background border-border text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Date Filter */}
              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">Período</Label>
                <div className="flex gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                          "h-8 text-xs justify-start flex-1",
                          !dateFrom && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="w-3 h-3 mr-1" />
                        {dateFrom ? format(dateFrom, "dd/MM/yy", { locale: ptBR }) : "De"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-card border-border z-50" align="start">
                      <Calendar
                        mode="single"
                        selected={dateFrom}
                        onSelect={setDateFrom}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                          "h-8 text-xs justify-start flex-1",
                          !dateTo && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="w-3 h-3 mr-1" />
                        {dateTo ? format(dateTo, "dd/MM/yy", { locale: ptBR }) : "Até"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-card border-border z-50" align="start">
                      <Calendar
                        mode="single"
                        selected={dateTo}
                        onSelect={setDateTo}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length === 0 && (
            <div className="p-4 text-center text-muted-foreground text-sm">
              {searchQuery ? 'Nenhuma conversa encontrada' : 'Nenhuma conversa ainda'}
            </div>
          )}
          {filteredConversations.map((conv) => {
            const leadId = (conv as any).leadId || (conv as any).lead_id;
            const lead = leads.find(l => l.id === leadId);
            if (!lead) return null;
            const isActive = selectedConversation === conv.id;

            return (
              <div
                key={conv.id}
                onClick={() => selectConversation(conv.id)}
                className={cn(
                  "flex items-start gap-3 p-3 cursor-pointer transition-colors border-b border-border/30",
                  isActive ? "bg-primary/10 border-l-2 border-l-primary" : "hover:bg-secondary/50"
                )}
              >
                <div className="relative flex-shrink-0">
                  <img src={lead.avatar} alt={lead.name} className="w-10 h-10 rounded-full border border-border" />
                  {conv.unread > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-accent text-accent-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                      {conv.unread}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <p className={cn("font-medium text-sm truncate", isActive ? "text-primary" : "text-foreground")}>
                        {lead.name}
                      </p>
                      {lead.tags.slice(0, 1).map(tag => (
                        <Badge key={tag} className="text-[10px] h-4 px-1 bg-accent/20 text-accent border-0">
                          {tag.substring(0, 4)}
                        </Badge>
                      ))}
                    </div>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {new Date(conv.updatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">Lead #{lead.id.slice(-7)}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <span className={cn("text-xs px-1 py-0.5 rounded", channelColors[conv.channel])}>
                      {channelIcons[conv.channel]}
                    </span>
                    <p className="text-xs text-muted-foreground truncate">{conv.lastMessage}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Lead Profile Panel - Center */}
      {selectedLead ? (
        <div className="w-96 border-r border-border bg-card flex flex-col overflow-hidden">
          {/* Lead Header */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-2 mb-3">
              <Button variant="ghost" size="sm" className="text-muted-foreground p-1 h-auto">
                <ChevronDown className="w-4 h-4 rotate-90" />
              </Button>
              <h2 className="text-lg font-semibold text-foreground">Lead #{selectedLead.id.slice(-7)}</h2>
              <span className="text-muted-foreground">...</span>
            </div>

            <Button variant="outline" size="sm" className="text-xs mb-3" onClick={() => {
              const tag = window.prompt('Digite a nova tag:');
              if (tag && tag.trim()) {
                const existing = selectedLead.tags || [];
                updateLead(selectedLead.id, { tags: [...existing, tag.trim()] });
                toast({ title: 'Tag adicionada' });
              }
            }}>
              + Adicionar Tags
            </Button>

            <div className="mb-3">
              <span className="text-xs text-muted-foreground">Pré-Vendas</span>
              <Select value={selectedLead.stage} onValueChange={(v) => updateLead(selectedLead.id, { stage: v as any })}>
                <SelectTrigger className="h-8 text-sm bg-primary/20 border-primary/30 text-primary mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">WhatsApp PP (90 days)</SelectItem>
                  <SelectItem value="contact">Contato</SelectItem>
                  <SelectItem value="negotiation">Negociação</SelectItem>
                  <SelectItem value="won">Ganho</SelectItem>
                  <SelectItem value="lost">Perdido</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="w-full justify-start rounded-none border-b border-border bg-transparent p-0 h-auto">
              <TabsTrigger value="principal" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2 text-sm">
                Principal
              </TabsTrigger>
              <TabsTrigger value="estatisticas" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2 text-sm">
                Estatísticas
              </TabsTrigger>
              <TabsTrigger value="midia" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2 text-sm">
                Mídia
              </TabsTrigger>
              <TabsTrigger value="config" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2 text-sm">
                Config
              </TabsTrigger>
            </TabsList>

            <TabsContent value="principal" className="flex-1 overflow-y-auto m-0 p-4">
              <div className="space-y-4">
                {/* User Responsible */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Usuário responsável</span>
                  <Select value={editedLead.responsibleUser || ''} onValueChange={(v) => setEditedLead({ ...editedLead, responsibleUser: v })}>
                    <SelectTrigger className="w-40 h-8 text-sm bg-secondary/50 border-0">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {unitUsers.map(user => (
                        <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Value */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Venda</span>
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-primary">R$</span>
                    <Input
                      type="number"
                      value={editedLead.value || 0}
                      onChange={(e) => setEditedLead({ ...editedLead, value: Number(e.target.value) })}
                      className="w-24 h-8 text-sm bg-secondary/50 border-0 text-primary"
                    />
                  </div>
                </div>

                {/* Custom Fields from Unit Config */}
                {customFields.map(field => (
                  <div key={field.id} className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{field.name}</span>
                    <div className="w-40">
                      {renderCustomFieldInput(field)}
                    </div>
                  </div>
                ))}

                {/* Divider */}
                <div className="border-t border-border pt-4 mt-4">
                  {/* Contact Info with Avatar */}
                  <div className="flex items-center gap-3 mb-4">
                    <img src={selectedLead.avatar} alt={selectedLead.name} className="w-10 h-10 rounded-full border border-border" />
                    <div>
                      <p className="font-medium text-foreground">{selectedLead.name}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <span className={cn("text-[8px]",
                          selectedLead.source === 'instagram' ? "text-pink-500" :
                            selectedLead.source === 'whatsapp' ? "text-green-500" : "text-primary"
                        )}>●</span> {selectedLead.source || 'WhatsApp'}
                      </p>                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Empresa</span>
                      <Input
                        value={editedLead.company || ''}
                        onChange={(e) => setEditedLead({ ...editedLead, company: e.target.value })}
                        className="w-40 h-8 text-sm bg-secondary/50 border-0"
                        placeholder="..."
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Tel. comercial</span>
                      <span className="text-sm text-primary">{selectedLead.phone}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">E-mail comercial</span>
                      <span className="text-sm text-foreground truncate max-w-[160px]">{selectedLead.email}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Posição</span>
                      <Input
                        value={editedLead.position || ''}
                        onChange={(e) => setEditedLead({ ...editedLead, position: e.target.value })}
                        className="w-40 h-8 text-sm bg-secondary/50 border-0"
                        placeholder="..."
                      />
                    </div>
                  </div>
                </div>

                {/* Add Contact / Company buttons */}
                <div className="space-y-2 pt-4">
                  <Button variant="ghost" className="w-full justify-start text-muted-foreground" onClick={() => {
                    setNewLeadForConvo({ name: selectedLead.name || '', email: selectedLead.email || '', phone: selectedLead.phone || '', company: selectedLead.company || '' });
                    setShowNewConversation(true);
                  }}>
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar contato
                  </Button>
                  <Button variant="ghost" className="w-full justify-start text-muted-foreground" onClick={() => {
                    setNewLeadForConvo({ name: '', email: '', phone: '', company: selectedLead.company || '' });
                    setShowNewConversation(true);
                  }}>
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar empresa
                  </Button>
                </div>

                {/* Save Button */}
                <Button onClick={handleSaveLead} className="w-full gradient-primary text-primary-foreground mt-4">
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Alterações
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="estatisticas" className="flex-1 overflow-y-auto m-0 p-4">
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <BarChart3 className="w-12 h-12 mb-2 opacity-50" />
                <p>Estatísticas do lead</p>
                <p className="text-sm">Em breve</p>
              </div>
            </TabsContent>

            <TabsContent value="midia" className="flex-1 overflow-y-auto m-0 p-4">
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <Image className="w-12 h-12 mb-2 opacity-50" />
                <p>Arquivos de mídia</p>
                <p className="text-sm">Nenhum arquivo ainda</p>
              </div>
            </TabsContent>

            <TabsContent value="config" className="flex-1 overflow-y-auto m-0 p-4">
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <Settings className="w-12 h-12 mb-2 opacity-50" />
                <p>Configurações do lead</p>
                <p className="text-sm">Em breve</p>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      ) : null}

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedLead ? (
          <>
            {/* Chat Header */}
            <div className="h-12 px-4 border-b border-border flex items-center justify-between bg-card">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">Hoje</Badge>
                <span className="text-xs text-muted-foreground">{conversationMessages.length} mensagens</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    if (selectedLead && selectedConversation) {
                      const count = exportMessagesToCSV(conversationMessages, selectedLead.name, selectedConversation);
                      toast({ title: `${count} mensagens exportadas!` });
                    }
                  }}
                  className="h-7 text-xs text-muted-foreground hover:text-primary"
                >
                  <Download className="w-3.5 h-3.5 mr-1" />
                  Exportar
                </Button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-background">
              {conversationMessages.map((message) => (
                <div key={message.id} className={cn("flex", message.sender === 'user' ? "justify-end" : "justify-start")}>
                  <div className={cn(
                    "max-w-[80%] px-3 py-2 rounded-lg",
                    message.sender === 'user'
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : message.sender === 'bot'
                        ? "bg-accent/20 border border-accent/30 rounded-bl-sm"
                        : "bg-card border border-border rounded-bl-sm"
                  )}>
                    {message.sender === 'bot' && (
                      <div className="flex items-center gap-1 mb-1 text-xs text-accent text-[10px] uppercase font-bold">
                        <MessageCircle className="w-3 h-3" />
                        Bot do Sistema
                      </div>
                    )}

                    {message.media_url && message.media_type === 'image' && (
                      <img src={message.media_url.startsWith('http') ? message.media_url : `https://api.whatsapp.com/...`} alt="Media" className="rounded-lg mb-2 max-h-60 object-contain bg-black/20" />
                    )}

                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>

                    <div className="flex items-center justify-end gap-1 mt-1 opacity-70">
                      <span className="text-[10px]">
                        {format(new Date(message.timestamp), 'HH:mm', { locale: ptBR })}
                      </span>
                      {message.sender === 'user' && (
                        <div className="flex items-center">
                          {message.status === 'read' ? (
                            <div className="flex -space-x-1">
                              <Check className="w-3 h-3 text-blue-400" />
                              <Check className="w-3 h-3 text-blue-400" />
                            </div>
                          ) : message.status === 'delivered' ? (
                            <div className="flex -space-x-1">
                              <Check className="w-3 h-3 text-white" />
                              <Check className="w-3 h-3 text-white" />
                            </div>
                          ) : (
                            <Check className="w-3 h-3 text-white/50" />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Action Tabs */}
            <div className="border-t border-border bg-card">
              <div className="flex border-b border-border">
                <button onClick={() => setChatMode('chat')} className={cn("px-4 py-2 text-sm font-medium", chatMode === 'chat' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground')}>Bate-papo</button>
                <button onClick={() => setChatMode('note')} className={cn("px-4 py-2 text-sm", chatMode === 'note' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground')}>Nota</button>
                <button onClick={() => setChatMode('task')} className={cn("px-4 py-2 text-sm", chatMode === 'task' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground')}>Tarefa</button>
              </div>

              {/* Message / Note / Task Input */}
              <div className="p-3">
                {chatMode === 'chat' && (
                  <>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                      <span className="text-primary">Bate-papo</span>
                      <span>com</span>
                      <span className="text-primary">{selectedLead.name}</span>
                    </div>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Escreva uma mensagem ou digite '/' para sua lista de Salesbot"
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                        className="flex-1 bg-secondary border-border text-sm"
                      />
                      <Button onClick={handleSendMessage} disabled={!messageInput.trim()} className="gradient-primary text-primary-foreground px-4">
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </>
                )}

                {chatMode === 'note' && (
                  <NoteEditor selectedLead={selectedLead} updateLead={updateLead} />
                )}

                {chatMode === 'task' && (
                  <TaskEditor selectedLead={selectedLead} updateLead={updateLead} />
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-background">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-lg font-medium text-foreground mb-2">Selecione uma conversa</p>
              <p className="text-muted-foreground mb-4">Escolha uma conversa da lista para começar</p>
              <Button onClick={() => setShowNewConversation(true)} variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Nova Conversa
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* New Conversation Modal */}
      {showNewConversation && (
        <>
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40" onClick={() => setShowNewConversation(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-card border border-border rounded-xl z-50 animate-fade-in">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-xl font-bold text-foreground">Nova Conversa</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowNewConversation(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-muted-foreground mb-4">Crie um novo lead para iniciar a conversa</p>
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input
                  placeholder="Nome do lead"
                  value={newLeadForConvo.name}
                  onChange={(e) => setNewLeadForConvo({ ...newLeadForConvo, name: e.target.value })}
                  className="bg-secondary border-border"
                />
              </div>
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input
                  type="email"
                  placeholder="email@exemplo.com"
                  value={newLeadForConvo.email}
                  onChange={(e) => setNewLeadForConvo({ ...newLeadForConvo, email: e.target.value })}
                  className="bg-secondary border-border"
                />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input
                  placeholder="+55 11 99999-0000"
                  value={newLeadForConvo.phone}
                  onChange={(e) => setNewLeadForConvo({ ...newLeadForConvo, phone: e.target.value })}
                  className="bg-secondary border-border"
                />
              </div>
              <div className="space-y-2">
                <Label>Empresa</Label>
                <Input
                  placeholder="Nome da empresa"
                  value={newLeadForConvo.company}
                  onChange={(e) => setNewLeadForConvo({ ...newLeadForConvo, company: e.target.value })}
                  className="bg-secondary border-border"
                />
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t border-border">
              <Button variant="outline" onClick={() => setShowNewConversation(false)} className="flex-1">
                Cancelar
              </Button>
              <Button onClick={handleStartNewConversation} className="flex-1 gradient-primary text-primary-foreground">
                <MessageCircle className="w-4 h-4 mr-2" />
                Iniciar Conversa
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}