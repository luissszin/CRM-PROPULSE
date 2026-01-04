import { useNavigate } from 'react-router-dom';
import { Building2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useMultiTenantStore } from '@/store/multiTenantStore';
import { PropulseLogo } from '@/components/brand/PropulseLogo';

export default function Home() {
  const navigate = useNavigate();
  const { units } = useMultiTenantStore();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <PropulseLogo size="sm" />
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/login')}
          >
            Admin
          </Button>
        </div>
      </header>

      {/* Hero */}
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-16">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            CRM Multi-Unidade
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Gerencie múltiplas unidades, equipes de vendas e conversas em um só lugar.
          </p>
        </div>

        {/* Units Grid */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-6">Selecione uma unidade</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {units.map((unit) => (
              <Card
                key={unit.id}
                onClick={() => navigate(`/${unit.slug}/login`)}
                className="p-5 bg-card border-border hover:border-primary/50 transition-all duration-200 cursor-pointer group"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-foreground group-hover:text-primary transition-colors mb-0.5 truncate">
                      {unit.name}
                    </h3>
                    <p className="text-xs text-muted-foreground font-mono">/{unit.slug}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all mt-1" />
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}