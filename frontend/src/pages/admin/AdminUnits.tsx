import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Plus, Trash2, Edit2, ExternalLink, X, Check, ToggleLeft, ToggleRight, Upload, Image, Copy } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useMultiTenantStore } from '@/store/multiTenantStore';
import { toast } from '@/hooks/use-toast';

export default function AdminUnits() {
  const navigate = useNavigate();
  const { units, users, leads, createUnit, updateUnit, deleteUnit } = useMultiTenantStore();
  const [showUnitModal, setShowUnitModal] = useState(false);
  const [editingUnit, setEditingUnit] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  const [newUnit, setNewUnit] = useState({ name: '', slug: '', active: true, logo: '' });
  const [editUnit, setEditUnit] = useState({ name: '', slug: '', active: true, logo: '' });

  const handleCreateUnit = () => {
    if (!newUnit.name || !newUnit.slug) {
      toast({ title: "Preencha todos os campos", variant: "destructive" });
      return;
    }

    const slugExists = units.some(u => u.slug === newUnit.slug);
    if (slugExists) {
      toast({ title: "Este slug já existe", variant: "destructive" });
      return;
    }

    createUnit({ ...newUnit, customFields: [] });
    setNewUnit({ name: '', slug: '', active: true, logo: '' });
    setShowUnitModal(false);
    toast({ title: "Unidade criada com sucesso!" });
  };

  const handleEditUnit = (unitId: string) => {
    const unit = units.find(u => u.id === unitId);
    if (unit) {
      setEditUnit({ name: unit.name, slug: unit.slug, active: unit.active, logo: unit.logo || '' });
      setEditingUnit(unitId);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>, isEdit: boolean = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: "Por favor, selecione uma imagem", variant: "destructive" });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (isEdit) {
        setEditUnit({ ...editUnit, logo: base64 });
      } else {
        setNewUnit({ ...newUnit, logo: base64 });
      }
      toast({ title: "Logo carregada com sucesso!" });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = (isEdit: boolean = false) => {
    if (isEdit) {
      setEditUnit({ ...editUnit, logo: '' });
    } else {
      setNewUnit({ ...newUnit, logo: '' });
    }
  };

  const handleSaveEdit = () => {
    if (!editingUnit) return;

    if (!editUnit.name || !editUnit.slug) {
      toast({ title: "Preencha todos os campos", variant: "destructive" });
      return;
    }

    const slugExists = units.some(u => u.slug === editUnit.slug && u.id !== editingUnit);
    if (slugExists) {
      toast({ title: "Este slug já existe", variant: "destructive" });
      return;
    }

    updateUnit(editingUnit, editUnit);
    setEditingUnit(null);
    toast({ title: "Unidade atualizada!" });
  };

  const handleToggleActive = (unitId: string, currentActive: boolean) => {
    updateUnit(unitId, { active: !currentActive });
    toast({ title: currentActive ? "Unidade desativada" : "Unidade ativada" });
  };

  const handleDeleteUnit = (id: string) => {
    deleteUnit(id);
    toast({ title: "Unidade removida" });
  };

  const copyLink = (slug: string) => {
    const url = `${window.location.origin}/${slug}/login`;
    navigator.clipboard.writeText(url);
    toast({ title: "Link copiado!", description: url });
  };

  return (
    <div className="p-6 lg:p-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-1">Unidades</h1>
          <p className="text-sm text-muted-foreground">Gerencie as unidades do sistema</p>
        </div>
        <Button
          onClick={() => setShowUnitModal(true)}
          className="gradient-accent text-accent-foreground"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova Unidade
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="p-5 bg-card border-border">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-accent/10">
              <Building2 className="w-5 h-5 text-accent" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">{units.length}</p>
              <p className="text-xs text-muted-foreground">Total de Unidades</p>
            </div>
          </div>
        </Card>
        <Card className="p-5 bg-card border-border">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-success/10">
              <ToggleRight className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">{units.filter(u => u.active).length}</p>
              <p className="text-xs text-muted-foreground">Unidades Ativas</p>
            </div>
          </div>
        </Card>
        <Card className="p-5 bg-card border-border">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-muted">
              <ToggleLeft className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">{units.filter(u => !u.active).length}</p>
              <p className="text-xs text-muted-foreground">Unidades Inativas</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Units List */}
      <div className="space-y-3">
        {units.map((unit) => {
          const unitUsers = users.filter(u => u.unitId === unit.id);
          const unitLeads = leads.filter(l => l.unitId === unit.id);
          const isEditing = editingUnit === unit.id;

          return (
            <Card key={unit.id} className="p-5 bg-card border-border hover:border-accent/50 transition-colors">
              {isEditing ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs">Nome da Unidade</Label>
                      <Input
                        value={editUnit.name}
                        onChange={(e) => setEditUnit({ ...editUnit, name: e.target.value })}
                        className="bg-secondary border-border h-9"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Slug (URL)</Label>
                      <Input
                        value={editUnit.slug}
                        onChange={(e) => setEditUnit({ ...editUnit, slug: e.target.value.toLowerCase().replace(/\s/g, '-') })}
                        className="bg-secondary border-border font-mono h-9"
                      />
                    </div>
                  </div>

                  {/* Logo Upload no Edit */}
                  <div className="space-y-2">
                    <Label className="text-xs">Logo da Unidade</Label>
                    <div className="flex items-center gap-4">
                      {editUnit.logo ? (
                        <div className="relative">
                          <img src={editUnit.logo} alt="Logo" className="h-10 w-auto max-w-[100px] object-contain rounded-lg border border-border bg-secondary p-1.5" />
                          <Button
                            variant="destructive"
                            size="icon"
                            className="absolute -top-2 -right-2 h-5 w-5"
                            onClick={() => handleRemoveLogo(true)}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : (
                        <div className="h-10 w-16 rounded-lg border border-dashed border-border bg-secondary flex items-center justify-center">
                          <Image className="w-4 h-4 text-muted-foreground" />
                        </div>
                      )}
                      <input
                        ref={editFileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleLogoUpload(e, true)}
                        className="hidden"
                      />
                      <Button variant="outline" size="sm" className="h-8" onClick={() => editFileInputRef.current?.click()}>
                        <Upload className="w-3 h-3 mr-1.5" />
                        {editUnit.logo ? 'Trocar' : 'Upload'}
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Switch checked={editUnit.active} onCheckedChange={(checked) => setEditUnit({ ...editUnit, active: checked })} />
                      <span className="text-xs text-muted-foreground">{editUnit.active ? 'Ativa' : 'Inativa'}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="h-8" onClick={() => setEditingUnit(null)}>Cancelar</Button>
                      <Button size="sm" className="h-8 gradient-primary text-primary-foreground" onClick={handleSaveEdit}>
                        <Check className="w-3 h-3 mr-1" />
                        Salvar
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    {unit.logo ? (
                      <img src={unit.logo} alt={unit.name} className="h-10 w-auto max-w-[70px] object-contain rounded-lg border border-border bg-secondary/50 p-1.5" />
                    ) : (
                      <div className="p-2 rounded-lg bg-accent/10">
                        <Building2 className="w-6 h-6 text-accent" />
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="font-semibold text-foreground">{unit.name}</h3>
                        <Badge variant={unit.active ? "default" : "secondary"} className={`text-[10px] ${unit.active ? "bg-success/20 text-success" : ""}`}>
                          {unit.active ? 'Ativa' : 'Inativa'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <span className="text-xs text-muted-foreground font-mono">/{unit.slug}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5"
                          onClick={() => copyLink(unit.slug)}
                        >
                          <Copy className="w-2.5 h-2.5" />
                        </Button>
                      </div>
                      <div className="flex gap-3 text-xs text-muted-foreground">
                        <span>{unitUsers.length} usuários</span>
                        <span>{unitLeads.length} leads</span>
                        <span>Criada em {new Date(unit.createdAt).toLocaleDateString('pt-BR')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleToggleActive(unit.id, unit.active)}
                    >
                      {unit.active ? <ToggleRight className="w-4 h-4 text-success" /> : <ToggleLeft className="w-4 h-4 text-muted-foreground" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-primary"
                      onClick={() => handleEditUnit(unit.id)}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => navigate(`/${unit.slug}/dashboard`)}
                    >
                      <ExternalLink className="w-3 h-3 mr-1" />
                      Acessar
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleDeleteUnit(unit.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          );
        })}

        {units.length === 0 && (
          <Card className="p-12 bg-card border-border text-center">
            <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">Nenhuma unidade cadastrada</h3>
            <p className="text-sm text-muted-foreground mb-4">Crie sua primeira unidade para começar</p>
            <Button onClick={() => setShowUnitModal(true)} className="gradient-accent text-accent-foreground">
              <Plus className="w-4 h-4 mr-2" />
              Criar Unidade
            </Button>
          </Card>
        )}
      </div>

      {/* Create Unit Modal */}
      {showUnitModal && (
        <>
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40" onClick={() => setShowUnitModal(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-card border border-border rounded-xl z-50 animate-fade-in">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="text-lg font-bold text-foreground">Nova Unidade</h2>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowUnitModal(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-5 space-y-4">
              <div className="space-y-2">
                <Label className="text-xs">Nome da Unidade</Label>
                <Input
                  placeholder="Ex: Cartão de Todos - São Paulo"
                  value={newUnit.name}
                  onChange={(e) => setNewUnit({ ...newUnit, name: e.target.value })}
                  className="bg-secondary border-border h-9"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Slug (URL)</Label>
                <Input
                  placeholder="Ex: cartao-de-todos-sp"
                  value={newUnit.slug}
                  onChange={(e) => setNewUnit({ ...newUnit, slug: e.target.value.toLowerCase().replace(/\s/g, '-') })}
                  className="bg-secondary border-border font-mono h-9"
                />
                <p className="text-[10px] text-muted-foreground">URL de acesso: /{newUnit.slug || 'slug'}/login</p>
              </div>

              {/* Logo Upload */}
              <div className="space-y-2">
                <Label className="text-xs">Logo da Unidade (opcional)</Label>
                <div className="flex items-center gap-4">
                  {newUnit.logo ? (
                    <div className="relative">
                      <img src={newUnit.logo} alt="Logo" className="h-10 w-auto max-w-[100px] object-contain rounded-lg border border-border bg-secondary p-1.5" />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-5 w-5"
                        onClick={() => handleRemoveLogo(false)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ) : (
                    <div className="h-10 w-16 rounded-lg border border-dashed border-border bg-secondary flex items-center justify-center">
                      <Image className="w-4 h-4 text-muted-foreground" />
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleLogoUpload(e, false)}
                    className="hidden"
                  />
                  <Button variant="outline" size="sm" className="h-8" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="w-3 h-3 mr-1.5" />
                    {newUnit.logo ? 'Trocar' : 'Upload'}
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Switch checked={newUnit.active} onCheckedChange={(checked) => setNewUnit({ ...newUnit, active: checked })} />
                <span className="text-xs text-muted-foreground">Unidade ativa</span>
              </div>
            </div>
            <div className="flex justify-end gap-2 p-5 border-t border-border">
              <Button variant="outline" onClick={() => setShowUnitModal(false)}>Cancelar</Button>
              <Button onClick={handleCreateUnit} className="gradient-accent text-accent-foreground">
                <Plus className="w-4 h-4 mr-2" />
                Criar Unidade
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
