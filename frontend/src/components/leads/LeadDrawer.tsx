import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Mail, Phone, Building, Tag, MessageSquare, Save, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useCRMStore, Lead } from '@/store/crmStore';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface LeadDrawerProps {
  open: boolean;
  onClose: () => void;
  lead: Lead | null;
}

export function LeadDrawer({ open, onClose, lead }: LeadDrawerProps) {
  const navigate = useNavigate();
  const { updateLead, selectConversation, conversations } = useCRMStore();
  const [editedLead, setEditedLead] = useState<Partial<Lead>>({});
  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    if (lead) {
      setEditedLead({
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        company: lead.company,
        value: lead.value,
        tags: [...lead.tags],
      });
    }
  }, [lead]);

  if (!lead) return null;

  const handleSave = () => {
    updateLead(lead.id, editedLead);
    toast({
      title: "Lead atualizado",
      description: "As alterações foram salvas com sucesso.",
    });
  };

  const handleAddTag = () => {
    if (newTag.trim() && editedLead.tags) {
      setEditedLead({
        ...editedLead,
        tags: [...editedLead.tags, newTag.trim()],
      });
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    if (editedLead.tags) {
      setEditedLead({
        ...editedLead,
        tags: editedLead.tags.filter(tag => tag !== tagToRemove),
      });
    }
  };

  const handleOpenChat = () => {
    const conversation = conversations.find(c => c.leadId === lead.id);
    if (conversation) {
      selectConversation(conversation.id);
      navigate('/inbox');
    }
    onClose();
  };

  return (
    <>
      {/* Overlay */}
      <div
        className={cn(
          "fixed inset-0 bg-background/80 backdrop-blur-sm z-40 transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={cn(
          "fixed right-0 top-0 h-full w-full max-w-lg bg-card border-l border-border z-50 transition-transform duration-300 ease-out overflow-y-auto",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border p-6 flex items-center justify-between z-10">
          <h2 className="text-xl font-bold text-foreground">Perfil do Lead</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 animate-slide-right">
          {/* Avatar & Name */}
          <div className="flex items-center gap-4">
            <img
              src={lead.avatar}
              alt={lead.name}
              className="w-20 h-20 rounded-full border-2 border-primary/30"
            />
            <div className="flex-1">
              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  value={editedLead.name || ''}
                  onChange={(e) => setEditedLead({ ...editedLead, name: e.target.value })}
                  className="bg-secondary border-border"
                />
              </div>
            </div>
          </div>

          {/* Contact Info */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground" />
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={editedLead.email || ''}
                onChange={(e) => setEditedLead({ ...editedLead, email: e.target.value })}
                className="bg-secondary border-border"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-muted-foreground" />
                Telefone
              </Label>
              <Input
                id="phone"
                value={editedLead.phone || ''}
                onChange={(e) => setEditedLead({ ...editedLead, phone: e.target.value })}
                className="bg-secondary border-border"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="company" className="flex items-center gap-2">
                <Building className="w-4 h-4 text-muted-foreground" />
                Empresa
              </Label>
              <Input
                id="company"
                value={editedLead.company || ''}
                onChange={(e) => setEditedLead({ ...editedLead, company: e.target.value })}
                className="bg-secondary border-border"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="value" className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-muted-foreground" />
                Valor do Negócio
              </Label>
              <Input
                id="value"
                type="number"
                value={editedLead.value || 0}
                onChange={(e) => setEditedLead({ ...editedLead, value: Number(e.target.value) })}
                className="bg-secondary border-border"
              />
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-muted-foreground" />
              Tags
            </Label>
            <div className="flex flex-wrap gap-2">
              {editedLead.tags?.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="cursor-pointer hover:bg-destructive/20 hover:text-destructive transition-colors"
                  onClick={() => handleRemoveTag(tag)}
                >
                  {tag} ×
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Nova tag..."
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                className="bg-secondary border-border"
              />
              <Button variant="outline" onClick={handleAddTag}>
                Adicionar
              </Button>
            </div>
          </div>

          {/* Lead Info */}
          <div className="p-4 rounded-lg bg-secondary/50 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Criado em:</span>
              <span className="text-foreground">
                {new Date(lead.createdAt).toLocaleDateString('pt-BR')}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Último contato:</span>
              <span className="text-foreground">
                {new Date(lead.lastContact).toLocaleDateString('pt-BR')}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Etapa atual:</span>
              <span className="text-primary font-medium capitalize">
                {lead.stage === 'new' ? 'Novo' : lead.stage === 'contact' ? 'Em Contato' : lead.stage === 'negotiation' ? 'Negociação' : lead.stage === 'won' ? 'Ganhou' : 'Perdeu'}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleOpenChat}
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Abrir Chat
            </Button>
            <Button
              className="flex-1 gradient-primary text-primary-foreground"
              onClick={handleSave}
            >
              <Save className="w-4 h-4 mr-2" />
              Salvar
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
