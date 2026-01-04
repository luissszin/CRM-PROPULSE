import { useEffect } from 'react';
import { Building2, Users, TrendingUp, Activity, Rocket } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useMultiTenantStore } from '@/store/multiTenantStore';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { units, users, leads, conversations } = useMultiTenantStore();

  // Redirect to onboarding if no units exist
  useEffect(() => {
    if (units.length === 0) {
      navigate('/admin/onboarding', { replace: true });
    }
  }, [units.length, navigate]);

  // Dados reais baseados na data de criação dos leads
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    const dateStr = date.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' });
    
    // Contar leads e conversas criados neste dia
    const dayLeads = leads.filter(l => {
      const leadDate = new Date(l.createdAt);
      return leadDate.toDateString() === date.toDateString();
    }).length;
    
    const dayConversas = conversations.filter(c => {
      const convDate = new Date(c.updatedAt);
      return convDate.toDateString() === date.toDateString();
    }).length;
    
    return {
      date: dateStr,
      leads: dayLeads,
      conversas: dayConversas,
    };
  });

  const unitStats = units.map(unit => ({
    name: unit.name.length > 15 ? unit.name.substring(0, 15) + '...' : unit.name,
    leads: leads.filter(l => l.unitId === unit.id).length,
    usuarios: users.filter(u => u.unitId === unit.id).length,
  }));

  const totalLeads = leads.length;
  const totalConversations = conversations.length;
  const activeUnits = units.filter(u => u.active).length;
  const totalUsers = users.filter(u => u.role !== 'super_admin').length;

  return (
    <div className="p-6 lg:p-8 animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground mb-1">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Visão geral do sistema PROPULSE</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card 
          className="p-5 bg-card border-border hover:border-accent/50 transition-colors cursor-pointer"
          onClick={() => navigate('/admin/units')}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Unidades Ativas</p>
              <p className="text-2xl font-bold text-foreground">{activeUnits}</p>
              <p className="text-xs text-muted-foreground mt-1">de {units.length} total</p>
            </div>
            <div className="p-2.5 rounded-lg bg-accent/10">
              <Building2 className="w-5 h-5 text-accent" />
            </div>
          </div>
        </Card>

        <Card 
          className="p-5 bg-card border-border hover:border-primary/50 transition-colors cursor-pointer"
          onClick={() => navigate('/admin/users')}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Usuários</p>
              <p className="text-2xl font-bold text-foreground">{totalUsers}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-primary/10">
              <Users className="w-5 h-5 text-primary" />
            </div>
          </div>
        </Card>

        <Card className="p-5 bg-card border-border">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Total de Leads</p>
              <p className="text-2xl font-bold text-foreground">{totalLeads}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-success/10">
              <TrendingUp className="w-5 h-5 text-success" />
            </div>
          </div>
        </Card>

        <Card className="p-5 bg-card border-border">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Conversas</p>
              <p className="text-2xl font-bold text-foreground">{totalConversations}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-info/10">
              <Activity className="w-5 h-5 text-info" />
            </div>
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card className="p-5 bg-card border-border">
          <h3 className="text-sm font-semibold text-foreground mb-4">Leads & Conversas - Últimos 7 dias</h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={last7Days}>
                <defs>
                  <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorConversas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }} 
                />
                <Area type="monotone" dataKey="leads" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorLeads)" />
                <Area type="monotone" dataKey="conversas" stroke="hsl(var(--accent))" fillOpacity={1} fill="url(#colorConversas)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5 bg-card border-border">
          <h3 className="text-sm font-semibold text-foreground mb-4">Leads por Unidade</h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={unitStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }} 
                />
                <Bar dataKey="leads" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="p-5 bg-card border-border">
        <h3 className="text-sm font-semibold text-foreground mb-4">Atividade Recente</h3>
        {units.length > 0 ? (
          <div className="space-y-3">
            {units.slice(0, 5).map((unit) => {
              const unitLeads = leads.filter(l => l.unitId === unit.id).length;
              return (
                <div key={unit.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${unit.active ? 'bg-success' : 'bg-muted-foreground'}`} />
                    <div>
                      <p className="text-sm font-medium text-foreground">{unit.name}</p>
                      <p className="text-xs text-muted-foreground">{unitLeads} leads • {users.filter(u => u.unitId === unit.id).length} usuários</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => navigate(`/${unit.slug}/dashboard`)}
                    className="text-xs text-primary hover:underline"
                  >
                    Ver detalhes
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <Rocket className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-4">Nenhuma unidade cadastrada ainda</p>
            <Button onClick={() => navigate('/admin/onboarding')} className="gradient-primary text-primary-foreground">
              Iniciar Configuração
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
