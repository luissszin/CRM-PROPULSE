import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
    Plus, MessageSquare, RefreshCw, LogOut, CheckCircle2,
    XCircle, QrCode, Phone, Globe, ShieldCheck, Zap, Settings2, Info,
    AlertCircle, Loader2, Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useMultiTenantStore } from '@/store/multiTenantStore';
import {
    getWhatsappInstances,
    createWhatsappInstance,
    connectWhatsappInstance,
    getWhatsappInstanceStatus,
    disconnectWhatsappInstance
} from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const formSchema = z.object({
    provider: z.string(),
    instanceName: z.string().min(3, "O nome deve ter pelo menos 3 caracteres"),
    // Evolution fields
    apiUrl: z.string().optional(),
    apiKey: z.string().optional(),
    // Meta fields
    phoneNumberId: z.string().optional(),
    wabaId: z.string().optional(),
    accessToken: z.string().optional(),
    // Z-API fields
    instanceId: z.string().optional(),
    token: z.string().optional(),
    clientToken: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function UnitWhatsAppConfig() {
    const { slug } = useParams<{ slug: string }>();
    const { currentUnit } = useMultiTenantStore();
    const [instances, setInstances] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [connectingId, setConnectingId] = useState<string | null>(null);
    const [isOpen, setIsOpen] = useState(false);

    // Form Hook
    const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting }, reset } = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            provider: 'evolution',
            instanceName: '',
            apiUrl: '',
            apiKey: '',
        }
    });

    const selectedProvider = watch('provider');

    useEffect(() => {
        if (currentUnit) {
            loadInstances();
        }
    }, [currentUnit]);

    useEffect(() => {
        if (!isOpen) {
            reset();
            setQrCode(null);
        }
    }, [isOpen, reset]);

    const loadInstances = async () => {
        if (!currentUnit) return;
        try {
            setLoading(true);
            const data = await getWhatsappInstances(currentUnit.id);
            setInstances(data);
        } catch (error: any) {
            console.error(error);
            toast({ title: 'Erro ao carregar', description: 'Não foi possível buscar as conexões.', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    const onSubmit = async (data: FormValues) => {
        if (!currentUnit) return;
        try {
            const payload = {
                unitId: currentUnit.id,
                instanceName: data.instanceName.trim(),
                provider: data.provider,
                config: data.provider === 'evolution' ? {
                    apiUrl: data.apiUrl || undefined,
                    apiKey: data.apiKey || undefined
                } : data.provider === 'meta' ? {
                    phoneNumberId: data.phoneNumberId,
                    wabaId: data.wabaId,
                    accessToken: data.accessToken
                } : { // zapi
                    instanceId: data.instanceId,
                    token: data.token,
                    clientToken: data.clientToken
                }
            };

            await createWhatsappInstance(payload);
            setIsOpen(false);
            toast({ title: 'Sucesso!', description: 'Nova conexão configurada com sucesso.', className: 'bg-green-600 border-none text-white' });
            loadInstances();
        } catch (error: any) {
            toast({ title: 'Falha na configuração', description: error.message || 'Verifique os dados e tente novamente.', variant: 'destructive' });
        }
    };

    const handleConnect = async (id: string) => {
        try {
            setConnectingId(id);
            setQrCode(null);
            const data = await connectWhatsappInstance(id);
            if (data.qrcode) {
                setQrCode(data.qrcode.base64 || data.qrcode);
            } else if (data.status === 'connected') {
                toast({ title: 'Já conectado!', description: 'Esta instância já está ativa.' });
                loadInstances();
            }
        } catch (error: any) {
            toast({ title: 'Erro de Conexão', description: error.message, variant: 'destructive' });
        } finally {
            setConnectingId(null);
        }
    };

    const handleRefreshStatus = async (id: string) => {
        try {
            await getWhatsappInstanceStatus(id);
            loadInstances();
            toast({ title: 'Status sincronizado' });
        } catch (error: any) {
            toast({ title: 'Erro ao verificar', description: 'O serviço pode estar indisponível.', variant: 'destructive' });
        }
    };

    const handleDisconnect = async (id: string) => {
        if (!confirm('Tem certeza? Isso irá parar o envio de mensagens.')) return;
        try {
            await disconnectWhatsappInstance(id);
            loadInstances();
            toast({ title: 'Desconectado', description: 'A instância foi desconectada.' });
        } catch (error: any) {
            toast({ title: 'Erro', description: error.message, variant: 'destructive' });
        }
    };

    return (
        <div className="p-6 space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                        <MessageSquare className="w-8 h-8 text-primary" />
                        Canais de WhatsApp
                    </h1>
                    <p className="text-muted-foreground mt-2 text-base">
                        Gerencie as conexões de WhatsApp desta unidade de forma independente.
                    </p>
                </div>

                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                        <Button size="lg" className="font-bold shadow-lg shadow-primary/20">
                            <Plus className="w-5 h-5 mr-2" />
                            Nova Conexão
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[550px] bg-card border-border text-white">
                        <DialogHeader>
                            <DialogTitle>Nova Conexão WhatsApp</DialogTitle>
                            <DialogDescription>
                                Configure uma nova linha de atendimento.
                            </DialogDescription>
                        </DialogHeader>

                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 py-4">
                            <div className="grid gap-4">
                                <div className="space-y-2">
                                    <Label>Provedor de API</Label>
                                    <Select 
                                        onValueChange={(val) => setValue('provider', val)} 
                                        defaultValue={selectedProvider}
                                    >
                                        <SelectTrigger className="h-11">
                                            <SelectValue placeholder="Selecione..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="evolution">Evolution API (Recomendado)</SelectItem>
                                            <SelectItem value="meta">Meta Cloud API (Oficial)</SelectItem>
                                            <SelectItem value="zapi">Z-API</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="instanceName">Nome da Conexão <span className="text-red-400">*</span></Label>
                                    <Input
                                        id="instanceName"
                                        placeholder="Ex: Comercial, Suporte N1..."
                                        className="h-11"
                                        {...register('instanceName')}
                                        autoFocus
                                    />
                                    {errors.instanceName && (
                                        <p className="text-red-400 text-xs">{errors.instanceName.message}</p>
                                    )}
                                </div>

                                {selectedProvider === 'evolution' && (
                                    <Alert className="bg-blue-500/10 border-blue-500/20 text-blue-200">
                                        <Info className="h-4 w-4" />
                                        <AlertTitle>Configuração Automática</AlertTitle>
                                        <AlertDescription>
                                            O sistema usará as credenciais globais do servidor. Deixe os campos abaixo vazios, a menos que queira usar um servidor externo.
                                        </AlertDescription>
                                    </Alert>
                                )}

                                {selectedProvider === 'evolution' && (
                                    <div className="grid grid-cols-1 gap-4 pt-2">
                                        <div className="space-y-2">
                                            <Label>Base URL (Opcional)</Label>
                                            <Input placeholder="https://..." {...register('apiUrl')} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>API Key (Opcional)</Label>
                                            <Input type="password" placeholder="••••••" {...register('apiKey')} />
                                        </div>
                                    </div>
                                )}

                                {selectedProvider === 'meta' && (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>Phone Number ID</Label>
                                                <Input {...register('phoneNumberId')} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>WABA ID</Label>
                                                <Input {...register('wabaId')} />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Token de Acesso</Label>
                                            <Input type="password" {...register('accessToken')} />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <DialogFooter>
                                <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>
                                    Cancelar
                                </Button>
                                <Button type="submit" isLoading={isSubmitting} className="font-bold min-w-[120px]">
                                    Salvar Conexão
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                        <Card key={i} className="bg-card/50 border-border h-[280px] animate-pulse" />
                    ))
                ) : instances.length === 0 ? (
                    <div className="col-span-full py-20 text-center border-2 border-dashed border-border/50 rounded-2xl bg-secondary/5">
                        <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                            <Phone className="w-8 h-8 text-primary" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Nenhuma conexão ativa</h3>
                        <p className="text-muted-foreground max-w-sm mx-auto">
                            Clique em "Nova Conexão" para começar a atender seus clientes por WhatsApp.
                        </p>
                    </div>
                ) : (
                    instances.map((instance) => (
                        <Card key={instance.id} className="group relative overflow-hidden bg-card border-border hover:border-primary/50 transition-all duration-300 shadow-md hover:shadow-xl">
                            <div className={cn(
                                "absolute top-0 left-0 w-1 h-full transition-colors",
                                instance.status === 'connected' ? "bg-green-500" : 
                                instance.status === 'connecting' ? "bg-yellow-500" : "bg-red-500"
                            )} />
                            
                            <CardHeader className="pb-3 border-b border-border/40 bg-secondary/5">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 rounded-lg bg-background border border-border/50">
                                            {instance.provider === 'meta' ? <Globe className="w-5 h-5 text-blue-400" /> : <Zap className="w-5 h-5 text-yellow-400" />}
                                        </div>
                                        <div>
                                            <CardTitle className="text-base font-bold text-white">
                                                {instance.instance_name || instance.instanceName || instance.instancename}
                                            </CardTitle>
                                            <CardDescription className="text-xs font-medium uppercase tracking-wider opacity-70">
                                                {instance.provider}
                                            </CardDescription>
                                        </div>
                                    </div>
                                    <Badge variant="outline" className={cn(
                                        "capitalize",
                                        instance.status === 'connected' ? "border-green-500/50 text-green-400 bg-green-500/10" : "border-yellow-500/50 text-yellow-400 bg-yellow-500/10"
                                    )}>
                                        {instance.status}
                                    </Badge>
                                </div>
                            </CardHeader>

                            <CardContent className="pt-6">
                                {instance.id === connectingId || (qrCode && instance.status !== 'connected' && instance.provider === 'evolution') ? (
                                    <div className="flex flex-col items-center justify-center space-y-4 py-2">
                                        <div className="relative p-2 bg-white rounded-xl shadow-inner">
                                            {instance.id === connectingId ? (
                                                <div className="w-40 h-40 flex items-center justify-center">
                                                    <Loader2 className="w-10 h-10 text-primary animate-spin" />
                                                </div>
                                            ) : qrCode && (
                                                <img src={qrCode} alt="WhatsApp QR" className="w-40 h-40 object-contain" />
                                            )}
                                        </div>
                                        <p className="text-xs text-center text-muted-foreground animate-pulse">
                                            {instance.id === connectingId ? "Gerando QR Code..." : "Escaneie com seu celular"}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/20 border border-border/50">
                                            <div className="space-y-1">
                                                <span className="text-[10px] uppercase font-bold text-muted-foreground">Número Conectado</span>
                                                <div className="font-mono text-sm text-white">
                                                    {instance.phone ? `+${instance.phone}` : '---'}
                                                </div>
                                            </div>
                                            <CheckCircle2 className={cn("w-5 h-5", instance.status === 'connected' ? "text-green-500" : "text-muted-foreground/30")} />
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                                            <div className="flex items-center gap-2">
                                                <Settings2 className="w-3.5 h-3.5" />
                                                <span>ID: {instance.id.slice(0, 8)}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <ShieldCheck className="w-3.5 h-3.5" />
                                                <span>Seguro</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </CardContent>

                            <CardFooter className="pt-3 gap-2 border-t border-border/20 bg-secondary/5">
                                {instance.provider === 'evolution' && instance.status !== 'connected' && (
                                    <Button 
                                        onClick={() => handleConnect(instance.id)}
                                        disabled={connectingId !== null} 
                                        className="flex-1 font-bold h-9"
                                        size="sm"
                                        isLoading={connectingId === instance.id}
                                    >
                                        <QrCode className="w-4 h-4 mr-2" />
                                        Conectar
                                    </Button>
                                )}
                                
                                <Button 
                                    onClick={() => handleRefreshStatus(instance.id)}
                                    variant="outline" 
                                    size="sm"
                                    className="flex-1 border-border h-9"
                                >
                                    <RefreshCw className="w-4 h-4 mr-2" />
                                    Check
                                </Button>

                                <Button 
                                    onClick={() => handleDisconnect(instance.id)}
                                    variant="ghost" 
                                    size="sm"
                                    className="px-3 hover:bg-destructive/10 hover:text-destructive h-9"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </CardFooter>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
