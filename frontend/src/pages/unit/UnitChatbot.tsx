import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Bot, Plus, Play, Pause, Trash2, X, Save, MessageSquare, Clock, Zap } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMultiTenantStore, ChatbotFlow } from '@/store/multiTenantStore';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const triggerOptions = [
  'Nova conversa iniciada',
  'Palavra-chave detectada',
  'Fora do horário comercial',
  'Lead sem resposta há 24h',
  'Lead sem resposta há 48h',
  'Primeiro contato do lead',
];

export default function UnitChatbot() {
  const { slug } = useParams<{ slug: string }>();
  const { getUnitChatbotFlows, createChatbotFlow, toggleChatbotFlow, deleteChatbotFlow, currentUnit } = useMultiTenantStore();

  const flows = getUnitChatbotFlows();
  const [showModal, setShowModal] = useState(false);
  const [newFlow, setNewFlow] = useState({
    name: '',
    trigger: '',
    messages: [{ id: '1', content: '', delay: 0 }],
    active: true,
    unitId: currentUnit?.id || '',
  });

  const handleAddMessage = () => {
    setNewFlow({
      ...newFlow,
      messages: [...newFlow.messages, { id: String(newFlow.messages.length + 1), content: '', delay: 2 }],
    });
  };

  const handleUpdateMessage = (index: number, content: string) => {
    const updated = [...newFlow.messages];
    updated[index].content = content;
    setNewFlow({ ...newFlow, messages: updated });
  };

  const handleRemoveMessage = (index: number) => {
    if (newFlow.messages.length > 1) {
      const updated = newFlow.messages.filter((_, i) => i !== index);
      setNewFlow({ ...newFlow, messages: updated });
    }
  };

  const handleCreate = () => {
    if (!newFlow.name || !newFlow.trigger || !newFlow.messages[0].content) {
      toast({ title: "Preencha todos os campos", variant: "destructive" });
      return;
    }

    createChatbotFlow({
      ...newFlow,
      unitId: currentUnit?.id || '',
    });
    
    setNewFlow({
      name: '',
      trigger: '',
      messages: [{ id: '1', content: '', delay: 0 }],
      active: true,
      unitId: currentUnit?.id || '',
    });
    setShowModal(false);
    toast({ title: "Fluxo criado com sucesso!" });
  };

  const handleToggle = (id: string) => {
    toggleChatbotFlow(id);
    toast({ title: "Status atualizado" });
  };

  const handleDelete = (id: string) => {
    deleteChatbotFlow(id);
    toast({ title: "Fluxo removido" });
  };

  return (
    <div className="p-6 lg:p-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Chatbot</h1>
          <p className="text-muted-foreground">Configure mensagens automáticas e fluxos de conversa</p>
        </div>
        <Button onClick={() => setShowModal(true)} className="gradient-accent text-accent-foreground">
          <Plus className="w-4 h-4 mr-2" />
          Novo Fluxo
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="p-6 bg-card border-border">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-primary/10">
              <Bot className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{flows.length}</p>
              <p className="text-sm text-muted-foreground">Total de Fluxos</p>
            </div>
          </div>
        </Card>
        <Card className="p-6 bg-card border-border">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-success/10">
              <Play className="w-6 h-6 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{flows.filter(f => f.active).length}</p>
              <p className="text-sm text-muted-foreground">Ativos</p>
            </div>
          </div>
        </Card>
        <Card className="p-6 bg-card border-border">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-accent/10">
              <MessageSquare className="w-6 h-6 text-accent" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {flows.reduce((acc, f) => acc + f.messages.length, 0)}
              </p>
              <p className="text-sm text-muted-foreground">Mensagens</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Flows List */}
      <div className="space-y-4">
        {flows.map((flow) => (
          <Card
            key={flow.id}
            className={cn(
              "p-6 bg-card border-border transition-all duration-200",
              flow.active ? "border-l-4 border-l-primary" : "opacity-70"
            )}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className={cn("p-3 rounded-xl", flow.active ? "bg-primary/10" : "bg-muted")}>
                  <Bot className={cn("w-6 h-6", flow.active ? "text-primary" : "text-muted-foreground")} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-1">{flow.name}</h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                    <Zap className="w-4 h-4" />
                    <span>{flow.trigger}</span>
                  </div>
                  <div className="space-y-2">
                    {flow.messages.map((msg, idx) => (
                      <div key={msg.id} className="flex items-start gap-2 text-sm">
                        <span className="text-primary font-mono">{idx + 1}.</span>
                        <span className="text-foreground">{msg.content}</span>
                        {msg.delay > 0 && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {msg.delay}s
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{flow.active ? 'Ativo' : 'Pausado'}</span>
                  <Switch checked={flow.active} onCheckedChange={() => handleToggle(flow.id)} />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(flow.id)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}

        {flows.length === 0 && (
          <Card className="p-12 bg-card border-border border-dashed">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
                <Bot className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-lg font-medium text-foreground mb-2">Nenhum fluxo criado</p>
              <p className="text-muted-foreground mb-4">Crie seu primeiro fluxo de chatbot</p>
              <Button onClick={() => setShowModal(true)} className="gradient-primary text-primary-foreground">
                <Plus className="w-4 h-4 mr-2" />
                Criar Fluxo
              </Button>
            </div>
          </Card>
        )}
      </div>

      {/* Create Modal */}
      {showModal && (
        <>
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40" onClick={() => setShowModal(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-card border border-border rounded-xl z-50 animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-card flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-xl font-bold text-foreground">Novo Fluxo de Chatbot</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowModal(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="p-6 space-y-6">
              <div className="space-y-2">
                <Label>Nome do Fluxo</Label>
                <Input
                  placeholder="Ex: Boas-vindas WhatsApp"
                  value={newFlow.name}
                  onChange={(e) => setNewFlow({ ...newFlow, name: e.target.value })}
                  className="bg-secondary border-border"
                />
              </div>

              <div className="space-y-2">
                <Label>Gatilho</Label>
                <Select value={newFlow.trigger} onValueChange={(value) => setNewFlow({ ...newFlow, trigger: value })}>
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue placeholder="Selecione o gatilho" />
                  </SelectTrigger>
                  <SelectContent>
                    {triggerOptions.map((option) => (
                      <SelectItem key={option} value={option}>{option}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Mensagens</Label>
                  <Button variant="outline" size="sm" onClick={handleAddMessage}>
                    <Plus className="w-4 h-4 mr-1" />
                    Adicionar
                  </Button>
                </div>

                {newFlow.messages.map((msg, index) => (
                  <div key={msg.id} className="p-4 rounded-lg bg-secondary/50 border border-border space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-primary">Mensagem {index + 1}</span>
                      {newFlow.messages.length > 1 && (
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemoveMessage(index)}>
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    <Textarea
                      placeholder="Digite a mensagem..."
                      value={msg.content}
                      onChange={(e) => handleUpdateMessage(index, e.target.value)}
                      className="bg-background border-border min-h-[80px]"
                    />
                    {index > 0 && (
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Delay: {msg.delay}s</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between">
                <Label>Ativar fluxo</Label>
                <Switch checked={newFlow.active} onCheckedChange={(checked) => setNewFlow({ ...newFlow, active: checked })} />
              </div>
            </div>

            <div className="flex gap-3 p-6 border-t border-border">
              <Button variant="outline" onClick={() => setShowModal(false)} className="flex-1">Cancelar</Button>
              <Button onClick={handleCreate} className="flex-1 gradient-primary text-primary-foreground">
                <Save className="w-4 h-4 mr-2" />
                Criar Fluxo
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}