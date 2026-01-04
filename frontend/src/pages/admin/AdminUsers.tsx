import { useState } from 'react';
import { Users, Plus, Trash2, Edit2, X, Check, Mail, Shield, Building2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMultiTenantStore } from '@/store/multiTenantStore';
import { toast } from '@/hooks/use-toast';

export default function AdminUsers() {
  const { units, users, createUser, deleteUser, updateUser } = useMultiTenantStore();
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<string | null>(null);

  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'unit_admin' as 'unit_admin' | 'agent', unitId: '' });
  const [editUser, setEditUser] = useState({ name: '', email: '', role: 'unit_admin' as 'unit_admin' | 'agent', unitId: '' });

  const handleCreateUser = async () => {
    if (!newUser.name || !newUser.email || !newUser.password || !newUser.unitId) {
      toast({ title: "Preencha todos os campos", variant: "destructive" });
      return;
    }

    const emailExists = users.some(u => u.email === newUser.email);
    if (emailExists) {
      toast({ title: "Este email já está cadastrado", variant: "destructive" });
      return;
    }

    try {
      await createUser(newUser);
      setNewUser({ name: '', email: '', password: '', role: 'unit_admin', unitId: '' });
      setShowUserModal(false);
      toast({ title: "Usuário criado com sucesso!" });
    } catch (error) {
      toast({ title: "Erro ao criar usuário", variant: "destructive" });
    }
  };

  const handleEditUser = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (user && user.role !== 'super_admin') {
      setEditUser({
        name: user.name,
        email: user.email,
        role: (user.role === 'unit_admin' || user.role === 'agent') ? user.role : 'unit_admin',
        unitId: user.unitId || ''
      });
      setEditingUser(userId);
    }
  };

  const handleSaveEdit = () => {
    if (!editingUser) return;

    if (!editUser.name || !editUser.email || !editUser.unitId) {
      toast({ title: "Preencha todos os campos", variant: "destructive" });
      return;
    }

    updateUser(editingUser, editUser);
    setEditingUser(null);
    toast({ title: "Usuário atualizado!" });
  };

  const handleDeleteUser = (id: string) => {
    deleteUser(id);
    toast({ title: "Usuário removido" });
  };

  const unitUsers = users.filter(u => u.role !== 'super_admin');
  const adminUsers = unitUsers.filter(u => u.role === 'unit_admin');
  const regularUsers = unitUsers.filter(u => u.role === 'agent');

  return (
    <div className="p-6 lg:p-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-1">Usuários</h1>
          <p className="text-sm text-muted-foreground">Gerencie os usuários das unidades</p>
        </div>
        <Button
          onClick={() => setShowUserModal(true)}
          className="gradient-primary text-primary-foreground"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Usuário
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="p-5 bg-card border-border">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-primary/10">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">{unitUsers.length}</p>
              <p className="text-xs text-muted-foreground">Total de Usuários</p>
            </div>
          </div>
        </Card>
        <Card className="p-5 bg-card border-border">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-accent/10">
              <Shield className="w-5 h-5 text-accent" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">{adminUsers.length}</p>
              <p className="text-xs text-muted-foreground">Administradores</p>
            </div>
          </div>
        </Card>
        <Card className="p-5 bg-card border-border">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-muted">
              <Users className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">{regularUsers.length}</p>
              <p className="text-xs text-muted-foreground">Usuários Comuns</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Users List */}
      <div className="space-y-3">
        {unitUsers.map((user) => {
          const unit = units.find(u => u.id === user.unitId);
          const isEditing = editingUser === user.id;

          return (
            <Card key={user.id} className="p-5 bg-card border-border hover:border-primary/50 transition-colors">
              {isEditing ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs">Nome</Label>
                      <Input
                        value={editUser.name}
                        onChange={(e) => setEditUser({ ...editUser, name: e.target.value })}
                        className="bg-secondary border-border h-9"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Email</Label>
                      <Input
                        type="email"
                        value={editUser.email}
                        onChange={(e) => setEditUser({ ...editUser, email: e.target.value })}
                        className="bg-secondary border-border h-9"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs">Função</Label>
                      <Select value={editUser.role} onValueChange={(value: 'unit_admin' | 'agent') => setEditUser({ ...editUser, role: value })}>
                        <SelectTrigger className="bg-secondary border-border h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unit_admin">Administrador</SelectItem>
                          <SelectItem value="agent">Agente</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Unidade</Label>
                      <Select value={editUser.unitId} onValueChange={(value) => setEditUser({ ...editUser, unitId: value })}>
                        <SelectTrigger className="bg-secondary border-border h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {units.map(unit => (
                            <SelectItem key={unit.id} value={unit.id}>{unit.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" className="h-8" onClick={() => setEditingUser(null)}>Cancelar</Button>
                    <Button size="sm" className="h-8 gradient-primary text-primary-foreground" onClick={handleSaveEdit}>
                      <Check className="w-3 h-3 mr-1" />
                      Salvar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-10 h-10 rounded-full border border-border"
                    />
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="font-semibold text-foreground">{user.name}</h3>
                        <Badge variant={user.role === 'unit_admin' ? "default" : "secondary"} className={`text-[10px] ${user.role === 'unit_admin' ? "bg-accent/20 text-accent" : ""}`}>
                          {user.role === 'unit_admin' ? 'Admin' : 'Usuário'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {user.email}
                        </span>
                        {unit && (
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            {unit.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-primary"
                      onClick={() => handleEditUser(user.id)}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleDeleteUser(user.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          );
        })}

        {unitUsers.length === 0 && (
          <Card className="p-12 bg-card border-border text-center">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">Nenhum usuário cadastrado</h3>
            <p className="text-sm text-muted-foreground mb-4">Crie usuários para gerenciar as unidades</p>
            <Button onClick={() => setShowUserModal(true)} className="gradient-primary text-primary-foreground">
              <Plus className="w-4 h-4 mr-2" />
              Criar Usuário
            </Button>
          </Card>
        )}
      </div>

      {/* Create User Modal */}
      {showUserModal && (
        <>
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40" onClick={() => setShowUserModal(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-card border border-border rounded-xl z-50 animate-fade-in">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="text-lg font-bold text-foreground">Novo Usuário</h2>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowUserModal(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-5 space-y-4">
              <div className="space-y-2">
                <Label className="text-xs">Nome Completo</Label>
                <Input
                  placeholder="Nome do usuário"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  className="bg-secondary border-border h-9"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Email</Label>
                <Input
                  type="email"
                  placeholder="email@exemplo.com"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="bg-secondary border-border h-9"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Senha</Label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="bg-secondary border-border h-9"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">Função</Label>
                  <Select value={newUser.role} onValueChange={(value: 'unit_admin' | 'agent') => setNewUser({ ...newUser, role: value })}>
                    <SelectTrigger className="bg-secondary border-border h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unit_admin">Administrador</SelectItem>
                      <SelectItem value="agent">Agente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Unidade</Label>
                  <Select value={newUser.unitId} onValueChange={(value) => setNewUser({ ...newUser, unitId: value })}>
                    <SelectTrigger className="bg-secondary border-border h-9">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {units.map(unit => (
                        <SelectItem key={unit.id} value={unit.id}>{unit.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 p-5 border-t border-border">
              <Button variant="outline" onClick={() => setShowUserModal(false)}>Cancelar</Button>
              <Button onClick={handleCreateUser} className="gradient-primary text-primary-foreground">
                <Plus className="w-4 h-4 mr-2" />
                Criar Usuário
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
