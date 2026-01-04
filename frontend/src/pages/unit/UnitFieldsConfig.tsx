import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Plus, Trash2, GripVertical, Save, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useMultiTenantStore, LeadCustomField } from '@/store/multiTenantStore';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function UnitFieldsConfig() {
  const { slug } = useParams<{ slug: string }>();
  const { currentUnit, getUnitCustomFields, addCustomField, updateCustomField, deleteCustomField, reorderCustomFields } = useMultiTenantStore();
  
  const customFields = getUnitCustomFields();
  
  const [showNewField, setShowNewField] = useState(false);
  const [newField, setNewField] = useState<Partial<LeadCustomField>>({
    name: '',
    type: 'text',
    required: false,
    options: [],
  });
  const [optionInput, setOptionInput] = useState('');

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination || !currentUnit) return;
    
    const items = Array.from(customFields);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    const newOrder = items.map(item => item.id);
    reorderCustomFields(currentUnit.id, newOrder);
    toast({ title: "Ordem atualizada!" });
  };

  const handleAddField = () => {
    if (!newField.name || !newField.type) {
      toast({ title: "Preencha nome e tipo", variant: "destructive" });
      return;
    }
    
    if (currentUnit) {
      addCustomField(currentUnit.id, {
        name: newField.name,
        type: newField.type as LeadCustomField['type'],
        required: newField.required || false,
        options: newField.options,
      });
      setNewField({ name: '', type: 'text', required: false, options: [] });
      setShowNewField(false);
      toast({ title: "Campo adicionado!" });
    }
  };

  const handleAddOption = () => {
    if (optionInput.trim()) {
      setNewField(prev => ({
        ...prev,
        options: [...(prev.options || []), optionInput.trim()],
      }));
      setOptionInput('');
    }
  };

  const handleRemoveOption = (index: number) => {
    setNewField(prev => ({
      ...prev,
      options: prev.options?.filter((_, i) => i !== index),
    }));
  };

  const handleDeleteField = (fieldId: string) => {
    if (currentUnit) {
      deleteCustomField(currentUnit.id, fieldId);
      toast({ title: "Campo removido!" });
    }
  };

  const handleUpdateField = (fieldId: string, updates: Partial<LeadCustomField>) => {
    if (currentUnit) {
      updateCustomField(currentUnit.id, fieldId, updates);
    }
  };

  const fieldTypeLabels: Record<string, string> = {
    text: 'Texto',
    number: 'Número',
    select: 'Seleção',
    checkbox: 'Checkbox',
    date: 'Data',
  };

  return (
    <div className="p-6 animate-fade-in">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Configuração de Campos</h1>
            <p className="text-muted-foreground">
              Arraste e solte para reordenar os campos personalizados
            </p>
          </div>
          <Button onClick={() => setShowNewField(true)} className="gradient-primary text-primary-foreground">
            <Plus className="w-4 h-4 mr-2" />
            Novo Campo
          </Button>
        </div>

        {/* Current Fields with Drag and Drop */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="p-4 border-b border-border bg-secondary/30">
            <h2 className="font-semibold text-foreground">Campos Ativos ({customFields.length})</h2>
          </div>
          
          {customFields.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <p>Nenhum campo configurado ainda</p>
              <p className="text-sm">Clique em "Novo Campo" para adicionar</p>
            </div>
          ) : (
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="fields">
                {(provided, snapshot) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className={cn(
                      "divide-y divide-border transition-colors",
                      snapshot.isDraggingOver && "bg-primary/5"
                    )}
                  >
                    {customFields.map((field, index) => (
                      <Draggable key={field.id} draggableId={field.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={cn(
                              "p-4 flex items-center gap-4 bg-card transition-all",
                              snapshot.isDragging && "shadow-lg ring-2 ring-primary/30 rounded-lg z-50",
                              !snapshot.isDragging && "hover:bg-secondary/20"
                            )}
                          >
                            <div
                              {...provided.dragHandleProps}
                              className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-secondary"
                            >
                              <GripVertical className="w-5 h-5 text-muted-foreground" />
                            </div>
                            
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-foreground">{field.name}</span>
                                <Badge variant="secondary" className="text-xs">{fieldTypeLabels[field.type]}</Badge>
                                {field.required && <Badge variant="outline" className="text-xs text-accent">Obrigatório</Badge>}
                              </div>
                              {field.type === 'select' && field.options && (
                                <div className="flex gap-1 mt-1 flex-wrap">
                                  {field.options.map((opt, i) => (
                                    <Badge key={i} variant="outline" className="text-xs">{opt}</Badge>
                                  ))}
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">Obrigatório</span>
                                <Switch
                                  checked={field.required}
                                  onCheckedChange={(checked) => handleUpdateField(field.id, { required: checked })}
                                />
                              </div>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleDeleteField(field.id)}
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          )}
        </div>

        {/* Hint */}
        <p className="text-sm text-muted-foreground mt-4 text-center">
          💡 Dica: Arraste os campos para definir a ordem em que aparecem no perfil do lead
        </p>

        {/* New Field Modal */}
        {showNewField && (
          <>
            <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40" onClick={() => setShowNewField(false)} />
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-card border border-border rounded-xl z-50 animate-fade-in">
              <div className="flex items-center justify-between p-6 border-b border-border">
                <h2 className="text-xl font-bold text-foreground">Novo Campo</h2>
                <Button variant="ghost" size="icon" onClick={() => setShowNewField(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="space-y-2">
                  <Label>Nome do campo *</Label>
                  <Input
                    placeholder="Ex: Quantidade de vendas"
                    value={newField.name || ''}
                    onChange={(e) => setNewField({ ...newField, name: e.target.value })}
                    className="bg-secondary border-border"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Tipo *</Label>
                  <Select value={newField.type} onValueChange={(v) => setNewField({ ...newField, type: v as LeadCustomField['type'] })}>
                    <SelectTrigger className="bg-secondary border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Texto</SelectItem>
                      <SelectItem value="number">Número</SelectItem>
                      <SelectItem value="select">Seleção (dropdown)</SelectItem>
                      <SelectItem value="checkbox">Checkbox (sim/não)</SelectItem>
                      <SelectItem value="date">Data</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {newField.type === 'select' && (
                  <div className="space-y-2">
                    <Label>Opções</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Digite uma opção"
                        value={optionInput}
                        onChange={(e) => setOptionInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddOption())}
                        className="bg-secondary border-border"
                      />
                      <Button variant="outline" onClick={handleAddOption} type="button">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {newField.options?.map((opt, i) => (
                        <Badge key={i} variant="secondary" className="flex items-center gap-1">
                          {opt}
                          <X className="w-3 h-3 cursor-pointer" onClick={() => handleRemoveOption(i)} />
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Switch
                    checked={newField.required || false}
                    onCheckedChange={(checked) => setNewField({ ...newField, required: checked })}
                  />
                  <Label>Campo obrigatório</Label>
                </div>
              </div>

              <div className="flex gap-3 p-6 border-t border-border">
                <Button variant="outline" onClick={() => setShowNewField(false)} className="flex-1">
                  Cancelar
                </Button>
                <Button onClick={handleAddField} className="flex-1 gradient-primary text-primary-foreground">
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Campo
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}