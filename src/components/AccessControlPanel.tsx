import React, { useState, useEffect } from 'react';
import { User, Clock, Ban, Trash2, AlertTriangle, Loader2, CheckCircle2 } from 'lucide-react';

interface Collaborator {
  id: string;
  name: string;
  email: string;
  role: 'colaborador' | 'gestor';
  status: 'active' | 'inactive' | 'pending';
  last_login?: string;
}

export function AccessControlPanel() {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userToDelete, setUserToDelete] = useState<Collaborator | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Buscar colaboradores da API ao carregar
  useEffect(() => {
    fetchCollaborators();
  }, []);

  const fetchCollaborators = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch('/api/collaborators', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCollaborators(data);
      }
    } catch (error) {
      console.error("Erro ao buscar equipe:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`/api/collaborators/${userToDelete.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        setCollaborators(prev => prev.filter(c => c.id !== userToDelete.id));
        setUserToDelete(null); // Fecha o modal
      } else {
        alert("Erro ao excluir colaborador. Tente novamente.");
      }
    } catch (error) {
      alert("Erro de conexão ao tentar excluir.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleStatus = async (collab: Collaborator) => {
    const newStatus = collab.status === 'active' ? 'inactive' : 'active';
    const action = newStatus === 'active' ? 'liberar' : 'bloquear';

    if (!confirm(`Deseja realmente ${action} o acesso de ${collab.name}?`)) return;

    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`/api/collaborators/${collab.id}/status`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (res.ok) {
        setCollaborators(prev => prev.map(c => 
          c.id === collab.id ? { ...c, status: newStatus } : c
        ));
      } else {
        alert(`Erro ao ${action} colaborador.`);
      }
    } catch (error) {
      alert("Erro de conexão.");
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
          <User className="w-5 h-5" />
          Controle de Acessos da Equipe
        </h2>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 text-sm font-bold transition-colors">
          Convidar Colaborador
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-200 dark:border-zinc-800 text-gray-500 dark:text-gray-400 text-sm">
              <th className="pb-3 font-bold">Nome</th>
              <th className="pb-3 font-bold">Email</th>
              <th className="pb-3 font-bold">Status</th>
              <th className="pb-3 font-bold">Último Acesso</th>
              <th className="pb-3 text-right font-bold">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-gray-500">Carregando equipe...</td>
              </tr>
            ) : collaborators.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-gray-500">Nenhum colaborador encontrado.</td>
              </tr>
            ) : collaborators.map((collab) => (
              <tr key={collab.id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors">
                <td className="py-3 font-bold text-gray-800 dark:text-white">{collab.name}</td>
                <td className="py-3 text-gray-600 dark:text-gray-400">{collab.email}</td>
                <td className="py-3">
                  <span className={`px-2 py-1 rounded-lg text-xs font-bold ${
                    collab.status === 'active' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-rose-100 text-rose-800 dark:bg-rose-500/10 dark:text-rose-400'
                  }`}>
                    {collab.status === 'active' ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="py-3 text-gray-500 dark:text-gray-400 text-sm flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {collab.last_login || 'Nunca'}
                </td>
                <td className="py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button 
                      onClick={() => handleToggleStatus(collab)}
                      className={`flex items-center gap-1 text-sm font-bold px-3 py-1.5 rounded-lg transition-colors ${
                        collab.status === 'active' 
                          ? 'text-amber-600 hover:text-amber-700 dark:text-amber-500 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10' 
                          : 'text-emerald-600 hover:text-emerald-700 dark:text-emerald-500 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10'
                      }`}
                      title={collab.status === 'active' ? "Bloquear Acesso" : "Liberar Acesso"}
                    >
                      {collab.status === 'active' ? <Ban size={16} /> : <CheckCircle2 size={16} />}
                      <span className="hidden lg:inline">{collab.status === 'active' ? 'Bloquear' : 'Liberar'}</span>
                    </button>
                    <button 
                      onClick={() => setUserToDelete(collab)}
                      className="flex items-center gap-1 text-rose-600 hover:text-rose-700 dark:text-rose-500 dark:hover:text-rose-400 text-sm font-bold px-3 py-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors" 
                      title="Excluir Colaborador"
                    >
                      <Trash2 size={16} />
                      <span className="hidden lg:inline">Excluir</span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal de Confirmação de Exclusão */}
      {userToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 max-w-sm w-full shadow-xl border border-gray-100 dark:border-zinc-800 animate-in fade-in zoom-in duration-200">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-12 h-12 bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-500 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle size={24} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Excluir Colaborador?</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                Tem certeza que deseja remover <strong>{userToDelete.name}</strong>? Esta ação não pode ser desfeita.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setUserToDelete(null)}
                className="flex-1 py-2.5 bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 py-2.5 bg-rose-600 text-white font-bold rounded-xl hover:bg-rose-700 transition-colors shadow-lg shadow-rose-600/20 flex items-center justify-center gap-2"
              >
                {isDeleting ? <Loader2 className="animate-spin w-4 h-4" /> : 'Sim, Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}