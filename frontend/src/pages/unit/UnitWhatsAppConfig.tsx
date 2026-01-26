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
import api from '@/lib/api';
import { useMultiTenantStore } from '@/store/multiTenantStore';

const formSchema = z.object({
  provider: z.enum(['evolution', 'zapi', 'meta'], {
    required_error: 'Selecione um provedor de WhatsApp.',
  }),
  instanceId: z.string().min(3, 'Nome da instância deve ter pelo menos 3 caracteres'),
  apiKey: z.string().min(1, 'Chave de API é obrigatória'),
  apiUrl: z.string().optional().or(z.literal('')),
});


export default function UnitWhatsAppConfig() {
  const { currentUnit } = useMultiTenantStore();
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

  // Auto-fill instance ID
  useEffect(() => {
    if (currentUnit?.id && !form.getValues('instanceId')) {
      form.setValue('instanceId', `unit_${currentUnit.id.substring(0, 8)}`);
    }
  }, [currentUnit?.id, form]);


  const fetchStatus = useCallback(async () => {
    if (!currentUnit?.id) return;
    try {
      const data = await api.getWhatsappInstanceStatus(currentUnit.id);
      if (!data) return;
      
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

  const connectionStartTime = useRef<number | null>(null);

  // Polling Logic
  useEffect(() => {
    if (connectionStatus === 'connecting' || connectionStatus === 'waiting_qr' || connectionStatus === 'qr') {
      if (!connectionStartTime.current) connectionStartTime.current = Date.now();
      
      pollingRef.current = setInterval(() => {
        // Stop polling after 60s if stuck
        if (connectionStartTime.current && Date.now() - connectionStartTime.current > 60000) {
           console.warn('[WhatsAppConfig] Connection timeout');
           setConnectionStatus('disconnected');
           setConnecting(false);
           connectionStartTime.current = null;
           if (pollingRef.current) clearInterval(pollingRef.current);
           return;
        }
        fetchStatus();
      }, 3000);
    } else {
      connectionStartTime.current = null;
      if (pollingRef.current) clearInterval(pollingRef.current);
    }

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [connectionStatus, fetchStatus]);


  const handleConnect = async (values: z.infer<typeof formSchema>) => {
    console.log('[WhatsAppConfig] handleConnect TRIGGERED!', values);
    
    if (connecting) {
      console.warn('[WhatsAppConfig] Already connecting, ignoring click.');
      return;
    }

    if (!currentUnit?.id) {
        toast({
          variant: 'destructive',
          title: 'Erro Crítico',
          description: 'Unidade não identificada. Recarregue a página.',
        });
        return;
    }
    
    setConnecting(true);
    setConnectionStatus('connecting');
    const toastId = toast({ title: 'Conectando...', description: 'Iniciando instância...' }); // Optional: keep ref if needed or just fire
    
    try {
      const payload = {
        unitId: currentUnit.id,
        instanceName: values.instanceId,
        provider: values.provider,
        config: {
          apiKey: values.apiKey,
          apiUrl: values.apiUrl,
        }
      };
      
      const response = await api.createWhatsappInstance(payload);
      
      // Robust check for response validity
      if (!response) throw new Error('Resposta vazia do servidor');
      
      const connData = response.data?.connection || response.connection || response; // Fallback safely
      
      if (connData.status) setConnectionStatus(connData.status);
      if (connData.qrCode) setQrCode(connData.qrCode);
      // Sometimes it returns success but no QR if already connected or just created
      if (connData.status === 'connected') {
           setQrCode(null);
      }

      toast({
        title: 'Sucesso!',
        description: 'Processo iniciado. Aguarde o QR Code ou a confirmação.',
      });

    } catch (error: any) {
      console.error('[WhatsAppConfig] Create Instance Error:', error);
      
      const errorResponse = error.response || {};
      const errorMsg = errorResponse.data?.error?.message || errorResponse.data?.error || error.message || 'Erro desconhecido';
      const status = errorResponse.status;
      const errorCode = errorResponse.data?.error?.code;

      // Handle 424 (Provider QR Not Ready)
      if (status === 424) {
          toast({
              variant: 'default',
              title: 'Aguardando Provedor (Evolution)',
              description: 'Instância criada! Estamos aguardando o provedor gerar o QR Code. Isso pode levar alguns segundos.',
          });
          
          // CRITICAL: Set waiting status to trigger polling
          setConnectionStatus('waiting_qr');
          return;
      }

      toast({
        variant: 'destructive',
        title: 'Falha na Conexão',
        description: `Não foi possível conectar: ${errorMsg}`,
      });
      
      setConnectionStatus('disconnected');
    } finally {
      if (connectionStatus !== 'waiting_qr') {
          setConnecting(false);
      } else {
          setConnecting(false); 
      }
    }
  };


  const onFormError = (errors: any) => {
    // ... (keep existing)
    console.warn('[WhatsAppConfig] Form Validation Errors:', errors);
    const errorMessages = Object.entries(errors).map(([key, value]: [string, any]) => `${key}: ${value.message}`).join('\n');
    toast({
      variant: 'destructive',
      title: 'Erro de validação',
      description: `Verifique os campos: \n${errorMessages}`,
    });
  };

  const resetLocalState = () => {
    setConnecting(false);
    setDisconnecting(false);
    setConnectionStatus('disconnected');
    setQrCode(null);
    toast({ title: 'Estado reiniciado', description: 'Tente conectar novamente.' });
  };


  const handleDisconnect = async () => {
     // ... (keep existing, maybe add improved error handling later if needed)
    if (!currentUnit?.id) return;
    if (!confirm('Tem certeza? Isso irá parar o funcionamento do bot.')) return;

    setDisconnecting(true);
    try {
      await api.disconnectWhatsappInstance(currentUnit.id);
      toast({ title: 'Desconectado', description: 'Instância removida com sucesso.' });
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
          // FIX: api.connectWhatsappInstance returns the JSON body directly, NOT { data: ... }
          const response = await api.connectWhatsappInstance(currentUnit.id);
          
          if (!response) throw new Error('Erro ao obter resposta do servidor');

          // Handle potential different response structures
          const data = response.data || response;

          if (data.status === 'connected') {
              toast({ title: 'Já conectado!', description: 'O WhatsApp já está autenticado.' });
              setConnectionStatus('connected');
              setQrCode(null);
              fetchStatus(); 
          } else if (data.qrcode || data.qrCode) {
              setQrCode(data.qrcode || data.qrCode);
              setConnectionStatus('waiting_qr');
              toast({ title: 'QR Code Atualizado' });
          } else {
             // If we got here, maybe status is 'connecting' but no QR yet
             if (data.status) setConnectionStatus(data.status);
             toast({ description: 'Status atualizado. Aguardando QR Code...' });
          }
      } catch (error: any) {
          console.error('[WhatsAppConfig] Refresh QR Error:', error);
          
          // Handle 424 here as well for Refresh
          if (error.response?.status === 424) {
              toast({
                  title: 'Ainda carregando...',
                  description: 'O provedor ainda está inicializando. Tente novamente em 5 segundos.', 
              });
              setConnectionStatus('waiting_qr'); // Keep polling
          } else {
              toast({ variant: 'destructive', title: 'Erro ao atualizar QR', description: error.message });
          }
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
          {connectionStatus === 'waiting_qr' && <Loader2 className="h-4 w-4 animate-spin" />}
          {connectionStatus === 'disconnected' && <XCircle className="h-4 w-4" />}
          <span className="capitalize font-medium text-sm">
            {connectionStatus === 'connected' ? 'Conectado' : 
             connectionStatus === 'connecting' ? 'Conectando...' : 
             connectionStatus === 'waiting_qr' ? 'Aguardando Provedor' : 'Desconectado'}
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
                    <form onSubmit={form.handleSubmit(handleConnect, onFormError)} className="space-y-4">

                      
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
                                  <Input {...field} type="password" placeholder="Chave da Evolution API" className="bg-white/5 border-white/10" disabled={connectionStatus !== 'disconnected'} />
                                </FormControl>
                                <FormDescription>Chave secreta da API (ApiKey)</FormDescription>
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
                              <Input {...field} placeholder="http://localhost:8080" className="bg-white/5 border-white/10" disabled={connectionStatus !== 'disconnected'}/>
                            </FormControl>
                            <FormDescription>Deixe vazio para usar configuração padrão do servidor</FormDescription>
                            <FormMessage />
                          </FormItem>

                        )}
                      />

                      <div className="pt-4 space-y-3">
                        <Button 
                          type="submit" 
                          className="w-full bg-indigo-600 hover:bg-indigo-700 h-12 text-lg font-bold shadow-lg shadow-indigo-500/20" 
                          onClick={() => console.log('[WhatsAppConfig] Button Clicked!')}
                        >
                          {connecting ? (
                            <>
                              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                              Conectando...
                            </>
                          ) : (
                            'Salvar & Conectar'
                          )}
                        </Button>
                        
                        {(connecting || disconnecting || connectionStatus !== 'disconnected') && (
                          <div className="flex justify-center">
                            <button 
                              type="button"
                              className="text-[11px] text-white/30 hover:text-indigo-400 transition-colors underline underline-offset-4"
                              onClick={resetLocalState}
                            >
                              Problemas? Clique aqui para resetar o formulário
                            </button>
                          </div>
                        )}
                      </div>


                    </form>
                  </Form>
              )}
            </CardContent>
          </Card>
        </div>

        {/* QR Code / Status Panel */}
        <div className="space-y-6">
           {connectionStatus !== 'connected' && (
              <Card className="border-white/10 bg-white/5 backdrop-blur-xl overflow-hidden animate-in zoom-in-95 duration-500">
                  <CardHeader className="bg-white/5 pb-4">
                      <CardTitle className="text-center text-lg flex items-center justify-center gap-2">
                          <QrCode className="h-5 w-5"/> Escaneie o QR Code
                      </CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col items-center justify-center p-6 space-y-4 bg-white">
                      {qrCode ? (
                        <>
                          <div className="relative h-64 w-64">
                             <img src={qrCode.startsWith('data:') ? qrCode : `data:image/png;base64,${qrCode}`} alt="WhatsApp QR Code" className="h-full w-full object-contain" />
                             {/* Scan overlay effect */}
                             <div className="absolute inset-0 border-b-2 border-indigo-500 animate-scan pointer-events-none opacity-50"></div>
                          </div>
                          <p className="text-sm text-gray-800 text-center font-medium">
                              Abra o WhatsApp &gt; Aparelhos Conectados &gt; Conectar Aparelho
                          </p>
                          <Button variant="outline" size="sm" onClick={handleRefreshQR} className="w-full border-gray-300 text-gray-700 hover:bg-gray-50">
                              <RefreshCw className="mr-2 h-3 w-3" /> Gerar Novo QR
                          </Button>
                        </>
                      ) : (
                        <div className="flex flex-col items-center p-8 space-y-4 text-center">
                           <Loader2 className="h-12 w-12 text-indigo-500 animate-spin" />
                           <div className="space-y-1">
                               <p className="text-gray-900 font-semibold">Aguardando Provedor...</p>
                               <p className="text-gray-500 text-sm max-w-[200px]">
                                   Estamos solicitando o QR Code ao Evolution API. Isso pode levar alguns segundos.
                               </p>
                           </div>
                           <Button variant="outline" size="sm" onClick={handleRefreshQR} disabled={connecting} className="mt-2 text-indigo-600 border-indigo-200 bg-indigo-50 hover:bg-indigo-100">
                               {connecting ? 'Buscando...' : 'Verificar Agora'}
                           </Button>
                        </div>
                      )}
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
