import React from 'react';
import { TrendingUp, AlertTriangle, Package, Calendar, Clock } from 'lucide-react';
import { Product, Stats, MonthlyStat, User } from '../types';
import { formatBRL } from '../utils/format';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

interface DashboardProps {
  products: Product[];
  stats: Stats;
  monthlyStats: MonthlyStat[];
  evolutionPeriod: 'day' | 'week' | 'month' | 'quarter';
  setEvolutionPeriod: (period: 'day' | 'week' | 'month' | 'quarter') => void;
  darkMode: boolean;
  onViewFinanceiro: () => void;
  user: User | null;
}

export const Dashboard: React.FC<DashboardProps> = ({ 
  products, 
  stats, 
  monthlyStats, 
  evolutionPeriod, 
  setEvolutionPeriod,
  darkMode,
  onViewFinanceiro,
  user
}) => {
  const isColaborador = user?.role === 'colaborador';
  const lowStockProducts = products.filter(p => p.current_stock <= p.min_stock);
  const totalValue = products.reduce((acc, p) => acc + (p.current_stock * p.average_cost), 0);

  // Format labels based on period
  const formattedMonthlyData = monthlyStats.map(item => {
    let displayLabel = item.month;
    
    if (evolutionPeriod === 'month') {
      const [year, month] = item.month.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1);
      displayLabel = date.toLocaleString('pt-BR', { month: 'short' }).replace('.', '');
    } else if (evolutionPeriod === 'day') {
      const [year, month, day] = item.month.split('-');
      displayLabel = `${day}/${month}`;
    } else if (evolutionPeriod === 'week') {
      const [year, week] = item.month.split('-');
      displayLabel = `Sem ${week.replace('W', '')}`;
    } else if (evolutionPeriod === 'quarter') {
      displayLabel = item.month.replace('-', ' ');
    }

    return {
      ...item,
      displayMonth: displayLabel
    };
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {!isColaborador && (
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm transition-colors">
            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-1">Valor em Estoque</p>
            <h3 className="text-2xl font-bold dark:text-white">{formatBRL(totalValue)}</h3>
            <div className="mt-4 flex items-center gap-2 text-emerald-600 text-xs font-bold">
              <TrendingUp size={14} />
              <span>Patrimônio atual</span>
            </div>
          </div>
        )}
        {!isColaborador && (
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm transition-colors">
            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-1">Lucro Realizado</p>
            <h3 className="text-2xl font-bold text-emerald-600">{formatBRL(stats?.realized_profit || 0)}</h3>
            <div className="mt-4 flex items-center gap-2 text-emerald-600 text-xs font-bold">
              <TrendingUp size={14} />
              <span>Vendas Pagas</span>
            </div>
          </div>
        )}
        {!isColaborador && (
          <button 
            onClick={onViewFinanceiro}
            className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm transition-all hover:shadow-md hover:border-amber-200 dark:hover:border-amber-500/30 text-left group"
          >
            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-1 group-hover:text-amber-600 transition-colors">Lucro a Receber</p>
            <h3 className="text-2xl font-bold text-amber-500">{formatBRL(stats?.pending_profit || 0)}</h3>
            <div className="mt-4 flex items-center gap-2 text-amber-500 text-xs font-bold">
              <Clock size={14} />
              <span>Ver detalhes</span>
            </div>
          </button>
        )}
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm transition-colors">
          <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-1">Baixo Estoque</p>
          <h3 className="text-2xl font-bold text-rose-600">{lowStockProducts.length}</h3>
          <div className="mt-4 flex items-center gap-2 text-rose-600 text-xs font-bold">
            <AlertTriangle size={14} />
            <span>Itens críticos</span>
          </div>
        </div>
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm transition-colors">
          <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-1">Total de SKUs</p>
          <h3 className="text-2xl font-bold dark:text-white">{products.length}</h3>
          <div className="mt-4 flex items-center gap-2 text-gray-400 dark:text-gray-500 text-xs font-bold">
            <Package size={14} />
            <span>Itens cadastrados</span>
          </div>
        </div>
      </div>

      {/* Gráfico de Evolução Mensal */}
      {!isColaborador && (
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm transition-colors">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-2">
              <Calendar className="text-black dark:text-white" size={20} />
              <h3 className="font-bold text-lg dark:text-white">Evolução do Lucro</h3>
            </div>
            <div className="flex bg-gray-100 dark:bg-zinc-800 p-1 rounded-xl">
              <button 
                onClick={() => setEvolutionPeriod('day')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${evolutionPeriod === 'day' ? 'bg-white dark:bg-zinc-700 text-black dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
              >
                Dia
              </button>
              <button 
                onClick={() => setEvolutionPeriod('week')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${evolutionPeriod === 'week' ? 'bg-white dark:bg-zinc-700 text-black dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
              >
                Sem
              </button>
              <button 
                onClick={() => setEvolutionPeriod('month')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${evolutionPeriod === 'month' ? 'bg-white dark:bg-zinc-700 text-black dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
              >
                Mês
              </button>
              <button 
                onClick={() => setEvolutionPeriod('quarter')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${evolutionPeriod === 'quarter' ? 'bg-white dark:bg-zinc-700 text-black dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
              >
                Trim
              </button>
            </div>
          </div>
          
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={formattedMonthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? "#27272a" : "#f3f4f6"} />
                <XAxis 
                  dataKey="displayMonth" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: '#9ca3af' }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: '#9ca3af' }}
                  tickFormatter={(value) => `R$ ${value}`}
                />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '12px', 
                    border: 'none', 
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                    fontSize: '14px',
                    backgroundColor: darkMode ? '#18181b' : '#ffffff',
                    color: darkMode ? '#ffffff' : '#000000'
                  }}
                  itemStyle={{ color: '#10b981' }}
                  formatter={(value: number) => [formatBRL(value), 'Lucro']}
                  labelStyle={{ fontWeight: 'bold', marginBottom: '4px', color: darkMode ? '#ffffff' : '#000000' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="profit" 
                  stroke="#10b981" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorProfit)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {lowStockProducts.length > 0 && (
        <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 rounded-2xl p-6 transition-colors">
          <div className="flex items-center gap-2 mb-4 text-rose-800 dark:text-rose-400">
            <AlertTriangle size={20} />
            <h3 className="font-bold">Alertas de Reposição</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {lowStockProducts.map(p => (
              <div key={p.id} className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-rose-200 dark:border-rose-500/30 flex justify-between items-center transition-colors">
                <div>
                  <p className="font-bold text-sm dark:text-white">{p.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">SKU: {p.sku}</p>
                </div>
                <div className="text-right">
                  <p className="text-rose-600 dark:text-rose-400 font-bold text-sm">{p.current_stock} un</p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">Mín: {p.min_stock}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
