import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell 
} from 'recharts';
import { ProductStat, User } from '../types';
import { TrendingUp, DollarSign, Package, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatBRL } from '../utils/format';
import { PeriodClosingReport } from './PeriodClosingReport';

interface InformativoProps {
  productStats: ProductStat[];
  user: User | null;
  darkMode: boolean;
}

export const Informativo: React.FC<InformativoProps> = ({ productStats, user, darkMode }) => {
  const [currentPage, setCurrentPage] = React.useState(1);
  const [itemsPerPage, setItemsPerPage] = React.useState(10);
  const [performanceItemsCount, setPerformanceItemsCount] = React.useState<4 | 10>(4);
  const chartData = productStats.slice(0, 5).map(stat => ({
    name: stat.name,
    profit: stat.profit
  }));

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

  // Lógica de Paginação
  const totalPages = Math.ceil(productStats.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = productStats.slice(startIndex, startIndex + itemsPerPage);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  React.useEffect(() => {
    setCurrentPage(1);
  }, [itemsPerPage]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Lucro por Produto */}
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm transition-colors">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="text-emerald-500" size={20} />
            <h3 className="font-bold text-lg dark:text-white">Top 5 Produtos por Lucro</h3>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? "#27272a" : "#f3f4f6"} />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: '#9ca3af' }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: '#9ca3af' }}
                  tickFormatter={(value) => `R$ ${value}`}
                />
                <Tooltip 
                  cursor={{ fill: darkMode ? 'rgba(255, 255, 255, 0.05)' : '#f9fafb' }}
                  contentStyle={{ 
                    borderRadius: '12px', 
                    border: 'none', 
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                    fontSize: '14px',
                    backgroundColor: darkMode ? '#18181b' : '#ffffff',
                  }}
                  formatter={(value: number) => [formatBRL(value), 'Lucro']}
                  labelStyle={{ fontWeight: 'bold', color: darkMode ? '#ffffff' : '#000000' }}
                />
                <Bar dataKey="profit" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Resumo de Vendas */}
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm transition-colors">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Package className="text-blue-500" size={20} />
              <h3 className="font-bold text-lg dark:text-white">Resumo de Performance</h3>
            </div>
            <div className="flex bg-gray-100 dark:bg-zinc-800 p-1 rounded-lg">
              <button onClick={() => setPerformanceItemsCount(4)} className={`px-2 py-1 text-xs font-bold rounded-md transition-all ${performanceItemsCount === 4 ? 'bg-white dark:bg-zinc-700 shadow-sm text-gray-800 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>Top 4</button>
              <button onClick={() => setPerformanceItemsCount(10)} className={`px-2 py-1 text-xs font-bold rounded-md transition-all ${performanceItemsCount === 10 ? 'bg-white dark:bg-zinc-700 shadow-sm text-gray-800 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>Top 10</button>
            </div>
          </div>
          <div className="space-y-4">
            {productStats.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">Nenhuma venda registrada ainda.</p>
            ) : (
              productStats
                .slice(0, performanceItemsCount)
                .map((stat, index) => (
                <div key={stat.sku} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-zinc-800/50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white dark:bg-zinc-700 rounded-lg flex items-center justify-center font-bold text-xs shadow-sm text-gray-700 dark:text-gray-300">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-bold text-sm text-gray-800 dark:text-white">{stat.name}</p>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">ID: {stat.sku}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-emerald-600 font-bold text-sm">
                      {formatBRL(stat.profit)}
                    </p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                      {stat.total_sold} unidades vendidas
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Tabela Detalhada de Lucratividade */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm overflow-hidden transition-colors">
        <div className="p-6 border-b border-gray-50 dark:border-zinc-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-2">
            <DollarSign className="text-amber-500" size={20} />
            <h3 className="font-bold text-lg dark:text-white">Detalhamento de Lucratividade</h3>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-center">
            <label htmlFor="itemsPerPageInfo" className="text-xs text-gray-500 dark:text-gray-400">Itens por pág:</label>
            <select
                id="itemsPerPageInfo"
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="bg-gray-50 dark:bg-zinc-800 border-none rounded-md text-xs font-bold focus:ring-2 focus:ring-black/5 dark:focus:ring-white/5 outline-none py-1"
            >
                <option value={4}>4</option>
                <option value={10}>10</option>
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 dark:bg-zinc-800/50 text-[11px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-bold">
                <th className="px-6 py-4">Produto</th>
                <th className="px-6 py-4">ID</th>
                <th className="px-6 py-4 text-center">Qtd Vendida</th>
                <th className="px-6 py-4 text-right">Valor de Custo</th>
                <th className="px-6 py-4 text-right">Valor Vendido</th>
                <th className="px-6 py-4 text-right">Lucro Total</th>
                <th className="px-6 py-4 text-right">Lucro Médio/Un</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-zinc-800">
              {currentItems.map(stat => (
                <tr key={stat.sku} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-bold text-sm text-gray-900 dark:text-white">{stat.name}</p>
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-500 dark:text-gray-400 font-mono">{stat.sku}</td>
                  <td className="px-6 py-4 text-center text-sm font-medium text-gray-700 dark:text-gray-300">
                    {stat.total_sold}
                  </td>
                  <td className="px-6 py-4 text-right font-medium text-sm text-gray-500 dark:text-gray-400">
                    {formatBRL((stat as any).totalCost || 0)}
                  </td>
                  <td className="px-6 py-4 text-right font-medium text-sm text-gray-700 dark:text-gray-300">
                    {formatBRL((stat as any).totalRevenue || 0)}
                  </td>
                  <td className={`px-6 py-4 text-right font-bold text-sm ${stat.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {formatBRL(stat.profit)}
                  </td>
                  <td className={`px-6 py-4 text-right text-xs font-medium ${stat.total_sold > 0 && (stat.profit / stat.total_sold) < 0 ? 'text-rose-600' : 'text-gray-500 dark:text-gray-400'}`}>
                    {stat.total_sold > 0 ? formatBRL(stat.profit / stat.total_sold) : 'R$ 0,00'}
                  </td>
                </tr>
              ))}
              {currentItems.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-400 dark:text-gray-500 text-sm">
                    Nenhum dado disponível para exibição.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {/* Controles de Paginação */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-50 dark:border-zinc-800 flex items-center justify-between">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {startIndex + 1}-{Math.min(startIndex + itemsPerPage, productStats.length)} de {productStats.length}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed text-gray-600 dark:text-gray-400"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed text-gray-600 dark:text-gray-400"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
