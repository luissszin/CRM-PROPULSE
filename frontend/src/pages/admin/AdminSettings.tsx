import { useState } from 'react';
import { Settings, Save, Globe, Bell, Shield, Palette, Database, Mail } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';

export default function AdminSettings() {
  const [settings, setSettings] = useState({
    // Geral
    appName: 'PROPULSE',
    appDescription: 'CRM Multi-Unidade para gestão de leads e conversas',
    supportEmail: 'suporte@propulse.com.br',
    
    // Notificações
    emailNotifications: true,
    pushNotifications: false,
    dailyReports: true,
    weeklyReports: false,
    
    // Segurança
    twoFactorAuth: false,
    sessionTimeout: 60,
    passwordMinLength: 8,
    
    // Aparência
    darkMode: true,
    compactMode: false,
    showAnimations: true,
    
    // Integrações
    webhookUrl: '',
    apiKey: '',
  });

  const handleSave = () => {
    toast({ title: "Configurações salvas com sucesso!" });
  };

  return (
    <div className="p-6 lg:p-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-1">Configurações</h1>
          <p className="text-sm text-muted-foreground">Configure as preferências do sistema</p>
        </div>
        <Button onClick={handleSave} className="gradient-primary text-primary-foreground">
          <Save className="w-4 h-4 mr-2" />
          Salvar Alterações
        </Button>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="bg-secondary border border-border">
          <TabsTrigger value="general" className="data-[state=active]:bg-background">
            <Globe className="w-4 h-4 mr-2" />
            Geral
          </TabsTrigger>
          <TabsTrigger value="notifications" className="data-[state=active]:bg-background">
            <Bell className="w-4 h-4 mr-2" />
            Notificações
          </TabsTrigger>
          <TabsTrigger value="security" className="data-[state=active]:bg-background">
            <Shield className="w-4 h-4 mr-2" />
            Segurança
          </TabsTrigger>
          <TabsTrigger value="appearance" className="data-[state=active]:bg-background">
            <Palette className="w-4 h-4 mr-2" />
            Aparência
          </TabsTrigger>
          <TabsTrigger value="integrations" className="data-[state=active]:bg-background">
            <Database className="w-4 h-4 mr-2" />
            Integrações
          </TabsTrigger>
        </TabsList>

        {/* Geral */}
        <TabsContent value="general">
          <Card className="p-6 bg-card border-border">
            <h3 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
              <Globe className="w-5 h-5 text-primary" />
              Configurações Gerais
            </h3>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-sm">Nome do Aplicativo</Label>
                  <Input
                    value={settings.appName}
                    onChange={(e) => setSettings({ ...settings, appName: e.target.value })}
                    className="bg-secondary border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Email de Suporte</Label>
                  <Input
                    type="email"
                    value={settings.supportEmail}
                    onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
                    className="bg-secondary border-border"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Descrição do Sistema</Label>
                <Textarea
                  value={settings.appDescription}
                  onChange={(e) => setSettings({ ...settings, appDescription: e.target.value })}
                  className="bg-secondary border-border min-h-[100px]"
                />
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Notificações */}
        <TabsContent value="notifications">
          <Card className="p-6 bg-card border-border">
            <h3 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              Configurações de Notificações
            </h3>
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50">
                <div>
                  <p className="font-medium text-foreground">Notificações por Email</p>
                  <p className="text-sm text-muted-foreground">Receba alertas importantes por email</p>
                </div>
                <Switch
                  checked={settings.emailNotifications}
                  onCheckedChange={(checked) => setSettings({ ...settings, emailNotifications: checked })}
                />
              </div>
              <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50">
                <div>
                  <p className="font-medium text-foreground">Notificações Push</p>
                  <p className="text-sm text-muted-foreground">Receba notificações em tempo real no navegador</p>
                </div>
                <Switch
                  checked={settings.pushNotifications}
                  onCheckedChange={(checked) => setSettings({ ...settings, pushNotifications: checked })}
                />
              </div>
              <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50">
                <div>
                  <p className="font-medium text-foreground">Relatórios Diários</p>
                  <p className="text-sm text-muted-foreground">Receba um resumo diário das atividades</p>
                </div>
                <Switch
                  checked={settings.dailyReports}
                  onCheckedChange={(checked) => setSettings({ ...settings, dailyReports: checked })}
                />
              </div>
              <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50">
                <div>
                  <p className="font-medium text-foreground">Relatórios Semanais</p>
                  <p className="text-sm text-muted-foreground">Receba um relatório semanal completo</p>
                </div>
                <Switch
                  checked={settings.weeklyReports}
                  onCheckedChange={(checked) => setSettings({ ...settings, weeklyReports: checked })}
                />
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Segurança */}
        <TabsContent value="security">
          <Card className="p-6 bg-card border-border">
            <h3 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Configurações de Segurança
            </h3>
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50">
                <div>
                  <p className="font-medium text-foreground">Autenticação de Dois Fatores</p>
                  <p className="text-sm text-muted-foreground">Exigir 2FA para todos os usuários</p>
                </div>
                <Switch
                  checked={settings.twoFactorAuth}
                  onCheckedChange={(checked) => setSettings({ ...settings, twoFactorAuth: checked })}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-sm">Timeout da Sessão (minutos)</Label>
                  <Input
                    type="number"
                    value={settings.sessionTimeout}
                    onChange={(e) => setSettings({ ...settings, sessionTimeout: parseInt(e.target.value) })}
                    className="bg-secondary border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Tamanho Mínimo da Senha</Label>
                  <Input
                    type="number"
                    value={settings.passwordMinLength}
                    onChange={(e) => setSettings({ ...settings, passwordMinLength: parseInt(e.target.value) })}
                    className="bg-secondary border-border"
                  />
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Aparência */}
        <TabsContent value="appearance">
          <Card className="p-6 bg-card border-border">
            <h3 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
              <Palette className="w-5 h-5 text-primary" />
              Configurações de Aparência
            </h3>
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50">
                <div>
                  <p className="font-medium text-foreground">Modo Escuro</p>
                  <p className="text-sm text-muted-foreground">Ativar tema escuro em todo o sistema</p>
                </div>
                <Switch
                  checked={settings.darkMode}
                  onCheckedChange={(checked) => setSettings({ ...settings, darkMode: checked })}
                />
              </div>
              <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50">
                <div>
                  <p className="font-medium text-foreground">Modo Compacto</p>
                  <p className="text-sm text-muted-foreground">Reduzir espaçamento para ver mais conteúdo</p>
                </div>
                <Switch
                  checked={settings.compactMode}
                  onCheckedChange={(checked) => setSettings({ ...settings, compactMode: checked })}
                />
              </div>
              <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50">
                <div>
                  <p className="font-medium text-foreground">Animações</p>
                  <p className="text-sm text-muted-foreground">Mostrar animações e transições suaves</p>
                </div>
                <Switch
                  checked={settings.showAnimations}
                  onCheckedChange={(checked) => setSettings({ ...settings, showAnimations: checked })}
                />
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Integrações */}
        <TabsContent value="integrations">
          <Card className="p-6 bg-card border-border">
            <h3 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
              <Database className="w-5 h-5 text-primary" />
              Integrações e APIs
            </h3>
            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="text-sm">URL do Webhook</Label>
                <Input
                  placeholder="https://seu-servidor.com/webhook"
                  value={settings.webhookUrl}
                  onChange={(e) => setSettings({ ...settings, webhookUrl: e.target.value })}
                  className="bg-secondary border-border"
                />
                <p className="text-xs text-muted-foreground">Receba notificações de eventos em tempo real</p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Chave de API</Label>
                <div className="flex gap-2">
                  <Input
                    type="password"
                    placeholder="••••••••••••••••"
                    value={settings.apiKey}
                    onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
                    className="bg-secondary border-border"
                  />
                  <Button variant="outline" onClick={() => {
                    setSettings({ ...settings, apiKey: `pk_${Math.random().toString(36).substring(2, 15)}` });
                    toast({ title: "Nova chave de API gerada" });
                  }}>
                    Gerar
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Use esta chave para autenticar requisições à API</p>
              </div>
              
              <div className="pt-4 border-t border-border">
                <h4 className="font-medium text-foreground mb-4">Integrações Disponíveis</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="p-4 bg-secondary/30 border-border">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-green-500/10">
                        <Mail className="w-5 h-5 text-green-500" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-foreground">WhatsApp Business</p>
                        <p className="text-xs text-muted-foreground">Não conectado</p>
                      </div>
                      <Button variant="outline" size="sm">Conectar</Button>
                    </div>
                  </Card>
                  <Card className="p-4 bg-secondary/30 border-border">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-blue-500/10">
                        <Database className="w-5 h-5 text-blue-500" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-foreground">Google Sheets</p>
                        <p className="text-xs text-muted-foreground">Não conectado</p>
                      </div>
                      <Button variant="outline" size="sm">Conectar</Button>
                    </div>
                  </Card>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
