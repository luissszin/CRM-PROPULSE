import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  MessageSquare, Loader2, CheckCircle, XCircle, 
  QrCode, RefreshCw, Smartphone, Key, Globe, LayoutDashboard, Settings,
  LogOut, ShieldCheck, Zap
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

const formSchema = z.object({
  provider: z.enum(['evolution', 'zapi', 'meta'], {
    required_error: 'Selecione um provedor de WhatsApp.',
  }),
  instanceId: z.string().min(3, 'Nome da instância deve ter pelo menos 3 caracteres'),
  apiKey: z.string().min(10, 'Chave de API deve ter pelo menos 10 caracteres'),
  apiUrl: z.string().url('URL inválida').optional().or(z.literal('')),
});

export default function UnitWhatsAppConfig() {
  const { currentUnit } = useAuthStore();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'waiting_qr'>('disconnected');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [connectionData, setConnectionData] = useState<any>(null);

  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      provider: 'evolution',
      instanceId: '',
      apiKey: '',
      apiUrl: '',
    },
  });

  const fetchStatus = useCallback(async () => {
    if (!currentUnit?.id) return;
    try {
      const { data } = await api.getUnitWhatsAppStatus(currentUnit.id);
      
      setConnectionData(data);
      if (data.status === 'not_configured') {
          setConnectionStatus('disconnected');
          setQrCode(null);
      } else {
          setConnectionStatus(data.status);
          if (data.qrCode && data.status !== 'connected') {
              setQrCode(data.qrCode);
          } else {
              setQrCode(null);
          }
          
          if (data.provider) form.setValue('provider', data.provider);
          // Don't overwrite form user edits if they are typing, but mostly this is fine
      }
    } catch (error) {
      console.error('Failed to fetch status', error);
      // setConnectionStatus('disconnected');
    } finally {
      setLoading(false);
    }
  }, [currentUnit?.id, form]);

  // Initial Load
  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Polling Logic
  useEffect(() => {
    if (connectionStatus === 'connecting' || connectionStatus === 'waiting_qr') {
      pollingRef.current = setInterval(fetchStatus, 3000); // Poll every 3s when connecting
    } else {
      if (pollingRef.current) clearInterval(pollingRef.current);
    }

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [connectionStatus, fetchStatus]);

  const handleConnect = async (values: z.infer<typeof formSchema>) => {
    if (!currentUnit?.id) return;
    
    setConnecting(true);
    try {
      // 1. Send Connect Request
      const response = await api.connectUnitWhatsApp(currentUnit.id, {
        provider: values.provider,
        credentials: {
          instanceId: values.instanceId,
          apiKey: values.apiKey,
          apiUrl: values.apiUrl,
        }
      });

      // 2. Set Immediate State based on response
      const { connection } = response.data;
      setConnectionStatus(connection.status);
      if (connection.qrCode) setQrCode(connection.qrCode);

      toast({
        title: 'Conexão Iniciada',
        description: 'Aguarde... gerando QR Code ou conectando.',
      });

    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao conectar',
        description: error.response?.data?.error || 'Verifique as credenciais e tente novamente.',
      });
      setConnectionStatus('disconnected');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!currentUnit?.id) return;
    if (!confirm('Tem certeza? Isso irá parar o funcionamento do bot.')) return;

    setDisconnecting(true);
    try {
      await api.disconnectUnitWhatsApp(currentUnit.id);
      toast({ title: 'Desconectado', description: 'Instância desconectada com sucesso.' });
      setConnectionStatus('disconnected');
      setQrCode(null);
      setConnectionData(null);
      form.reset();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro ao desconectar' });
    } finally {
      setDisconnecting(false);
    }
  };

  const handleRefreshQR = async () => {
      if (!currentUnit?.id) return;
      setConnecting(true);
      try {
          const { data } = await api.getUnitWhatsAppQrCode(currentUnit.id);
          if (data.qrcode) setQrCode(data.qrcode);
          toast({ title: 'QR Code Atualizado' });
      } catch (error) {
          toast({ variant: 'destructive', title: 'Erro ao atualizar QR' });
      } finally {
          setConnecting(false);
      }
  };

  if (!currentUnit) return <div className="p-8">Selecione uma unidade.</div>;
  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin h-8 w-8" /></div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white/90">WhatsApp Config</h1>
          <p className="text-muted-foreground mt-1">Gerencie a conexão da unidade <span className="text-white font-medium">{currentUnit.name}</span></p>
        </div>
        <div className={`px-4 py-2 rounded-full border flex items-center gap-2 ${
          connectionStatus === 'connected' 
            ? 'bg-green-500/15 border-green-500/30 text-green-400' 
            : connectionStatus === 'connecting' || connectionStatus === 'waiting_qr'
            ? 'bg-yellow-500/15 border-yellow-500/30 text-yellow-400'
            : 'bg-red-500/15 border-red-500/30 text-red-400'
        }`}>
          {connectionStatus === 'connected' && <CheckCircle className="h-4 w-4" />}
          {connectionStatus === 'connecting' && <Loader2 className="h-4 w-4 animate-spin" />}
          {connectionStatus === 'disconnected' && <XCircle className="h-4 w-4" />}
          <span className="capitalize font-medium text-sm">
            {connectionStatus === 'connected' ? 'Conectado' : 
             connectionStatus === 'connecting' ? 'Conectando...' : 
             connectionStatus === 'waiting_qr' ? 'Aguardando Leitura' : 'Desconectado'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Config Form */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Settings className="h-5 w-5 text-indigo-400" />
                Configurar Provedor
              </CardTitle>
              <CardDescription>Insira as credenciais da API do WhatsApp.</CardDescription>
            </CardHeader>
            <CardContent>
              {connectionStatus === 'connected' ? (
                 <div className="flex flex-col items-center justify-center py-10 space-y-4">
                     <div className="h-20 w-20 bg-green-500/20 rounded-full flex items-center justify-center">
                         <Smartphone className="h-10 w-10 text-green-400" />
                     </div>
                     <h3 className="text-2xl font-semibold text-green-400">Tudo Pronto!</h3>
                     <p className="text-gray-400 text-center max-w-md">
                         Seu WhatsApp está conectado e pronto para enviar/receber mensagens através da 
                         instância <strong>{connectionData?.instanceId}</strong>.
                     </p>
                     <div className="pt-4 w-full max-w-xs">
                        <Button variant="destructive" className="w-full" onClick={handleDisconnect} disabled={disconnecting}>
                            {disconnecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <LogOut className="mr-2 h-4 w-4"/>}
                            Desconectar Sessão
                        </Button>
                     </div>
                 </div>
              ) : (
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleConnect)} className="space-y-4">
                      
                      <FormField
                        control={form.control}
                        name="provider"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Provedor</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value} disabled={connectionStatus !== 'disconnected'}>
                              <FormControl>
                                <SelectTrigger className="bg-white/5 border-white/10">
                                  <SelectValue placeholder="Selecione..." />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="evolution">Evolution API (Recomendado)</SelectItem>
                                <SelectItem value="zapi">Z-API</SelectItem>
                                <SelectItem value="meta">Meta Cloud API (Oficial)</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription>Selecione a tecnologia gateway.</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="instanceId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Nome da Instância</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder={`unit_${currentUnit.id}`} className="bg-white/5 border-white/10" disabled={connectionStatus !== 'disconnected'} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="apiKey"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>API Key / Token</FormLabel>
                                <FormControl>
                                  <Input {...field} type="password" placeholder="••••••••••••" className="bg-white/5 border-white/10" disabled={connectionStatus !== 'disconnected'} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                      </div>

                      <FormField
                        control={form.control}
                        name="apiUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>API Base URL (Opcional)</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="https://api.evolution..." className="bg-white/5 border-white/10" disabled={connectionStatus !== 'disconnected'}/>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="pt-4">
                        <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700" disabled={connecting}>
                          {connecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          {connecting ? 'Iniciando...' : 'Salvar & Conectar'}
                        </Button>
                      </div>
                    </form>
                  </Form>
              )}
            </CardContent>
          </Card>
        </div>

        {/* QR Code / Status Panel */}
        <div className="space-y-6">
           {connectionStatus !== 'connected' && qrCode && (
              <Card className="border-white/10 bg-white/5 backdrop-blur-xl overflow-hidden animate-in zoom-in-95 duration-500">
                  <CardHeader className="bg-white/5 pb-4">
                      <CardTitle className="text-center text-lg flex items-center justify-center gap-2">
                          <QrCode className="h-5 w-5"/> Escaneie o QR Code
                      </CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col items-center justify-center p-6 space-y-4 bg-white">
                      <div className="relative h-64 w-64">
                         <img src={qrCode.startsWith('data:') ? qrCode : `data:image/png;base64,${qrCode}`} alt="WhatsApp QR Code" className="h-full w-full object-contain" />
                         {/* Scan overlay effect */}
                         <div className="absolute inset-0 border-b-2 border-indigo-500 animate-scan pointer-events-none opacity-50"></div>
                      </div>
                      <p className="text-sm text-gray-800 text-center font-medium">
                          Abra o WhatsApp > Aparelhos Conectados > Conectar Aparelho
                      </p>
                      <Button variant="outline" size="sm" onClick={handleRefreshQR} className="w-full border-gray-300 text-gray-700 hover:bg-gray-50">
                          <RefreshCw className="mr-2 h-3 w-3" /> Gerar Novo QR
                      </Button>
                  </CardContent>
              </Card>
           )}

           <Card className="border-white/10 bg-white/5">
               <CardHeader>
                   <CardTitle className="text-base">Diagnóstico</CardTitle>
               </CardHeader>
               <CardContent className="space-y-3">
                   <div className="flex justify-between text-sm">
                       <span className="text-muted-foreground">Status API</span>
                       <span className="text-green-400">Online</span>
                   </div>
                   <div className="flex justify-between text-sm">
                       <span className="text-muted-foreground">Webhook</span>
                       <span className={connectionData?.webhookUrl ? 'text-green-400' : 'text-yellow-400'}>
                           {connectionData?.webhookUrl ? 'Configurado' : 'Pendente'}
                       </span>
                   </div>
                   <div className="flex justify-between text-sm">
                       <span className="text-muted-foreground">Last Ping</span>
                       <span className="text-xs text-muted-foreground font-mono">{new Date().toLocaleTimeString()}</span>
                   </div>
               </CardContent>
           </Card>
        </div>
      </div>
    </div>
  );
}
