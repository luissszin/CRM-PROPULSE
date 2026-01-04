import { useState, useEffect } from 'react';
import {
    Plus,
    Play,
    Pause,
    Trash2,
    Zap,
    MessageSquare,
    UserPlus,
    ArrowRight,
    History,
    CheckCircle2,
    XCircle,
    AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMultiTenantStore } from '@/store/multiTenantStore';
import api from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle
} from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function UnitAutomations() {
    const { currentUnit } = useMultiTenantStore();
    const [flows, setFlows] = useState<any[]>([]);
    const [logs, setLogs] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [newFlow, setNewFlow] = useState({
        name: '',
        trigger_type: 'new_lead',
        trigger_config: {} as any,
        actions: [{ type: 'send_whatsapp', message: 'Olá {{lead.name}}, como podemos ajudar?' }]
    });

    const loadData = async () => {
        if (!currentUnit) return;
        try {
            setIsLoading(true);
            const [flowsData, logsData] = await Promise.all([
                api.getAutomationFlows(currentUnit.id),
                api.getAutomationLogs(currentUnit.id)
            ]);
            setFlows(flowsData);
            setLogs(logsData);
        } catch (error) {
            console.error('Error loading automations:', error);
            toast({ title: "Erro ao carregar automações", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [currentUnit]);

    const handleCreateFlow = async () => {
        if (!currentUnit || !newFlow.name) return;
        try {
            await api.createAutomationFlow({
                unitId: currentUnit.id,
                ...newFlow
            });
            toast({ title: "Automação criada com sucesso!" });
            setShowCreateDialog(false);
            setNewFlow({
                name: '',
                trigger_type: 'new_lead',
                trigger_config: {},
                actions: [{ type: 'send_whatsapp', message: 'Olá {{lead.name}}, como podemos ajudar?' }]
            });
            loadData();
        } catch (error) {
            toast({ title: "Erro ao criar automação", variant: "destructive" });
        }
    };

    const toggleFlow = async (id: string, active: boolean) => {
        try {
            await api.updateAutomationFlow(id, { active });
            setFlows(flows.map(f => f.id === id ? { ...f, active } : f));
            toast({ title: active ? "Automação ativada" : "Automação pausada" });
        } catch (error) {
            toast({ title: "Erro ao atualizar automação", variant: "destructive" });
        }
    };

    const deleteFlow = async (id: string) => {
        if (!confirm("Tem certeza que deseja excluir esta automação?")) return;
        try {
            await api.deleteAutomationFlow(id);
            setFlows(flows.filter(f => f.id !== id));
            toast({ title: "Automação excluída" });
        } catch (error) {
            toast({ title: "Erro ao excluir automação", variant: "destructive" });
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-2">
                        <Zap className="w-8 h-8 text-primary" />
                        Designer de Automações
                    </h1>
                    <p className="text-muted-foreground">Crie fluxos inteligentes para agilizar seu atendimento.</p>
                </div>

                <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                    <DialogTrigger asChild>
                        <Button className="gradient-primary text-primary-foreground group">
                            <Plus className="w-4 h-4 mr-2 group-hover:rotate-90 transition-transform" />
                            Novo Fluxo
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl bg-card border-border">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-bold">Criar Nova Automação</DialogTitle>
                            <DialogDescription>
                                Defina um gatilho e as ações que devem ser executadas automaticamente.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-6 py-4">
                            <div className="space-y-2">
                                <Label>Nome da Automação</Label>
                                <Input
                                    placeholder="Ex: Boas-vindas novos leads"
                                    value={newFlow.name}
                                    onChange={e => setNewFlow({ ...newFlow, name: e.target.value })}
                                    className="bg-secondary border-border"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Quando isso acontecer (Gatilho)</Label>
                                    <Select
                                        value={newFlow.trigger_type}
                                        onValueChange={v => setNewFlow({ ...newFlow, trigger_type: v })}
                                    >
                                        <SelectTrigger className="bg-secondary border-border">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="new_lead">Novo Lead Criado</SelectItem>
                                            <SelectItem value="new_message">Mensagem via WhatsApp</SelectItem>
                                            <SelectItem value="stage_change">Mudança de Estágio (Pipeline Digital)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {newFlow.trigger_type === 'stage_change' && (
                                    <div className="space-y-2">
                                        <Label>Para qual Estágio?</Label>
                                        <Select
                                            value={newFlow.trigger_config.newStage || ''}
                                            onValueChange={v => setNewFlow({ ...newFlow, trigger_config: { ...newFlow.trigger_config, newStage: v } })}
                                        >
                                            <SelectTrigger className="bg-secondary border-border">
                                                <SelectValue placeholder="Selecione o estágio" />
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
                                )}

                                <div className="space-y-2">
                                    <Label>Ação Instantânea</Label>
                                    <div className="flex items-center gap-2 p-3 bg-primary/5 border border-primary/20 rounded-md">
                                        <MessageSquare className="w-4 h-4 text-primary" />
                                        <span className="text-sm font-medium">Enviar WhatsApp</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Mensagem do WhatsApp</Label>
                                <textarea
                                    className="w-full min-h-[100px] p-3 rounded-md bg-secondary border border-border text-sm focus:ring-1 focus:ring-primary outline-none"
                                    placeholder="Olá {{name}}, recebemos seu contato!"
                                    value={newFlow.actions[0].message}
                                    onChange={e => {
                                        const actions = [...newFlow.actions];
                                        actions[0].message = e.target.value;
                                        setNewFlow({ ...newFlow, actions });
                                    }}
                                />
                                <p className="text-[10px] text-muted-foreground">
                                    Use {"{{lead.name}}"} para o nome, {"{{lead.email}}"} para o email.
                                    Campos profundos como {"{{lead.custom_fields.id}}"} também são suportados.
                                </p>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancelar</Button>
                            <Button onClick={handleCreateFlow} disabled={!newFlow.name} className="gradient-primary text-primary-foreground">
                                Salvar e Ativar
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <Tabs defaultValue="flows" className="w-full">
                <TabsList className="bg-secondary border-border mb-6">
                    <TabsTrigger value="flows" className="gap-2">
                        <Zap className="w-4 h-4" />
                        Meus Fluxos
                    </TabsTrigger>
                    <TabsTrigger value="logs" className="gap-2">
                        <History className="w-4 h-4" />
                        Histórico de Execuções
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="flows">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {flows.length === 0 && !isLoading && (
                            <div className="col-span-full py-12 text-center bg-secondary/50 rounded-xl border border-dashed border-border">
                                <Zap className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                                <p className="text-muted-foreground font-medium">Nenhuma automação configurada.</p>
                                <p className="text-sm text-muted-foreground mb-6">Comece criando seu primeiro fluxo automático hoje.</p>
                                <Button onClick={() => setShowCreateDialog(true)} variant="outline">
                                    Começar agora
                                </Button>
                            </div>
                        )}

                        {flows.map((flow) => (
                            <Card key={flow.id} className={`group hover:shadow-xl transition-all duration-300 border-border overflow-hidden ${!flow.active && 'opacity-70'}`}>
                                <CardHeader className="pb-4">
                                    <div className="flex items-start justify-between">
                                        <div className="p-2 bg-primary/10 rounded-lg">
                                            {flow.trigger_type === 'new_lead' ? <UserPlus className="w-5 h-5 text-primary" /> : <MessageSquare className="w-5 h-5 text-primary" />}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Status</span>
                                            <Switch
                                                checked={flow.active}
                                                onCheckedChange={(checked) => toggleFlow(flow.id, checked)}
                                            />
                                        </div>
                                    </div>
                                    <CardTitle className="mt-4 text-xl">{flow.name}</CardTitle>
                                    <CardDescription className="flex items-center gap-1 mt-1">
                                        Gatilho: <span className="font-semibold text-foreground">
                                            {flow.trigger_type === 'new_lead' ? 'Novo Lead' :
                                                flow.trigger_type === 'stage_change' ? `Moveu para ${flow.trigger_config?.newStage || 'Etapa'}` :
                                                    'Nova Mensagem'}
                                        </span>
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center gap-3 p-3 bg-secondary rounded-lg border border-border">
                                        <div className="flex flex-col items-center">
                                            <div className="w-1 h-3 bg-primary/40 rounded-full" />
                                            <ArrowRight className="w-3 h-3 text-primary my-1" />
                                            <div className="w-1 h-3 bg-primary/40 rounded-full" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase">Ação</p>
                                            <p className="text-sm font-medium">Enviar WhatsApp</p>
                                        </div>
                                    </div>
                                </CardContent>
                                <CardFooter className="pt-2 flex items-center justify-between border-t border-border mt-2">
                                    <div className="flex items-center gap-2">
                                        {flow.active ? (
                                            <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 gap-1 px-1.5 py-0">
                                                <Play className="w-2.5 h-2.5 fill-current" /> Ativo
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20 gap-1 px-1.5 py-0">
                                                <Pause className="w-2.5 h-2.5 fill-current" /> Pausado
                                            </Badge>
                                        )}
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => deleteFlow(flow.id)}
                                        className="text-destructive hover:bg-destructive/10 h-8 w-8"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                </TabsContent>

                <TabsContent value="logs">
                    <Card className="border-border">
                        <CardHeader>
                            <CardTitle>Últimas Execuções</CardTitle>
                            <CardDescription>Acompanhe em tempo real o que suas automações estão fazendo.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {logs.length === 0 && (
                                    <div className="py-8 text-center text-muted-foreground">Nenhuma execução registrada ainda.</div>
                                )}
                                {logs.map((log) => (
                                    <div key={log.id} className="flex items-center justify-between p-4 bg-secondary/50 border border-border rounded-xl group hover:border-primary/20 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className={`p-2 rounded-full ${log.status === 'success' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                                {log.status === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-foreground flex items-center gap-2">
                                                    {log.automation_flows?.name}
                                                    <ArrowRight className="w-3 h-3 text-muted-foreground" />
                                                    <span className="text-sm font-normal text-muted-foreground">Lead: {log.leads?.name || 'Sistema'}</span>
                                                </p>
                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                    Executado em {format(new Date(log.executed_at), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                                                </p>
                                            </div>
                                        </div>
                                        <div>
                                            {log.status === 'error' && (
                                                <Badge variant="destructive" className="gap-1">
                                                    <AlertCircle className="w-3 h-3" />
                                                    Erro: {log.error_message}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
