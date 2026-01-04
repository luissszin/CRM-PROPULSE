import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Mail, Lock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMultiTenantStore } from '@/store/multiTenantStore';
import { toast } from '@/hooks/use-toast';
import propulseLogo from '@/assets/propulse-logo.png';
import api from '@/lib/api';

export default function UnitLogin() {
    const { slug } = useParams<{ slug: string }>();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [unitName, setUnitName] = useState('');
    const [unitLogo, setUnitLogo] = useState('');
    const [unitFound, setUnitFound] = useState(true);

    const navigate = useNavigate();
    const { login, setCurrentUnit } = useMultiTenantStore();

    // Fetch unit details on mount to validate slug and show branding
    useEffect(() => {
        async function fetchUnit() {
            if (!slug) return;
            try {
                const units = await api.getUnits();
                const unit = units.find((u: any) => u.slug === slug);
                if (unit) {
                    setUnitName(unit.name);
                    setUnitLogo(unit.logo || '');
                } else {
                    setUnitFound(false);
                    toast({
                        title: "Unidade não encontrada",
                        description: "Verifique o endereço digitado.",
                        variant: "destructive"
                    });
                }
            } catch (error) {
                console.error("Error fetching unit:", error);
            }
        }
        fetchUnit();
    }, [slug]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!unitFound) return;

        setIsLoading(true);

        // Artificial delay for UX
        await new Promise(resolve => setTimeout(resolve, 600));

        // Call login with unitSlug
        const result = await login(email, password, slug);

        if (result.success) {
            if (slug) {
                setCurrentUnit(slug);
            }
            toast({
                title: "Acesso realizado",
                description: `Bem-vindo à unidade ${unitName || slug}.`,
            });
            navigate(result.redirect);
        } else {
            toast({
                title: "Erro no login",
                description: "Email ou senha incorretos, ou você não tem permissão nesta unidade.",
                variant: "destructive",
            });
        }
        setIsLoading(false);
    };

    if (!unitFound) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0a0a12] text-white">
                <div className="text-center">
                    <h1 className="text-4xl font-bold text-red-500 mb-4">404</h1>
                    <p className="text-xl">Unidade não encontrada.</p>
                    <Button onClick={() => navigate('/login')} className="mt-6" variant="outline">
                        Ir para Login Geral
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex flex-col bg-[#0a0a12] relative overflow-hidden">
            {/* Background gradient effects */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-1/4 -left-32 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-gradient-to-br from-purple-900/5 via-transparent to-blue-900/5 rounded-full blur-3xl" />
            </div>

            {/* Main content */}
            <div className="flex-1 flex items-center justify-center relative z-10 px-4 py-8">
                <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">

                    {/* Left side - Branding */}
                    <div className="flex flex-col items-center lg:items-start text-center lg:text-left">
                        <div className="mb-8">
                            <img
                                src={propulseLogo}
                                alt="Propulse"
                                className="h-16 w-auto object-contain opacity-80 mb-6"
                            />
                        </div>

                        <div className="inline-flex items-center gap-3 px-5 py-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm mb-6">
                            {unitLogo ? (
                                <img src={unitLogo} alt={unitName} className="h-12 w-auto object-contain" />
                            ) : (
                                <div className="h-10 w-10 bg-purple-600/20 rounded-lg flex items-center justify-center text-purple-400 font-bold text-xl">
                                    {unitName ? unitName.substring(0, 1).toUpperCase() : slug?.substring(0, 1).toUpperCase()}
                                </div>
                            )}
                            <div className="text-left">
                                <span className="text-xs text-muted-foreground block">Acesso à Unidade</span>
                                <span className="text-xl font-bold text-white">{unitName || slug}</span>
                            </div>
                        </div>

                        <h1 className="text-3xl lg:text-4xl font-semibold text-white mb-3 tracking-tight">
                            Bem-vindo de volta
                        </h1>
                    </div>

                    {/* Right side - Login card */}
                    <div className="w-full max-w-md mx-auto lg:mx-0">
                        <div className="relative bg-[#12121a]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
                            <div className="mb-8">
                                <h2 className="text-xl font-semibold text-white mb-1">Login</h2>
                                <p className="text-sm text-muted-foreground">Entre com suas credenciais da unidade</p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div className="space-y-2">
                                    <Label htmlFor="email" className="text-sm text-muted-foreground font-medium">E-Mail</Label>
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

                                <div className="space-y-2">
                                    <Label htmlFor="password" className="text-sm text-muted-foreground font-medium">Senha</Label>
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

                                <Button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full h-12 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white font-medium rounded-xl shadow-lg shadow-purple-500/25 transition-all duration-300 transform hover:scale-[1.02]"
                                >
                                    {isLoading ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            Acessar Unidade
                                            <ArrowRight className="ml-2 w-4 h-4" />
                                        </>
                                    )}
                                </Button>
                            </form>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
