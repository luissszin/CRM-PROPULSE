import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  MessageSquare, 
  TrendingUp, 
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Clock
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useCRMStore } from '@/store/crmStore';

export default function Dashboard() {
  const navigate = useNavigate();
  const { leads, conversations, automations } = useCRMStore();

  const totalLeads = leads.length;
  const activeConversations = conversations.filter(c => c.unread > 0).length;
  const wonDeals = leads.filter(l => l.stage === 'won').length;
  const totalValue = leads.filter(l => l.stage === 'won').reduce((acc, l) => acc + l.value, 0);
  const pipelineValue = leads.filter(l => l.stage !== 'lost' && l.stage !== 'won').reduce((acc, l) => acc + l.value, 0);

  const stats = [
    {
      title: 'Total de Leads',
      value: totalLeads,
      change: '+12%',
      trend: 'up',
      icon: Users,
      color: 'primary',
      onClick: () => navigate('/funnel'),
    },
    {
      title: 'Conversas Ativas',
      value: activeConversations,
      change: '+5',
      trend: 'up',
      icon: MessageSquare,
      color: 'accent',
      onClick: () => navigate('/inbox'),
    },
    {
      title: 'Negócios Fechados',
      value: wonDeals,
      change: '+2',
      trend: 'up',
      icon: TrendingUp,
      color: 'primary',
      onClick: () => navigate('/funnel'),
    },
    {
      title: 'Receita Gerada',
      value: `R$ ${(totalValue / 1000).toFixed(0)}k`,
      change: '+18%',
      trend: 'up',
      icon: DollarSign,
      color: 'accent',
      onClick: () => navigate('/funnel'),
    },
  ];

  const recentLeads = leads.slice(0, 5);
  const recentConversations = conversations.slice(0, 5);

  return (
    <div className="p-6 lg:p-8 animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard</h1>
        <p className="text-muted-foreground">
          Visão geral do seu pipeline de vendas
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <Card
            key={stat.title}
            onClick={stat.onClick}
            className="p-6 bg-card border-border hover:border-primary/50 transition-all duration-300 cursor-pointer group hover:glow-primary"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`p-3 rounded-xl ${stat.color === 'primary' ? 'bg-primary/10' : 'bg-accent/10'}`}>
                <stat.icon className={`w-6 h-6 ${stat.color === 'primary' ? 'text-primary' : 'text-accent'}`} />
              </div>
              <div className={`flex items-center gap-1 text-sm font-medium ${stat.trend === 'up' ? 'text-primary' : 'text-destructive'}`}>
                {stat.change}
                {stat.trend === 'up' ? (
                  <ArrowUpRight className="w-4 h-4" />
                ) : (
                  <ArrowDownRight className="w-4 h-4" />
                )}
              </div>
            </div>
            <div className="text-2xl font-bold text-foreground mb-1 group-hover:text-primary transition-colors">
              {stat.value}
            </div>
            <div className="text-sm text-muted-foreground">{stat.title}</div>
          </Card>
        ))}
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <Card className="p-6 bg-card border-border">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-primary/10">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground">Pipeline Total</h3>
          </div>
          <div className="text-3xl font-bold text-primary mb-2">
            R$ {(pipelineValue / 1000).toFixed(0)}k
          </div>
          <p className="text-sm text-muted-foreground">
            Valor total em negociação
          </p>
        </Card>

        <Card className="p-6 bg-card border-border">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-accent/10">
              <Zap className="w-5 h-5 text-accent" />
            </div>
            <h3 className="font-semibold text-foreground">Automações Ativas</h3>
          </div>
          <div className="text-3xl font-bold text-accent mb-2">
            {automations.filter(a => a.active).length}
          </div>
          <p className="text-sm text-muted-foreground">
            de {automations.length} automações configuradas
          </p>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Leads */}
        <Card className="p-6 bg-card border-border">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-foreground">Leads Recentes</h3>
            <button 
              onClick={() => navigate('/funnel')}
              className="text-sm text-primary hover:underline"
            >
              Ver todos
            </button>
          </div>
          <div className="space-y-4">
            {recentLeads.map((lead) => (
              <div
                key={lead.id}
                onClick={() => navigate('/funnel')}
                className="flex items-center gap-4 p-3 rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer"
              >
                <img
                  src={lead.avatar}
                  alt={lead.name}
                  className="w-10 h-10 rounded-full border border-border"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{lead.name}</p>
                  <p className="text-sm text-muted-foreground truncate">{lead.company}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-primary">R$ {(lead.value / 1000).toFixed(0)}k</p>
                  <p className="text-xs text-muted-foreground capitalize">{lead.stage === 'new' ? 'Novo' : lead.stage === 'contact' ? 'Contato' : lead.stage === 'negotiation' ? 'Negociação' : lead.stage === 'won' ? 'Ganhou' : 'Perdeu'}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Recent Conversations */}
        <Card className="p-6 bg-card border-border">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-foreground">Conversas Recentes</h3>
            <button 
              onClick={() => navigate('/inbox')}
              className="text-sm text-primary hover:underline"
            >
              Ver todas
            </button>
          </div>
          <div className="space-y-4">
            {recentConversations.map((conv) => {
              const lead = leads.find(l => l.id === conv.leadId);
              if (!lead) return null;
              return (
                <div
                  key={conv.id}
                  onClick={() => navigate('/inbox')}
                  className="flex items-center gap-4 p-3 rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer"
                >
                  <div className="relative">
                    <img
                      src={lead.avatar}
                      alt={lead.name}
                      className="w-10 h-10 rounded-full border border-border"
                    />
                    {conv.unread > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-accent text-accent-foreground text-xs font-bold rounded-full flex items-center justify-center">
                        {conv.unread}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{lead.name}</p>
                    <p className="text-sm text-muted-foreground truncate">{conv.lastMessage}</p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {new Date(conv.updatedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
