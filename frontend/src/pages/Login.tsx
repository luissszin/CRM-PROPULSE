import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Mail, Lock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMultiTenantStore } from '@/store/multiTenantStore';
import { toast } from '@/hooks/use-toast';
import propulseLogo from '@/assets/propulse-logo.png';

export default function Login() {
  const { slug } = useParams<{ slug?: string }>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login, units, setCurrentUnit } = useMultiTenantStore();

  const currentUnit = slug ? units.find(u => u.slug === slug) : null;
  const isSuperAdminLogin = !slug;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Removed artificial delay
    // await new Promise(resolve => setTimeout(resolve, 600));

    const result = await login(email, password, slug);

    if (result.success) {
      if (slug) {
        setCurrentUnit(slug);
      }
      toast({
        title: "Acesso realizado",
        description: "Bem-vindo ao PROPULSE.",
      });
      navigate(result.redirect);
    } else {
      toast({
        title: "Erro no login",
        description: "Email ou senha incorretos.",
        variant: "destructive",
      });
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a12] relative overflow-hidden">
      {/* Background gradient effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-gradient-to-br from-purple-900/5 via-transparent to-blue-900/5 rounded-full blur-3xl" />
      </div>

      {/* Subtle grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '50px 50px'
        }}
      />

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center relative z-10 px-4 py-8">
        <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">

          {/* Left side - Branding */}
          <div className="flex flex-col items-center lg:items-start text-center lg:text-left">
            {/* Logo */}
            <div
              className="mb-8 opacity-0 animate-fade-in"
              style={{ animationDelay: '0ms', animationFillMode: 'forwards' }}
            >
              <img
                src={propulseLogo}
                alt="Propulse"
                className="h-20 w-auto object-contain drop-shadow-2xl hover:scale-105 transition-transform duration-300"
              />
            </div>

            {/* Title */}
            <h1
              className="text-3xl lg:text-4xl font-semibold text-white mb-3 tracking-tight opacity-0 animate-fade-in"
              style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}
            >
              Acesse o sistema
            </h1>

            <p
              className="text-muted-foreground text-base mb-8 max-w-sm opacity-0 animate-fade-in"
              style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}
            >
              Gerencie seus leads e conversas em um só lugar
            </p>

            {/* Unit identifier */}
            {currentUnit && (
              <div
                className="inline-flex items-center gap-3 px-5 py-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm opacity-0 animate-fade-in hover:bg-white/10 transition-colors duration-300"
                style={{ animationDelay: '300ms', animationFillMode: 'forwards' }}
              >
                {currentUnit.logo && (
                  <img
                    src={currentUnit.logo}
                    alt={currentUnit.name}
                    className="h-8 w-auto object-contain"
                  />
                )}
                <div className="text-left">
                  <span className="text-xs text-muted-foreground block">Unidade</span>
                  <span className="text-sm font-medium text-white">{currentUnit.name}</span>
                </div>
              </div>
            )}

            {isSuperAdminLogin && (
              <div
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-accent/10 border border-accent/20 opacity-0 animate-fade-in hover:bg-accent/20 transition-colors duration-300"
                style={{ animationDelay: '300ms', animationFillMode: 'forwards' }}
              >
                <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                <span className="text-sm font-medium text-accent">Painel Administrativo</span>
              </div>
            )}
          </div>

          {/* Right side - Login card with glassmorphism */}
          <div
            className="w-full max-w-md mx-auto lg:mx-0 opacity-0 animate-scale-in"
            style={{ animationDelay: '150ms', animationFillMode: 'forwards' }}
          >
            <div className="relative">
              {/* Glow effect behind card */}
              <div className="absolute -inset-1 bg-gradient-to-r from-purple-600/20 via-blue-600/20 to-purple-600/20 rounded-2xl blur-xl opacity-50" />

              {/* Card */}
              <div className="relative bg-[#12121a]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
                {/* Card header */}
                <div
                  className="mb-8 opacity-0 animate-fade-in"
                  style={{ animationDelay: '300ms', animationFillMode: 'forwards' }}
                >
                  <h2 className="text-xl font-semibold text-white mb-1">Login</h2>
                  <p className="text-sm text-muted-foreground">Entre com suas credenciais</p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div
                    className="space-y-2 opacity-0 animate-fade-in"
                    style={{ animationDelay: '400ms', animationFillMode: 'forwards' }}
                  >
                    <Label htmlFor="email" className="text-sm text-muted-foreground font-medium">
                      E-Mail
                    </Label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60 group-focus-within:text-purple-400 transition-colors" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="seu@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-11 h-12 bg-white/5 border-white/10 text-white placeholder:text-muted-foreground/50 rounded-xl focus:border-purple-500/50 focus:ring-purple-500/20 transition-all"
                        required
                      />
                    </div>
                  </div>

                  <div
                    className="space-y-2 opacity-0 animate-fade-in"
                    style={{ animationDelay: '500ms', animationFillMode: 'forwards' }}
                  >
                    <Label htmlFor="password" className="text-sm text-muted-foreground font-medium">
                      Senha
                    </Label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60 group-focus-within:text-purple-400 transition-colors" />
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-11 h-12 bg-white/5 border-white/10 text-white placeholder:text-muted-foreground/50 rounded-xl focus:border-purple-500/50 focus:ring-purple-500/20 transition-all"
                        required
                      />
                    </div>
                  </div>

                  <div
                    className="opacity-0 animate-fade-in"
                    style={{ animationDelay: '600ms', animationFillMode: 'forwards' }}
                  >
                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="w-full h-12 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white font-medium rounded-xl shadow-lg shadow-purple-500/25 transition-all duration-300 hover:shadow-purple-500/40 hover:scale-[1.02] active:scale-[0.98]"
                    >
                      {isLoading ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          Entrar
                          <ArrowRight className="ml-2 w-4 h-4" />
                        </>
                      )}
                    </Button>
                  </div>
                </form>

                {/* Test credentials */}
                <div className="mt-6 pt-6 border-t border-white/5">
                  <p className="text-xs text-muted-foreground/60 mb-2">Credenciais de teste:</p>
                  <p className="text-xs font-mono text-muted-foreground/80">
                    {isSuperAdminLogin && 'admin@propulse.com / admin123'}
                    {currentUnit?.slug === 'cartao-de-todos-resende' && 'joao@resende.com / 123456'}
                    {currentUnit?.slug === 'cartao-de-todos-uberlandia' && 'maria@uberlandia.com / 123456'}
                    {currentUnit?.slug === 'empresa-x' && 'carlos@empresax.com / 123456'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 py-6 text-center">
        <p className="text-xs text-muted-foreground/40">
          © {new Date().getFullYear()} Propulse. Todos os direitos reservados.
        </p>
      </footer>
    </div>
  );
}
