import React, { useState } from 'react';
import { 
  Users, 
  ShieldCheck, 
  AlertCircle, 
  Ban, 
  CheckCircle2, 
  Search, 
  Key, 
  TrendingUp, 
  DollarSign,
  Trash2,
  CreditCard,
  Clock,
  Eye,
  EyeOff,
  FileText
} from 'lucide-react';
import { motion } from 'motion/react';
import { Client, AppSale } from '../types';
import { formatBRL } from '../utils/format';

interface AuditLog {
  id: number;
  user_name: string;
  action: string;
  details: string;
  timestamp: string;
}

export const AdminDashboard: React.FC = () => {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [adminCredentials, setAdminCredentials] = useState({ email: '', password: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending'>('all');
  const [logSearchTerm, setLogSearchTerm] = useState('');
  
  const [clients, setClients] = useState<Client[]>([]);
  const [sales, setSales] = useState<AppSale[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  
  const fetchData = async () => {
    try {
      const [clientsRes, salesRes, logsRes] = await Promise.all([
        fetch('/api/admin/users'),
        fetch('/api/admin/sales'),
        fetch('/api/admin/logs')
      ]);

      if (clientsRes.ok) {
        const data = await clientsRes.json();
        setClients(data);
      }

      if (salesRes.ok) {
        const data = await salesRes.json();
        setSales(data);
      }

      if (logsRes.ok) {
        const data = await logsRes.json();
        setLogs(data);
      }
    } catch (error) {
      console.error("Error fetching admin data:", error);
    }
  };

  React.useEffect(() => {
    if (isAuthorized) {
      fetchData();
    }
  }, [isAuthorized]);

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminCredentials.email === 'avieiravale@gmail.com' && adminCredentials.password === 'Anderson@46') {
      setIsAuthorized(true);
    } else {
      alert('Credenciais de administrador inválidas.');
    }
  };

  const deleteClient = async (id: number) => {
    if (window.confirm('Tem certeza que deseja remover este cliente? Esta ação é irreversível.')) {
      try {
        const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
        if (res.ok) {
          setClients(prev => prev.filter(c => c.id !== id));
        }
      } catch (error) {
        alert("Erro ao deletar cliente");
      }
    }
  };

  const registerPayment = async (id: number) => {
    const amountStr = window.prompt('Digite o valor do pagamento (Padrão: 100.00):', '100.00');
    const amount = amountStr ? parseFloat(amountStr.replace(',', '.')) : undefined;

    try {
      const res = await fetch(`/api/admin/users/${id}/payment`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount })
      });
      if (res.ok) {
        const data = await res.json();
        setClients(prev => prev.map(c => {
          if (c.id === id) {
            return { ...c, last_payment: data.last_payment, status: 'active' };
          }
          return c;
        }));
        // Refresh sales after payment
        const salesRes = await fetch('/api/admin/sales');
        if (salesRes.ok) {
          const salesData = await salesRes.json();
          setSales(salesData);
        }
        alert('Pagamento registrado com sucesso!');
      }
    } catch (error) {
      alert("Erro ao registrar pagamento");
    }
  };

  const toggleStatus = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/users/${id}/toggle-status`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setClients(prev => prev.map(c => {
          if (c.id === id) {
            return { ...c, status: data.status };
          }
          return c;
        }));
        fetchData(); // Recarrega logs para ver a ação de bloqueio se implementarmos log no backend para essa rota
      }
    } catch (error) {
      alert("Erro ao alterar status");
    }
  };

  const resetDatabase = async () => {
    if (window.confirm('ATENÇÃO: Isso apagará TODOS os produtos, transações e usuários (exceto admin). Deseja continuar?')) {
      try {
        const res = await fetch('/api/admin/reset-db', { method: 'POST' });
        if (res.ok) {
          alert('Base de dados limpa com sucesso!');
          fetchData();
        }
      } catch (error) {
        alert("Erro ao limpar base de dados");
      }
    }
  };

  const getDaysOverdue = (lastPayment: string) => {
    if (!lastPayment) return 0;
    const last = new Date(lastPayment);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - last.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (!isAuthorized) {
    return (
      <div className="flex items-center justify-center py-20">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] border border-gray-100 dark:border-zinc-800 shadow-xl w-full max-w-md transition-colors"
        >
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-16 h-16 bg-blue-50 dark:bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-600 mb-4">
              <ShieldCheck size={32} />
            </div>
            <h3 className="text-2xl font-bold dark:text-white">Acesso Restrito</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">Identifique-se para acessar o painel administrativo.</p>
          </div>

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-2">E-mail Admin</label>
              <input 
                type="email" 
                required 
                value={adminCredentials.email}
                onChange={(e) => setAdminCredentials(prev => ({ ...prev, email: e.target.value }))}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-zinc-800 rounded-xl border-none focus:ring-2 focus:ring-blue-500/20 outline-none dark:text-white" 
                placeholder="admin@exemplo.com"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-2">Senha</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} 
                  required 
                  value={adminCredentials.password}
                  onChange={(e) => setAdminCredentials(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-zinc-800 rounded-xl border-none focus:ring-2 focus:ring-blue-500/20 outline-none dark:text-white pr-12" 
                  placeholder="••••••••"
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
            <button 
              type="submit" 
              className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 active:scale-[0.98]"
            >
              Entrar no Painel
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  // Filtered data based on search
  const filteredClients = clients.filter(c => 
    (c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.establishment_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c as any).store_code?.toLowerCase().includes(searchTerm.toLowerCase())) &&
    (filterStatus === 'all' || (filterStatus === 'pending' && c.status === 'pending'))
  );

  const filteredSales = sales.filter(s => 
    s.client_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalRevenue = filteredSales.reduce((acc, s) => acc + s.amount, 0);

  const filteredLogs = logs.filter(log => 
    (log.user_name?.toLowerCase() || '').includes(logSearchTerm.toLowerCase()) ||
    log.action.toLowerCase().includes(logSearchTerm.toLowerCase()) ||
    log.details.toLowerCase().includes(logSearchTerm.toLowerCase())
  );

  // Agrupamento por Loja/Código
  const groupedClients = filteredClients.reduce((groups, client) => {
    const code = (client as any).store_code || 'OUTROS';
    if (!groups[code]) {
      groups[code] = [];
    }
    groups[code].push(client);
    return groups;
  }, {} as Record<string, typeof clients>);

  const sortedGroupKeys = Object.keys(groupedClients).sort((a, b) => {
    if (a === 'OUTROS') return 1;
    if (b === 'OUTROS') return -1;
    return a.localeCompare(b);
  });

  return (
    <div className="space-y-8 pb-12">
      {/* Resumo Admin */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-gray-100 dark:border-zinc-800 shadow-sm transition-colors">
          <div className="flex items-center gap-3 text-blue-500 mb-4">
            <Users size={24} />
            <h3 className="font-bold text-lg dark:text-white">Total de Clientes</h3>
          </div>
          <p className="text-3xl font-bold dark:text-white">{filteredClients.length}</p>
          <p className="text-xs text-gray-400 mt-2 uppercase tracking-wider">
            {searchTerm ? 'Resultados da busca' : 'Usuários ativos no sistema'}
          </p>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-gray-100 dark:border-zinc-800 shadow-sm transition-colors">
          <div className="flex items-center gap-3 text-emerald-500 mb-4">
            <TrendingUp size={24} />
            <h3 className="font-bold text-lg dark:text-white">Faturamento</h3>
          </div>
          <p className="text-3xl font-bold text-emerald-600">{formatBRL(totalRevenue)}</p>
          <p className="text-xs text-gray-400 mt-2 uppercase tracking-wider">
            {searchTerm ? 'Soma da pesquisa' : 'Vendas de assinaturas'}
          </p>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-gray-100 dark:border-zinc-800 shadow-sm transition-colors">
          <div className="flex items-center gap-3 text-amber-500 mb-4">
            <AlertCircle size={24} />
            <h3 className="font-bold text-lg dark:text-white">Pendentes</h3>
          </div>
          <p className="text-3xl font-bold text-amber-500">{filteredClients.filter(c => c.status === 'pending').length}</p>
          <p className="text-xs text-gray-400 mt-2 uppercase tracking-wider">Aguardando confirmação</p>
        </div>
      </div>

      {/* Gestão de Clientes */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-gray-100 dark:border-zinc-800 shadow-sm overflow-hidden transition-colors">
        <div className="p-6 border-b border-gray-50 dark:border-zinc-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="text-blue-500" size={24} />
              <h3 className="font-bold text-xl dark:text-white">Gerenciamento de Acessos</h3>
            </div>
            <button 
              type="button"
              onClick={resetDatabase}
              className="px-3 py-1.5 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[10px] font-bold rounded-lg uppercase hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-colors flex items-center gap-1"
            >
              <Trash2 size={12} />
              Limpar Base
            </button>
            </div>
            <div className="flex items-center gap-2 bg-gray-50 dark:bg-zinc-800/50 p-1 rounded-xl w-fit">
              <button 
                type="button"
                onClick={() => setFilterStatus('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filterStatus === 'all' ? 'bg-white dark:bg-zinc-700 shadow-sm text-gray-800 dark:text-white' : 'text-gray-400 hover:text-gray-600'}`}
              >
                Todos
              </button>
              <button 
                type="button"
                onClick={() => setFilterStatus('pending')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${filterStatus === 'pending' ? 'bg-white dark:bg-zinc-700 shadow-sm text-amber-600' : 'text-gray-400 hover:text-gray-600'}`}
              >
                Pendentes
                {clients.filter(c => c.status === 'pending').length > 0 && (
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                  </span>
                )}
              </button>
            </div>
          </div>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por nome, email ou código..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-zinc-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none dark:text-white"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 dark:bg-zinc-800/50 text-[11px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-bold">
                <th className="px-6 py-4">Cliente / Email</th>
                <th className="px-6 py-4">Loja / Código</th>
                <th className="px-6 py-4">Perfil</th>
                <th className="px-6 py-4">Plano</th>
                <th className="px-6 py-4">Status Pagamento</th>
                <th className="px-6 py-4">Último Pagamento</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-zinc-800">
              {sortedGroupKeys.map(groupKey => {
                const group = groupedClients[groupKey];
                // Ordenar: Gestor primeiro
                const sortedGroup = group.sort((a, b) => {
                  if (a.role === 'gestor' && b.role !== 'gestor') return -1;
                  if (a.role !== 'gestor' && b.role === 'gestor') return 1;
                  return a.name.localeCompare(b.name);
                });

                const isStoreGroup = groupKey !== 'OUTROS';
                const storeName = isStoreGroup ? sortedGroup.find(c => c.role === 'gestor')?.establishment_name || sortedGroup[0].establishment_name : 'Sem Loja';
                
                return (
                  <React.Fragment key={groupKey}>
                    {isStoreGroup && (
                      <tr className="bg-gray-50/80 dark:bg-zinc-800/30 border-y border-gray-100 dark:border-zinc-800">
                        <td colSpan={7} className="px-6 py-3">
                          <div className="flex items-center gap-3">
                            <div className="p-1.5 bg-blue-100 dark:bg-blue-500/20 rounded-lg text-blue-600 dark:text-blue-400">
                              <Users size={16} />
                            </div>
                            <span className="font-bold text-xs uppercase tracking-wider text-gray-600 dark:text-gray-300">
                              {storeName}
                            </span>
                            <span className="px-2 py-0.5 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded text-[10px] font-mono font-bold text-gray-500">
                              {groupKey}
                            </span>
                            <span className="text-[10px] text-gray-400 font-medium">
                              ({group.length} usuários)
                            </span>
                          </div>
                        </td>
                      </tr>
                    )}
                    {sortedGroup.map(client => {
                      const daysOverdue = getDaysOverdue(client.last_payment);
                      const isCritical = daysOverdue > 30;
                      
                      return (
                        <tr key={client.id} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="font-bold text-sm dark:text-white">{client.name}</span>
                              <span className="text-xs text-gray-400 select-all">{client.email}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm font-medium dark:text-white">{client.establishment_name}</p>
                            {(client as any).store_code && (
                              <div className="flex items-center gap-1.5 mt-1.5">
                                <Key size={12} className="text-gray-400" />
                                <code className="text-[11px] font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 px-2 py-0.5 rounded select-all cursor-text" title="Código da Loja">
                                  {(client as any).store_code}
                                </code>
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${client.role === 'gestor' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400' : 'bg-zinc-50 text-zinc-600 dark:bg-zinc-500/10 dark:text-zinc-400'}`}>
                              {client.role}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${client.plan === 'Premium' ? 'bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400' : 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400'}`}>
                              {client.plan}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {isCritical ? (
                              <span className="inline-flex items-center gap-1 text-rose-600 text-xs font-bold bg-rose-50 dark:bg-rose-500/10 px-2 py-1 rounded-lg">
                                <AlertCircle size={14} />
                                Atrasado ({daysOverdue} dias)
                              </span>
                            ) : client.status === 'active' ? (
                              <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-bold">
                                <CheckCircle2 size={14} />
                                Em dia
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-amber-500 text-xs font-bold">
                                <Clock size={14} />
                                Pendente
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                            {new Date(client.last_payment).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="px-6 py-4 text-right space-x-1">
                            <button 
                              type="button"
                              onClick={() => registerPayment(client.id)}
                              className={`p-2 rounded-lg transition-colors ${client.status === 'pending' ? 'text-emerald-600 bg-emerald-100 hover:bg-emerald-200 animate-pulse' : 'text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10'}`}
                              title={client.status === 'pending' ? "Confirmar Pagamento e Aprovar" : "Registrar Pagamento"}
                            >
                              <CreditCard size={18} />
                            </button>
                            <button type="button" className="p-2 text-gray-400 hover:text-blue-500 transition-colors" title="Resetar Senha">
                              <Key size={18} />
                            </button>
                            <button 
                              type="button"
                              onClick={() => toggleStatus(client.id)}
                              className={`p-2 transition-colors ${client.status === 'active' ? 'text-amber-400 hover:text-amber-600' : 'text-emerald-400 hover:text-emerald-600'}`}
                              title={client.status === 'active' ? 'BLOQUEAR ACESSO (Desconecta Imediatamente)' : 'Liberar Acesso'}
                            >
                              {client.status === 'active' ? <Ban size={18} /> : <CheckCircle2 size={18} />}
                            </button>
                            <button 
                              type="button"
                              onClick={() => deleteClient(client.id)}
                              className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors"
                              title="Deletar Cliente"
                            >
                              <Trash2 size={18} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Resumo de Vendas do App */}
      <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-gray-100 dark:border-zinc-800 shadow-sm transition-colors">
        <div className="flex items-center gap-2 mb-6">
          <DollarSign className="text-emerald-500" size={24} />
          <h3 className="font-bold text-xl dark:text-white">Resumo de Vendas do App</h3>
        </div>
        <div className="space-y-4">
          {filteredSales.map(sale => (
            <div key={sale.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-zinc-800 rounded-2xl transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-white dark:bg-zinc-700 rounded-xl flex items-center justify-center shadow-sm">
                  <DollarSign size={20} className="text-emerald-500" />
                </div>
                <div>
                  <p className="font-bold text-sm dark:text-white">{sale.client_name}</p>
                  <p className="text-xs text-gray-400">{new Date(sale.date).toLocaleDateString('pt-BR')}</p>
                </div>
              </div>
              <p className="font-bold text-emerald-600">{formatBRL(sale.amount)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Logs de Auditoria */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-gray-100 dark:border-zinc-800 shadow-sm overflow-hidden transition-colors">
        <div className="p-6 border-b border-gray-50 dark:border-zinc-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-2">
            <FileText className="text-gray-500" size={24} />
            <h3 className="font-bold text-xl dark:text-white">Logs de Auditoria</h3>
          </div>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="Buscar usuário ou ação..." 
              value={logSearchTerm}
              onChange={(e) => setLogSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-zinc-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none dark:text-white"
            />
          </div>
        </div>
        <div className="max-h-96 overflow-y-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-white dark:bg-zinc-900 z-10">
              <tr className="bg-gray-50/50 dark:bg-zinc-800/50 text-[11px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-bold">
                <th className="px-6 py-3">Data/Hora</th>
                <th className="px-6 py-3">Usuário</th>
                <th className="px-6 py-3">Ação</th>
                <th className="px-6 py-3">Detalhes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-zinc-800">
              {filteredLogs.map(log => (
                <tr key={log.id} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/50 transition-colors text-sm">
                  <td className="px-6 py-3 text-gray-500 font-mono text-xs">
                    {new Date(log.timestamp).toLocaleString('pt-BR')}
                  </td>
                  <td className="px-6 py-3 font-bold dark:text-white">{log.user_name || 'Sistema'}</td>
                  <td className="px-6 py-3">
                    <span className="px-2 py-1 bg-gray-100 dark:bg-zinc-800 rounded text-xs font-bold uppercase">{log.action}</span>
                  </td>
                  <td className="px-6 py-3 text-gray-600 dark:text-gray-400">{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
