import { useState, useRef, useEffect } from 'react';
import { Search, Send, Phone, Mail, Building, Tag, MoreVertical } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCRMStore } from '@/store/crmStore';
import { cn } from '@/lib/utils';

export default function Inbox() {
  const {
    leads,
    conversations,
    messages,
    selectedConversation,
    selectedLead,
    searchQuery,
    selectConversation,
    sendMessage,
    setSearchQuery,
  } = useCRMStore();

  const [messageInput, setMessageInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const filteredConversations = conversations.filter(conv => {
    const lead = leads.find(l => l.id === conv.leadId);
    if (!lead) return false;
    const query = searchQuery.toLowerCase();
    return (
      lead.name.toLowerCase().includes(query) ||
      lead.company.toLowerCase().includes(query) ||
      conv.lastMessage.toLowerCase().includes(query)
    );
  });

  const conversationMessages = selectedConversation
    ? messages.filter(m => {
        const conv = conversations.find(c => c.id === selectedConversation);
        return conv && m.leadId === conv.leadId;
      })
    : [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversationMessages]);

  const handleSendMessage = () => {
    if (!messageInput.trim() || !selectedLead) return;
    sendMessage(selectedLead.id, messageInput.trim());
    setMessageInput('');
  };

  return (
    <div className="h-screen flex animate-fade-in">
      {/* Conversations List */}
      <div className="w-80 border-r border-border flex flex-col bg-card">
        {/* Search Header */}
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-bold text-foreground mb-4">Conversas</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar conversas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-secondary border-border"
            />
          </div>
        </div>

        {/* Conversations */}
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.map((conv) => {
            const lead = leads.find(l => l.id === conv.leadId);
            if (!lead) return null;
            const isActive = selectedConversation === conv.id;

            return (
              <div
                key={conv.id}
                onClick={() => selectConversation(conv.id)}
                className={cn(
                  "flex items-center gap-3 p-4 cursor-pointer transition-colors border-b border-border/50",
                  isActive ? "bg-primary/10 border-l-2 border-l-primary" : "hover:bg-secondary/50"
                )}
              >
                <div className="relative flex-shrink-0">
                  <img
                    src={lead.avatar}
                    alt={lead.name}
                    className="w-12 h-12 rounded-full border border-border"
                  />
                  {conv.unread > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-accent text-accent-foreground text-xs font-bold rounded-full flex items-center justify-center">
                      {conv.unread}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className={cn("font-medium truncate", isActive ? "text-primary" : "text-foreground")}>
                      {lead.name}
                    </p>
                    <span className="text-xs text-muted-foreground">
                      {new Date(conv.updatedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{conv.lastMessage}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedLead ? (
          <>
            {/* Chat Header */}
            <div className="h-16 px-6 border-b border-border flex items-center justify-between bg-card">
              <div className="flex items-center gap-3">
                <img
                  src={selectedLead.avatar}
                  alt={selectedLead.name}
                  className="w-10 h-10 rounded-full border border-border"
                />
                <div>
                  <p className="font-medium text-foreground">{selectedLead.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedLead.company}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon">
                <MoreVertical className="w-5 h-5" />
              </Button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-background">
              {conversationMessages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex",
                    message.sender === 'user' ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[70%] px-4 py-3 rounded-2xl",
                      message.sender === 'user'
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-card border border-border rounded-bl-sm"
                    )}
                  >
                    <p className="text-sm">{message.content}</p>
                    <p className={cn(
                      "text-xs mt-1",
                      message.sender === 'user' ? "text-primary-foreground/70" : "text-muted-foreground"
                    )}>
                      {new Date(message.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-border bg-card">
              <div className="flex gap-3">
                <Input
                  placeholder="Digite sua mensagem..."
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  className="flex-1 bg-secondary border-border"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!messageInput.trim()}
                  className="gradient-primary text-primary-foreground px-6"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-background">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-lg font-medium text-foreground mb-2">Selecione uma conversa</p>
              <p className="text-muted-foreground">Escolha uma conversa da lista para começar</p>
            </div>
          </div>
        )}
      </div>

      {/* Lead Profile Sidebar */}
      {selectedLead && (
        <div className="w-80 border-l border-border bg-card overflow-y-auto">
          <div className="p-6">
            {/* Profile Header */}
            <div className="text-center mb-6">
              <img
                src={selectedLead.avatar}
                alt={selectedLead.name}
                className="w-20 h-20 rounded-full border-2 border-primary/30 mx-auto mb-3"
              />
              <h3 className="text-lg font-bold text-foreground">{selectedLead.name}</h3>
              <p className="text-sm text-muted-foreground">{selectedLead.company}</p>
            </div>

            {/* Contact Info */}
            <div className="space-y-4 mb-6">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-foreground truncate">{selectedLead.email}</span>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-foreground">{selectedLead.phone}</span>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                <Building className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-foreground">{selectedLead.company}</span>
              </div>
            </div>

            {/* Tags */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Tag className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">Tags</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedLead.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Deal Value */}
            <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
              <p className="text-sm text-muted-foreground mb-1">Valor do Negócio</p>
              <p className="text-2xl font-bold text-primary">
                R$ {selectedLead.value.toLocaleString('pt-BR')}
              </p>
            </div>

            {/* Stage */}
            <div className="mt-4 p-4 rounded-lg bg-secondary/50">
              <p className="text-sm text-muted-foreground mb-1">Etapa no Funil</p>
              <p className="text-lg font-semibold text-foreground capitalize">
                {selectedLead.stage === 'new' ? 'Novo' : selectedLead.stage === 'contact' ? 'Em Contato' : selectedLead.stage === 'negotiation' ? 'Negociação' : selectedLead.stage === 'won' ? 'Ganhou' : 'Perdeu'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
