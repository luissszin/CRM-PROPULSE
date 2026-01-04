import { useState } from 'react';
import { Zap, Plus, Play, Pause, Trash2, X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCRMStore } from '@/store/crmStore';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const triggerOptions = [
  'Novo lead criado',
  'Lead movido de etapa',
  'Sem resposta há 3 dias',
  'Sem resposta há 7 dias',
  'Lead movido para Ganhou',
  'Lead movido para Perdeu',
  'Nova mensagem recebida',
];

const actionOptions = [
  'Enviar email de boas-vindas',
  'Enviar lembrete por WhatsApp',
  'Notificar equipe no Slack',
  'Criar tarefa de follow-up',
  'Atualizar tag do lead',
  'Mover lead para outra etapa',
  'Enviar proposta automática',
];

export default function Automations() {
  const { automations, createAutomation, toggleAutomation, deleteAutomation } = useCRMStore();
  const [showModal, setShowModal] = useState(false);
  const [newAutomation, setNewAutomation] = useState({
    name: '',
    trigger: '',
    action: '',
    active: true,
  });

  const handleCreate = () => {
    if (!newAutomation.name || !newAutomation.trigger || !newAutomation.action) {
      toast({
        title: "Preencha todos os campos",
        description: "Nome, gatilho e ação são obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    createAutomation(newAutomation);
    setNewAutomation({ name: '', trigger: '', action: '', active: true });
    setShowModal(false);
    toast({
      title: "Automação criada!",
      description: "Sua automação foi salva com sucesso.",
    });
  };

  const handleToggle = (id: string) => {
    toggleAutomation(id);
    toast({
      title: "Automação atualizada",
      description: "O status da automação foi alterado.",
    });
  };

  const handleDelete = (id: string) => {
    deleteAutomation(id);
    toast({
      title: "Automação excluída",
      description: "A automação foi removida com sucesso.",
    });
  };

  return (
    <div className="p-6 lg:p-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Automações</h1>
          <p className="text-muted-foreground">
            Configure fluxos automáticos para seu pipeline
          </p>
        </div>
        <Button 
          onClick={() => setShowModal(true)}
          className="gradient-accent text-accent-foreground"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova Automação
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="p-6 bg-card border-border">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-primary/10">
              <Zap className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{automations.length}</p>
              <p className="text-sm text-muted-foreground">Total de Automações</p>
            </div>
          </div>
        </Card>
        <Card className="p-6 bg-card border-border">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-success/10">
              <Play className="w-6 h-6 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {automations.filter(a => a.active).length}
              </p>
              <p className="text-sm text-muted-foreground">Ativas</p>
            </div>
          </div>
        </Card>
        <Card className="p-6 bg-card border-border">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-muted">
              <Pause className="w-6 h-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {automations.filter(a => !a.active).length}
              </p>
              <p className="text-sm text-muted-foreground">Pausadas</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Automations List */}
      <div className="space-y-4">
        {automations.map((automation) => (
          <Card
            key={automation.id}
            className={cn(
              "p-6 bg-card border-border transition-all duration-200",
              automation.active ? "border-l-4 border-l-primary" : "opacity-70"
            )}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className={cn(
                  "p-3 rounded-xl",
                  automation.active ? "bg-primary/10" : "bg-muted"
                )}>
                  <Zap className={cn(
                    "w-6 h-6",
                    automation.active ? "text-primary" : "text-muted-foreground"
                  )} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-1">
                    {automation.name}
                  </h3>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">Gatilho:</span> {automation.trigger}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">Ação:</span> {automation.action}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Criada em {new Date(automation.createdAt).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {automation.active ? 'Ativa' : 'Pausada'}
                  </span>
                  <Switch
                    checked={automation.active}
                    onCheckedChange={() => handleToggle(automation.id)}
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(automation.id)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}

        {automations.length === 0 && (
          <Card className="p-12 bg-card border-border border-dashed">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-lg font-medium text-foreground mb-2">
                Nenhuma automação criada
              </p>
              <p className="text-muted-foreground mb-4">
                Crie sua primeira automação para automatizar seu pipeline
              </p>
              <Button onClick={() => setShowModal(true)} className="gradient-primary text-primary-foreground">
                <Plus className="w-4 h-4 mr-2" />
                Criar Automação
              </Button>
            </div>
          </Card>
        )}
      </div>

      {/* Create Modal */}
      {showModal && (
        <>
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
            onClick={() => setShowModal(false)}
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-card border border-border rounded-xl z-50 animate-fade-in">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-xl font-bold text-foreground">Nova Automação</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowModal(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="p-6 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Nome da Automação</Label>
                <Input
                  id="name"
                  placeholder="Ex: Follow-up automático"
                  value={newAutomation.name}
                  onChange={(e) => setNewAutomation({ ...newAutomation, name: e.target.value })}
                  className="bg-secondary border-border"
                />
              </div>

              <div className="space-y-2">
                <Label>Gatilho (Quando)</Label>
                <Select
                  value={newAutomation.trigger}
                  onValueChange={(value) => setNewAutomation({ ...newAutomation, trigger: value })}
                >
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue placeholder="Selecione o gatilho" />
                  </SelectTrigger>
                  <SelectContent>
                    {triggerOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Ação (Fazer)</Label>
                <Select
                  value={newAutomation.action}
                  onValueChange={(value) => setNewAutomation({ ...newAutomation, action: value })}
                >
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue placeholder="Selecione a ação" />
                  </SelectTrigger>
                  <SelectContent>
                    {actionOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <Label>Ativar automação</Label>
                <Switch
                  checked={newAutomation.active}
                  onCheckedChange={(checked) => setNewAutomation({ ...newAutomation, active: checked })}
                />
              </div>
            </div>

            <div className="flex gap-3 p-6 border-t border-border">
              <Button
                variant="outline"
                onClick={() => setShowModal(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleCreate}
                className="flex-1 gradient-primary text-primary-foreground"
              >
                Criar Automação
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
