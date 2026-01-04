import { useNavigate } from "react-router-dom";
import { useMultiTenantStore } from "@/store/multiTenantStore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogOut, Building2, ChevronRight } from "lucide-react";
import { PropulseLogo } from "@/components/brand/PropulseLogo";

const SelectUnit = () => {
    const navigate = useNavigate();
    const { currentUser, units, setCurrentUnit, logout } = useMultiTenantStore();

    if (!currentUser) return null;

    // Filter units based on user role
    const availableUnits = currentUser.role === 'super_admin'
        ? units
        : units.filter(u =>
            currentUser.unitIds?.includes(u.id) ||
            currentUser.unitId === u.id
        );

    const handleSelectUnit = (unit: any) => {
        const success = setCurrentUnit(unit.slug);
        if (success) {
            navigate(`/${unit.slug}/dashboard`);
        }
    };

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-2xl space-y-8">
                <div className="text-center space-y-2">
                    <div className="flex justify-center mb-6">
                        <PropulseLogo size="lg" />
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight">Selecione uma Unidade</h1>
                    <p className="text-muted-foreground">Você tem acesso a {availableUnits.length} unidade(s)</p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    {availableUnits.map(unit => (
                        <Card
                            key={unit.id}
                            className="bg-card/50 hover:bg-card hover:border-primary/50 transition-all cursor-pointer group"
                            onClick={() => handleSelectUnit(unit)}
                        >
                            <CardContent className="p-6 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20 group-hover:bg-primary/20 transition-colors">
                                        {unit.logo ? (
                                            <img src={unit.logo} alt={unit.name} className="w-8 h-8 object-contain" />
                                        ) : (
                                            <Building2 className="w-6 h-6 text-primary" />
                                        )}
                                    </div>
                                    <div className="text-left">
                                        <h3 className="font-semibold text-lg">{unit.name}</h3>
                                        <p className="text-xs text-muted-foreground">slug: {unit.slug}</p>
                                    </div>
                                </div>
                                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <div className="flex justify-center mt-8">
                    <Button variant="ghost" className="text-muted-foreground hover:text-destructive" onClick={logout}>
                        <LogOut className="w-4 h-4 mr-2" />
                        Sair e voltar ao login
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default SelectUnit;
