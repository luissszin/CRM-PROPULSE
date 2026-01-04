import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Plus, DollarSign, MessageSquare, MoreVertical, Trash2, Edit2, X, Save } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useMultiTenantStore, Lead } from '@/store/multiTenantStore';
import { LeadDrawer } from '@/components/leads/LeadDrawerMulti';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const stages = [
  { id: 'new', label: 'Novo', color: 'bg-info' },
  { id: 'contact', label: 'Em Contato', color: 'bg-primary' },
  { id: 'negotiation', label: 'Negociação', color: 'bg-warning' },
  { id: 'won', label: 'Ganhou', color: 'bg-success' },
  { id: 'lost', label: 'Perdeu', color: 'bg-destructive' },
] as const;

export default function UnitFunnel() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { getUnitLeads, moveLead, selectedLead, setSelectedLead, createLead, deleteLead, currentUnit } = useMultiTenantStore();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showNewLeadModal, setShowNewLeadModal] = useState(false);
  const [newLead, setNewLead] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    value: 0,
    stage: 'new' as Lead['stage'],
    tags: [] as string[],
  });
  const [newTag, setNewTag] = useState('');

  const leads = getUnitLeads();

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const leadId = result.draggableId;
    const newStage = result.destination.droppableId as Lead['stage'];
    moveLead(leadId, newStage);
    toast({ title: "Lead movido", description: `Lead movido para ${stages.find(s => s.id === newStage)?.label}` });
  };

  const handleCardClick = (lead: Lead) => {
    setSelectedLead(lead);
    setDrawerOpen(true);
  };

  const handleDeleteLead = (leadId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteLead(leadId);
    toast({ title: "Lead removido" });
  };

  const handleCreateLead = () => {
    if (!newLead.name || !newLead.email) {
      toast({ title: "Preencha nome e email", variant: "destructive" });
      return;
    }

    createLead({
      ...newLead,
      unitId: currentUnit?.id || '',
    });

    setNewLead({
      name: '',
      email: '',
      phone: '',
      company: '',
      value: 0,
      stage: 'new',
      tags: [],
    });
    setShowNewLeadModal(false);
    toast({ title: "Lead criado com sucesso!" });
  };

  const handleAddTag = () => {
    if (newTag.trim()) {
      setNewLead({ ...newLead, tags: [...newLead.tags, newTag.trim()] });
      setNewTag('');
    }
  };

  const getLeadsByStage = (stage: Lead['stage']) => leads.filter(lead => lead.stage === stage);
  const getStageValue = (stage: Lead['stage']) => leads.filter(lead => lead.stage === stage).reduce((acc, lead) => acc + lead.value, 0);

  return (
    <div className="h-screen flex flex-col p-6 lg:p-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Funil de Vendas</h1>
          <p className="text-muted-foreground">Arraste os cards para mover leads entre etapas</p>
        </div>
        <Button onClick={() => setShowNewLeadModal(true)} className="gradient-primary text-primary-foreground">
          <Plus className="w-4 h-4 mr-2" />
          Novo Lead
        </Button>
      </div>

      {/* Kanban Board */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex-1 flex gap-4 overflow-x-auto pb-4">
          {stages.map((stage) => (
            <div key={stage.id} className="flex-shrink-0 w-80">
              {/* Column Header */}
              <div className="flex items-center justify-between mb-4 px-2">
                <div className="flex items-center gap-2">
                  <div className={cn("w-3 h-3 rounded-full", stage.color)} />
                  <h3 className="font-semibold text-foreground">{stage.label}</h3>
                  <Badge variant="secondary" className="ml-1">{getLeadsByStage(stage.id).length}</Badge>
                </div>
                <div className="text-sm text-muted-foreground">R$ {(getStageValue(stage.id) / 1000).toFixed(0)}k</div>
              </div>

              {/* Column Content */}
              <Droppable droppableId={stage.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      "space-y-3 min-h-[calc(100vh-280px)] p-2 rounded-xl transition-colors",
                      snapshot.isDraggingOver ? "bg-primary/5 border-2 border-dashed border-primary/30" : "bg-secondary/30"
                    )}
                  >
                    {getLeadsByStage(stage.id).map((lead, index) => (
                      <Draggable key={lead.id} draggableId={lead.id} index={index}>
                        {(provided, snapshot) => (
                          <Card
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            onClick={() => handleCardClick(lead)}
                            className={cn(
                              "p-4 bg-card border-border cursor-pointer transition-all duration-200",
                              snapshot.isDragging ? "shadow-lg ring-2 ring-primary" : "hover:border-primary/50"
                            )}
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <img src={lead.avatar} alt={lead.name} className="w-10 h-10 rounded-full border border-border" />
                                <div>
                                  <p className="font-medium text-foreground">{lead.name}</p>
                                  <p className="text-sm text-muted-foreground">{lead.company}</p>
                                </div>
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={(e) => e.stopPropagation()}>
                                    <MoreVertical className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleCardClick(lead); }}>
                                    <Edit2 className="w-4 h-4 mr-2" />
                                    Editar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={(e) => handleDeleteLead(lead.id, e)}
                                    className="text-destructive focus:text-destructive"
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Excluir
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>

                            <div className="flex items-center gap-2 mb-3">
                              {lead.tags.slice(0, 2).map((tag) => (
                                <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                              ))}
                            </div>

                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1 text-primary font-medium">
                                <DollarSign className="w-4 h-4" />
                                R$ {(lead.value / 1000).toFixed(0)}k
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-muted-foreground hover:text-primary"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/${slug}/inbox`);
                                }}
                              >
                                <MessageSquare className="w-4 h-4 mr-1" />
                                Chat
                              </Button>
                            </div>
                          </Card>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>

      {/* Lead Drawer */}
      <LeadDrawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setSelectedLead(null);
        }}
        lead={selectedLead}
        slug={slug!}
      />

      {/* New Lead Modal */}
      {showNewLeadModal && (
        <>
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40" onClick={() => setShowNewLeadModal(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-card border border-border rounded-xl z-50 animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-xl font-bold text-foreground">Novo Lead</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowNewLeadModal(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input
                  placeholder="Nome completo"
                  value={newLead.name}
                  onChange={(e) => setNewLead({ ...newLead, name: e.target.value })}
                  className="bg-secondary border-border"
                />
              </div>
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input
                  type="email"
                  placeholder="email@exemplo.com"
                  value={newLead.email}
                  onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
                  className="bg-secondary border-border"
                />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input
                  placeholder="+55 11 99999-0000"
                  value={newLead.phone}
                  onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })}
                  className="bg-secondary border-border"
                />
              </div>
              <div className="space-y-2">
                <Label>Empresa</Label>
                <Input
                  placeholder="Nome da empresa"
                  value={newLead.company}
                  onChange={(e) => setNewLead({ ...newLead, company: e.target.value })}
                  className="bg-secondary border-border"
                />
              </div>
              <div className="space-y-2">
                <Label>Valor do Negócio</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={newLead.value}
                  onChange={(e) => setNewLead({ ...newLead, value: Number(e.target.value) })}
                  className="bg-secondary border-border"
                />
              </div>
              <div className="space-y-2">
                <Label>Tags</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {newLead.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="cursor-pointer" onClick={() => setNewLead({ ...newLead, tags: newLead.tags.filter(t => t !== tag) })}>
                      {tag} ×
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Nova tag..."
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                    className="bg-secondary border-border"
                  />
                  <Button variant="outline" onClick={handleAddTag}>Adicionar</Button>
                </div>
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t border-border">
              <Button variant="outline" onClick={() => setShowNewLeadModal(false)} className="flex-1">
                Cancelar
              </Button>
              <Button onClick={handleCreateLead} className="flex-1 gradient-primary text-primary-foreground">
                <Save className="w-4 h-4 mr-2" />
                Criar Lead
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}