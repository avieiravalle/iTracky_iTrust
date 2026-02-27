import React, { useMemo } from 'react';
import { User, Product, Stats, MonthlyStat } from './src/types';
import { Box, AlertTriangle, TrendingUp, ArrowRight } from 'lucide-react';
import { formatBRL } from './src/utils/format';

interface DashboardProps {
  user: User | null;
  products?: Product[];
  stats?: Stats;
  onViewInventory?: () => void;
}

export function Dashboard({ products = [], stats, onViewInventory }: DashboardProps) {
  // Cálculos para os Cards com useMemo para otimização
  const totalStock = useMemo(() => products.reduce((acc, p) => acc + p.current_stock, 0), [products]);
  const lowStockCount = useMemo(() => products.filter(p => p.current_stock > 0 && p.current_stock <= p.min_stock).length, [products]);
  
  // A ordenação por data de criação seria mais precisa, mas slice(0,5) é um bom placeholder.
  // Se os produtos forem retornados já ordenados do backend, isso funciona bem.
  const recentProducts = useMemo(() => products.slice(0, 5), [products]);

  return (
    <div className="space-y-8 p-4 md:p-8">
      
      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1: Total em Estoque */}
        <div className="bg-white dark:bg-[#1e293b] p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-center gap-4">
          <div className="w-14 h-14 bg-[#1A3A5F] rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-900/20">
            <Box size={28} />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Total em Estoque</p>
            <h3 className="text-2xl font-bold text-[#2D3436] dark:text-white">{totalStock} itens</h3>
          </div>
        </div>

        {/* Card 2: Produtos com Estoque Baixo */}
        <div className="bg-white dark:bg-[#1e293b] p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-center gap-4">
          <div className="w-14 h-14 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center text-amber-600 dark:text-amber-500">
            <AlertTriangle size={28} />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Estoque Baixo</p>
            <h3 className="text-2xl font-bold text-[#2D3436] dark:text-white">{lowStockCount} produtos</h3>
          </div>
        </div>

        {/* Card 3: Vendas do Dia (Simulado com Lucro Realizado para exemplo) */}
        <div className="bg-white dark:bg-[#1e293b] p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-center gap-4">
          <div className="w-14 h-14 bg-[#4CAF50]/10 rounded-xl flex items-center justify-center text-[#4CAF50]">
            <TrendingUp size={28} />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Lucro Realizado</p>
            <h3 className="text-2xl font-bold text-[#2D3436] dark:text-white">{formatBRL(stats?.realized_profit || 0)}</h3>
          </div>
        </div>
      </div>

      {/* Tabela de Inventário Recente (Zebra) */}
      <div className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
          <h3 className="font-bold text-lg text-[#2D3436] dark:text-white">Inventário Recente</h3>
          <button 
            onClick={onViewInventory}
            className="text-[#00D4FF] text-sm font-bold flex items-center gap-1 hover:gap-2 transition-all"
          >
            Ver Tudo <ArrowRight size={16} />
          </button>
        </div>
        <table className="w-full text-left">
          <thead className="bg-[#F4F7F6] dark:bg-[#0f172a] text-gray-500 dark:text-gray-400 text-xs uppercase font-bold">
            <tr>
              <th className="px-6 py-4">Nome do Produto</th>
              <th className="px-6 py-4">SKU</th>
              <th className="px-6 py-4">Quantidade</th>
              <th className="px-6 py-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {recentProducts.map((p, index) => (
              <tr key={p.id} className={index % 2 === 0 ? 'bg-white dark:bg-[#1e293b]' : 'bg-[#F4F7F6]/50 dark:bg-[#0f172a]/50'}>
                <td className="px-6 py-4 font-medium text-[#2D3436] dark:text-white">{p.name}</td>
                <td className="px-6 py-4 text-gray-500 font-mono text-sm">{p.sku}</td>
                <td className="px-6 py-4 font-bold">{p.current_stock}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {p.current_stock <= p.min_stock ? (
                    <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold">Baixo</span>
                  ) : (
                    <span className="px-3 py-1 bg-[#4CAF50]/10 text-[#4CAF50] rounded-full text-xs font-bold">Normal</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Você pode adicionar seus cards de estatísticas aqui */}

      {/* E seus gráficos podem vir depois */}

      <div className="space-y-8">
        {/* Componentes originais do Dashboard ficariam aqui */}
        <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg">
          <p className="text-blue-800">Área de gráficos e estatísticas principais.</p>
        </div>
      </div>
    </div>
  );
}