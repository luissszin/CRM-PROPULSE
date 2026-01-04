import { useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Plus, DollarSign, MessageSquare, MoreVertical } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCRMStore, Lead } from '@/store/crmStore';
import { LeadDrawer } from '@/components/leads/LeadDrawer';
import { cn } from '@/lib/utils';

const stages = [
  { id: 'new', label: 'Novo', color: 'bg-info' },
  { id: 'contact', label: 'Em Contato', color: 'bg-primary' },
  { id: 'negotiation', label: 'Negociação', color: 'bg-warning' },
  { id: 'won', label: 'Ganhou', color: 'bg-success' },
  { id: 'lost', label: 'Perdeu', color: 'bg-destructive' },
] as const;

export default function Funnel() {
  const { leads, moveLead, selectedLead, setSelectedLead } = useCRMStore();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    
    const leadId = result.draggableId;
    const newStage = result.destination.droppableId as Lead['stage'];
    
    moveLead(leadId, newStage);
  };

  const handleCardClick = (lead: Lead) => {
    setSelectedLead(lead);
    setDrawerOpen(true);
  };

  const getLeadsByStage = (stage: Lead['stage']) => {
    return leads.filter(lead => lead.stage === stage);
  };

  const getStageValue = (stage: Lead['stage']) => {
    return leads
      .filter(lead => lead.stage === stage)
      .reduce((acc, lead) => acc + lead.value, 0);
  };

  return (
    <div className="h-screen flex flex-col p-6 lg:p-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Funil de Vendas</h1>
          <p className="text-muted-foreground">
            Arraste os cards para mover leads entre etapas
          </p>
        </div>
        <Button className="gradient-primary text-primary-foreground">
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
                  <Badge variant="secondary" className="ml-1">
                    {getLeadsByStage(stage.id).length}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  R$ {(getStageValue(stage.id) / 1000).toFixed(0)}k
                </div>
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
                                <img
                                  src={lead.avatar}
                                  alt={lead.name}
                                  className="w-10 h-10 rounded-full border border-border"
                                />
                                <div>
                                  <p className="font-medium text-foreground">{lead.name}</p>
                                  <p className="text-sm text-muted-foreground">{lead.company}</p>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </div>

                            <div className="flex items-center gap-2 mb-3">
                              {lead.tags.slice(0, 2).map((tag) => (
                                <Badge key={tag} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
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
                                  handleCardClick(lead);
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
      />
    </div>
  );
}
