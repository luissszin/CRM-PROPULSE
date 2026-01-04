import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Users, Check, ArrowRight, ArrowLeft, Rocket, Upload, Image, X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMultiTenantStore } from '@/store/multiTenantStore';
import { toast } from '@/hooks/use-toast';
import { PropulseLogo } from '@/components/brand/PropulseLogo';

interface StepProps {
  isActive: boolean;
  isCompleted: boolean;
  stepNumber: number;
  title: string;
}

function StepIndicator({ isActive, isCompleted, stepNumber, title }: StepProps) {
  return (
    <div className="flex items-center gap-3">
      <div 
        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
          isCompleted 
            ? 'bg-success text-success-foreground' 
            : isActive 
              ? 'bg-primary text-primary-foreground' 
              : 'bg-secondary text-muted-foreground'
        }`}
      >
        {isCompleted ? <Check className="w-5 h-5" /> : stepNumber}
      </div>
      <span className={`text-sm font-medium ${isActive || isCompleted ? 'text-foreground' : 'text-muted-foreground'}`}>
        {title}
      </span>
    </div>
  );
}

export default function AdminOnboarding() {
  const navigate = useNavigate();
  const { createUnit, createUser, units } = useMultiTenantStore();
  const [currentStep, setCurrentStep] = useState(1);
  const [createdUnitId, setCreatedUnitId] = useState<string | null>(null);
  
  // Unit form
  const [unitData, setUnitData] = useState({
    name: '',
    slug: '',
    logo: ''
  });
  
  // User form
  const [userData, setUserData] = useState({
    name: '',
    email: '',
    password: ''
  });

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: "Por favor, selecione uma imagem", variant: "destructive" });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setUnitData({ ...unitData, logo: base64 });
    };
    reader.readAsDataURL(file);
  };

  const handleCreateUnit = () => {
    if (!unitData.name || !unitData.slug) {
      toast({ title: "Preencha todos os campos obrigatórios", variant: "destructive" });
      return;
    }

    const slugExists = units.some(u => u.slug === unitData.slug);
    if (slugExists) {
      toast({ title: "Este slug já existe", variant: "destructive" });
      return;
    }

    // Generate a temporary ID for the unit
    const tempId = Math.random().toString(36).substr(2, 9);
    createUnit({ 
      name: unitData.name, 
      slug: unitData.slug, 
      logo: unitData.logo || undefined,
      active: true, 
      customFields: [] 
    });
    
    // Get the newly created unit
    const newUnit = units.find(u => u.slug === unitData.slug);
    if (newUnit) {
      setCreatedUnitId(newUnit.id);
    }
    
    toast({ title: "Unidade criada com sucesso!" });
    setCurrentStep(3);
  };

  const handleCreateUser = () => {
    if (!userData.name || !userData.email || !userData.password) {
      toast({ title: "Preencha todos os campos", variant: "destructive" });
      return;
    }

    // Get the latest unit (the one we just created)
    const latestUnit = units[units.length - 1];
    if (!latestUnit) {
      toast({ title: "Erro: unidade não encontrada", variant: "destructive" });
      return;
    }

    createUser({
      name: userData.name,
      email: userData.email,
      password: userData.password,
      role: 'unit_admin',
      unitId: latestUnit.id
    });
    
    toast({ title: "Usuário criado com sucesso!" });
    setCurrentStep(4);
  };

  const handleFinish = () => {
    navigate('/admin');
  };

  const handleSkipUser = () => {
    setCurrentStep(4);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <PropulseLogo size="md" />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-2xl">
          {/* Progress Steps */}
          <div className="flex justify-between mb-12 relative">
            <div className="absolute top-5 left-0 right-0 h-0.5 bg-border -z-10" />
            <StepIndicator isActive={currentStep === 1} isCompleted={currentStep > 1} stepNumber={1} title="Bem-vindo" />
            <StepIndicator isActive={currentStep === 2} isCompleted={currentStep > 2} stepNumber={2} title="Unidade" />
            <StepIndicator isActive={currentStep === 3} isCompleted={currentStep > 3} stepNumber={3} title="Usuário" />
            <StepIndicator isActive={currentStep === 4} isCompleted={false} stepNumber={4} title="Concluído" />
          </div>

          {/* Step Content */}
          <Card className="p-8 bg-card border-border animate-fade-in">
            {/* Step 1: Welcome */}
            {currentStep === 1 && (
              <div className="text-center space-y-6">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <Rocket className="w-10 h-10 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-foreground mb-2">Bem-vindo ao PROPULSE!</h1>
                  <p className="text-muted-foreground">
                    Vamos configurar sua primeira unidade em poucos passos. 
                    Isso vai levar menos de 2 minutos.
                  </p>
                </div>
                <div className="pt-4">
                  <Button 
                    onClick={() => setCurrentStep(2)} 
                    className="gradient-primary text-primary-foreground px-8"
                  >
                    Começar
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Create Unit */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
                    <Building2 className="w-8 h-8 text-accent" />
                  </div>
                  <h2 className="text-xl font-bold text-foreground">Crie sua primeira unidade</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Uma unidade representa uma empresa ou filial que usará o sistema
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm">Nome da Unidade *</Label>
                    <Input
                      placeholder="Ex: Cartão de Todos - São Paulo"
                      value={unitData.name}
                      onChange={(e) => setUnitData({ ...unitData, name: e.target.value })}
                      className="bg-secondary border-border"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">Slug (URL) *</Label>
                    <Input
                      placeholder="Ex: cartao-de-todos-sp"
                      value={unitData.slug}
                      onChange={(e) => setUnitData({ 
                        ...unitData, 
                        slug: e.target.value.toLowerCase().replace(/\s/g, '-').replace(/[^a-z0-9-]/g, '')
                      })}
                      className="bg-secondary border-border font-mono"
                    />
                    <p className="text-xs text-muted-foreground">
                      URL de acesso: /{unitData.slug || 'slug'}/login
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">Logo (opcional)</Label>
                    <div className="flex items-center gap-4">
                      {unitData.logo ? (
                        <div className="relative">
                          <img 
                            src={unitData.logo} 
                            alt="Logo" 
                            className="h-12 w-auto max-w-[120px] object-contain rounded-lg border border-border bg-secondary p-2" 
                          />
                          <Button
                            variant="destructive"
                            size="icon"
                            className="absolute -top-2 -right-2 h-6 w-6"
                            onClick={() => setUnitData({ ...unitData, logo: '' })}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : (
                        <div className="h-12 w-20 rounded-lg border border-dashed border-border bg-secondary flex items-center justify-center">
                          <Image className="w-5 h-5 text-muted-foreground" />
                        </div>
                      )}
                      <label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="hidden"
                        />
                        <Button variant="outline" size="sm" asChild>
                          <span className="cursor-pointer">
                            <Upload className="w-4 h-4 mr-2" />
                            {unitData.logo ? 'Trocar' : 'Upload'}
                          </span>
                        </Button>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between pt-6">
                  <Button variant="ghost" onClick={() => setCurrentStep(1)}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Voltar
                  </Button>
                  <Button 
                    onClick={handleCreateUnit}
                    className="gradient-accent text-accent-foreground"
                  >
                    Criar Unidade
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Create User */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Users className="w-8 h-8 text-primary" />
                  </div>
                  <h2 className="text-xl font-bold text-foreground">Crie o primeiro usuário</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Este usuário será o administrador da unidade que você acabou de criar
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm">Nome Completo</Label>
                    <Input
                      placeholder="Nome do administrador"
                      value={userData.name}
                      onChange={(e) => setUserData({ ...userData, name: e.target.value })}
                      className="bg-secondary border-border"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">Email</Label>
                    <Input
                      type="email"
                      placeholder="email@exemplo.com"
                      value={userData.email}
                      onChange={(e) => setUserData({ ...userData, email: e.target.value })}
                      className="bg-secondary border-border"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">Senha</Label>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      value={userData.password}
                      onChange={(e) => setUserData({ ...userData, password: e.target.value })}
                      className="bg-secondary border-border"
                    />
                  </div>
                </div>

                <div className="flex justify-between pt-6">
                  <Button variant="ghost" onClick={handleSkipUser}>
                    Pular por agora
                  </Button>
                  <Button 
                    onClick={handleCreateUser}
                    className="gradient-primary text-primary-foreground"
                  >
                    Criar Usuário
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4: Complete */}
            {currentStep === 4 && (
              <div className="text-center space-y-6">
                <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto">
                  <Check className="w-10 h-10 text-success" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-foreground mb-2">Tudo pronto!</h1>
                  <p className="text-muted-foreground">
                    Sua unidade foi configurada com sucesso. Agora você pode acessar o painel 
                    administrativo e começar a gerenciar seus leads.
                  </p>
                </div>
                
                <div className="bg-secondary/50 rounded-lg p-4 text-left">
                  <h3 className="text-sm font-medium text-foreground mb-2">Próximos passos:</h3>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Acesse a unidade criada para configurar o funil de leads</li>
                    <li>• Configure os fluxos de chatbot para automação</li>
                    <li>• Adicione mais usuários conforme necessário</li>
                  </ul>
                </div>

                <div className="pt-4">
                  <Button 
                    onClick={handleFinish}
                    className="gradient-primary text-primary-foreground px-8"
                  >
                    Ir para o Dashboard
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}