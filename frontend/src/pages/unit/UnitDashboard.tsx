import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Users,
  MessageSquare,
  TrendingUp,
  DollarSign,
  ArrowUpRight,
  Clock,
  Download,
  Calendar,
  Filter,
  Zap
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useMultiTenantStore } from '@/store/multiTenantStore';
import { exportLeadsToCSV, exportConversationsToCSV, exportAllUnitData } from '@/lib/exportUtils';
import { toast } from '@/hooks/use-toast';
import api from '@/lib/api';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6'];

export default function UnitDashboard() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { currentUnit, getUnitLeads, getUnitConversations, messages } = useMultiTenantStore();
  const [stats, setStats] = useState<any>(null);
  const [days, setDays] = useState(7);
  const [isLoading, setIsLoading] = useState(true);

  const leads = getUnitLeads();
  const conversations = getUnitConversations();

  useEffect(() => {
    const loadStats = async () => {
      if (!currentUnit) return;
      try {
        setIsLoading(true);
        const data = await api.getDashboardStats(currentUnit.id, days);
        setStats(data);
      } catch (error) {
        console.error('Error loading stats:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadStats();
  }, [currentUnit, days]);

  const handleExportAll = () => {
    const result = exportAllUnitData(leads, conversations, messages, currentUnit?.name || 'unidade');
    toast({ title: `Exportados ${result.leadsCount} leads e ${result.conversationsCount} conversas!` });
  };

  const kpiData = [
    {
      title: 'Total de Leads',
      value: stats?.leadStats?.total || leads.length,
      change: '+12%',
      icon: Users,
      color: 'bg-primary/10',
      textColor: 'text-primary',
      onClick: () => navigate(`/${slug}/funnel`),
    },
    {
      title: 'Vendas (Won)',
      value: stats?.leadStats?.won || leads.filter(l => l.stage === 'won').length,
      change: '+5%',
      icon: TrendingUp,
      color: 'bg-green-500/10',
      textColor: 'text-green-500',
      onClick: () => navigate(`/${slug}/funnel`),
    },
    {
      title: 'Canais Ativos',
      value: (stats?.channelStats?.whatsapp ? 1 : 0) + (stats?.channelStats?.instagram ? 1 : 0) + (stats?.channelStats?.web ? 1 : 0),
      change: 'WhatsApp OK',
      icon: MessageSquare,
      color: 'bg-accent/10',
      textColor: 'text-accent',
      onClick: () => navigate(`/${slug}/whatsapp`),
    },
    {
      title: 'Pipeline Est.',
      value: `R$ ${(leads.reduce((acc, l) => acc + (l.value || 0), 0) / 1000).toFixed(0)}k`,
      change: '+18%',
      icon: DollarSign,
      color: 'bg-primary/10',
      textColor: 'text-primary',
      onClick: () => navigate(`/${slug}/funnel`),
    },
  ];

  const pieData = [
    { name: 'Novo', value: stats?.leadStats?.new || 0 },
    { name: 'Negociação', value: stats?.leadStats?.negotiation || 0 },
    { name: 'Ganhos', value: stats?.leadStats?.won || 0 },
    { name: 'Perdidos', value: stats?.leadStats?.lost || 0 },
  ].filter(d => d.value > 0);

  return (
    <div className="p-6 lg:p-8 animate-in fade-in duration-500 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-1 tracking-tight">Estatísticas da Unidade</h1>
          <p className="text-muted-foreground flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Vendas e conversas de {currentUnit?.name}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-secondary p-1 rounded-lg border border-border">
            {[7, 30, 90].map(d => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${days === d ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {d} dias
              </button>
            ))}
          </div>
          <Button size="sm" onClick={handleExportAll} className="gradient-primary text-primary-foreground">
            <Download className="w-4 h-4 mr-2" />
            Relatório
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiData.map((stat) => (
          <Card key={stat.title} onClick={stat.onClick} className="group hover:border-primary/50 cursor-pointer transition-all hover:translate-y-[-2px] duration-300 shadow-sm hover:shadow-md border-border">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-xl ${stat.color}`}>
                  <stat.icon className={`w-6 h-6 ${stat.textColor}`} />
                </div>
                <Badge variant="outline" className="text-green-500 bg-green-500/5 border-green-500/10 text-[10px] font-bold">
                  {stat.change} <ArrowUpRight className="w-3 h-3 ml-1" />
                </Badge>
              </div>
              <div className="text-2xl font-bold text-foreground mb-1 group-hover:text-primary transition-colors">
                {isLoading ? '...' : stat.value}
              </div>
              <div className="text-sm font-medium text-muted-foreground">{stat.title}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Trend Chart */}
        <Card className="lg:col-span-2 border-border shadow-sm">
          <CardHeader>
            <CardTitle>Tendência de Movimentação</CardTitle>
            <CardDescription>Volume diário de mensagens e novos leads recebidos</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            {isLoading ? (
              <div className="w-full h-full bg-secondary/20 animate-pulse rounded-lg flex items-center justify-center">
                Processando dados...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats?.dailyData || []}>
                  <defs>
                    <linearGradient id="colorMsg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'rgb(30 30 40)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}
                    itemStyle={{ fontSize: '12px' }}
                  />
                  <Area type="monotone" dataKey="messages" stroke="var(--primary)" fillOpacity={1} fill="url(#colorMsg)" strokeWidth={3} name="Mensagens" />
                  <Area type="monotone" dataKey="leads" stroke="#f59e0b" fillOpacity={0} strokeWidth={2} name="Novos Leads" strokeDasharray="5 5" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Lead Distribution */}
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle>Composição do Funil</CardTitle>
            <CardDescription>Distribuição de leads por estágio</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px] flex items-center justify-center">
            {isLoading ? <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData.length > 0 ? pieData : [{ name: 'Sem dados', value: 1 }]}
                    cx="50%"
                    cy="45%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={8}
                    dataKey="value"
                  >
                    {pieData.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                    {!pieData.length && <Cell fill="#333" />}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: 'rgb(30 30 40)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}
                  />
                  <text x="50%" y="45%" textAnchor="middle" dominantBaseline="middle" className="fill-foreground font-bold text-xl">
                    {stats?.leadStats?.total || 0}
                  </text>
                  <text x="50%" y="54%" textAnchor="middle" dominantBaseline="middle" className="fill-muted-foreground text-[10px] uppercase font-bold tracking-widest">
                    Total
                  </text>
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
          <CardFooter className="flex flex-wrap gap-4 text-xs font-medium justify-center pb-8">
            {pieData.map((d, i) => (
              <div key={d.name} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                <span className="text-muted-foreground">{d.name} ({d.value})</span>
              </div>
            ))}
          </CardFooter>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Channel Performance */}
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle>Performance por Canal</CardTitle>
            <CardDescription>Origem dos leads e canais de contato mais usados</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { name: 'WhatsApp', value: stats?.channelStats?.whatsapp || 0 },
                { name: 'Direct/Web', value: stats?.channelStats?.web || 0 },
                { name: 'Telegram', value: 0 },
              ]}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} axisLine={false} tickLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                <Bar dataKey="value" fill="var(--primary)" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Quick Tips / AI Insights Placeholder */}
        <Card className="border-border shadow-sm gradient-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              Insights da IA
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-background/40 border border-primary/10 rounded-xl">
              <p className="text-sm font-medium mb-1">Taxa de Conversão 📈</p>
              <p className="text-xs text-muted-foreground">Sua taxa de conversão subiu 4% esta semana. O envio automático de boas-vindas está tendo um impacto positivo!</p>
            </div>
            <div className="p-4 bg-background/40 border border-primary/10 rounded-xl">
              <p className="text-sm font-medium mb-1">Horário de Pico ⏰</p>
              <p className="text-xs text-muted-foreground">O maior volume de mensagens ocorre entre 14:00 e 16:00. Considere ativar um bot específico para este horário.</p>
            </div>
            <Button variant="outline" className="w-full text-xs h-9">Ver mais insights</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Badge({ children, variant, className }: any) {
  return (
    <div className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${className}`}>
      {children}
    </div>
  );
}

function CardFooter({ children, className }: any) {
  return <div className={`flex items-center p-6 pt-0 ${className}`}>{children}</div>;
}