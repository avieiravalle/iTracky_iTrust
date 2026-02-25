import React, { useState, useEffect } from 'react';
import { User, Shield, ToggleLeft, ToggleRight, Trash2, Loader2, BookOpen, Clock, Search } from 'lucide-react';

// Tipos que estariam em src/types.ts
interface Collaborator {
  id: number;
  name: string;
  email: string;
  status: 'active' | 'inactive';
  last_login: string | null;
}

interface AuditLog {
  id: number;
  action: string;
  details: string;
  timestamp: string;
}

interface TeamManagementProps {
  // Este componente agora é autônomo e não precisa de props para dados.
}

export const TeamManagement: React.FC<TeamManagementProps> = () => {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCollaborator, setSelectedCollaborator] = useState<Collaborator | null>(null);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  const fetchCollaborators = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch('/api/collaborators', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setCollaborators(data);
        // Se não houver colaborador selecionado e a lista não estiver vazia, seleciona o primeiro.
        if (!selectedCollaborator && data.length > 0) {
          handleSelectCollaborator(data[0]);
        } else if (data.length === 0) {
          setSelectedCollaborator(null);
        }
      }
    } catch (error) {
      console.error("Erro ao buscar colaboradores:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCollaborators();
  }, []);

  const handleSelectCollaborator = async (collaborator: Collaborator) => {
    setSelectedCollaborator(collaborator);
    setIsLoadingLogs(true);
    setLogs([]);
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`/api/collaborators/${collaborator.id}/logs`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setLogs(data);
      }
    } catch (error) {
      console.error(`Erro ao buscar logs para o colaborador ${collaborator.id}:`, error);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const formatLogAction = (action: string) => {
    return action.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  const handleToggleCollaboratorStatus = async (collaboratorId: number, newStatus: 'active' | 'inactive') => {
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`/api/collaborators/${collaboratorId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (res.ok) {
        alert(`Colaborador ${newStatus === 'active' ? 'ativado' : 'desativado'} com sucesso!`);
        // Atualiza a lista localmente para refletir na UI imediatamente
        const updatedCollaborators = collaborators.map(c => 
          c.id === collaboratorId ? { ...c, status: newStatus } : c
        );
        setCollaborators(updatedCollaborators);
        // Atualiza o colaborador selecionado se for o caso
        if (selectedCollaborator?.id === collaboratorId) {
          setSelectedCollaborator(prev => prev ? { ...prev, status: newStatus } : null);
        }
      } else {
        const data = await res.json();
        alert(`Erro: ${data.error || 'Não foi possível alterar o status.'}`);
      }
    } catch (error) {
      alert('Erro de conexão ao alterar status.');
    }
  };

  const handleDeleteCollaborator = async (collaboratorId: number) => {
    if (!window.confirm('Tem certeza que deseja remover este colaborador? Esta ação não pode ser desfeita.')) return;

    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`/api/collaborators/${collaboratorId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        alert('Colaborador removido com sucesso!');
        // Atualiza a lista localmente
        const remainingCollaborators = collaborators.filter(c => c.id !== collaboratorId);
        setCollaborators(remainingCollaborators);
        
        // Se o colaborador removido era o selecionado, seleciona o primeiro da lista restante ou null
        if (selectedCollaborator?.id === collaboratorId) {
          if (remainingCollaborators.length > 0) {
            handleSelectCollaborator(remainingCollaborators[0]);
          } else {
            setSelectedCollaborator(null);
          }
        }
      } else {
        const data = await res.json();
        alert(`Erro: ${data.error || 'Não foi possível remover o colaborador.'}`);
      }
    } catch (error) {
      alert('Erro de conexão ao tentar remover.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Gestão de Equipe</h1>
          <p className="text-gray-500 dark:text-gray-400">Gerencie os acessos e visualize as atividades dos seus colaboradores.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Coluna da Lista de Colaboradores */}
        <div className="lg:col-span-1 bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm h-fit">
          <h3 className="font-bold text-lg mb-4 px-2 dark:text-white">Colaboradores ({collaborators.length})</h3>
          {isLoading ? (
            <div className="flex justify-center items-center h-48"><Loader2 className="animate-spin text-blue-500" size={32} /></div>
          ) : (
            <div className="space-y-2">
              {collaborators.length > 0 ? collaborators.map(collab => (
                <button
                  key={collab.id}
                  onClick={() => handleSelectCollaborator(collab)}
                  className={`w-full text-left p-3 rounded-xl transition-colors flex items-center justify-between ${selectedCollaborator?.id === collab.id ? 'bg-blue-50 dark:bg-blue-500/10' : 'hover:bg-gray-50 dark:hover:bg-zinc-800/50'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg ${collab.status === 'active' ? 'bg-emerald-500' : 'bg-gray-400'}`}>
                      {collab.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className={`font-bold text-sm ${selectedCollaborator?.id === collab.id ? 'text-blue-800 dark:text-blue-300' : 'text-gray-800 dark:text-white'}`}>{collab.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{collab.email}</p>
                    </div>
                  </div>
                  <div className={`w-2.5 h-2.5 rounded-full ${collab.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                </button>
              )) : (
                <p className="text-center text-sm text-gray-400 py-10">Nenhum colaborador cadastrado.</p>
              )}
            </div>
          )}
        </div>

        {/* Coluna de Detalhes e Logs */}
        <div className="lg:col-span-2">
          {selectedCollaborator ? (
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-gray-100 dark:border-zinc-800 mb-6">
                <div className="flex items-center gap-4 mb-4 sm:mb-0">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-3xl ${selectedCollaborator.status === 'active' ? 'bg-emerald-500' : 'bg-gray-400'}`}>
                    {selectedCollaborator.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{selectedCollaborator.name}</h2>
                    <p className="text-gray-500 dark:text-gray-400">{selectedCollaborator.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-center">
                  <button
                    onClick={() => handleToggleCollaboratorStatus(selectedCollaborator.id, selectedCollaborator.status === 'active' ? 'inactive' : 'active')}
                    className={`p-2 rounded-lg transition-colors ${selectedCollaborator.status === 'active' ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200' : 'bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200'}`}
                    title={selectedCollaborator.status === 'active' ? 'Desativar Acesso' : 'Ativar Acesso'}
                  >
                    {selectedCollaborator.status === 'active' ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                  </button>
                  <button
                    onClick={() => handleDeleteCollaborator(selectedCollaborator.id)}
                    className="p-2 rounded-lg bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-100 transition-colors"
                    title="Remover Colaborador"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2 dark:text-white">
                  <BookOpen size={20} className="text-blue-500" />
                  Log de Atividades
                </h3>
                {isLoadingLogs ? (
                  <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin text-blue-500" size={32} /></div>
                ) : (
                  <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                    {logs.length > 0 ? logs.map(log => (
                      <div key={log.id} className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-gray-100 dark:bg-zinc-800 rounded-full flex items-center justify-center shrink-0 mt-1">
                          <Clock size={16} className="text-gray-500" />
                        </div>
                        <div>
                          <p className="font-bold text-sm text-gray-800 dark:text-white">{formatLogAction(log.action)}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-300">{log.details}</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            {new Date(log.timestamp).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    )) : (
                      <div className="text-center py-16 text-gray-400">
                        <Search size={40} className="mx-auto mb-2" />
                        <p className="font-medium">Nenhuma atividade registrada.</p>
                        <p className="text-sm">As ações do colaborador aparecerão aqui.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full bg-white dark:bg-zinc-900 p-6 rounded-2xl border-2 border-dashed border-gray-200 dark:border-zinc-700 text-gray-400">
              <User size={48} className="mb-4" />
              <p className="font-bold">Selecione um colaborador</p>
              <p className="text-sm">Clique em um colaborador na lista para ver seus detalhes e atividades.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};