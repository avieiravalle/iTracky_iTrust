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
import { ProductStat } from '../types';
import { TrendingUp, DollarSign, Package } from 'lucide-react';
import { formatBRL } from '../utils/format';

interface InformativoProps {
  productStats: ProductStat[];
}

export const Informativo: React.FC<InformativoProps> = ({ productStats }) => {
  const chartData = productStats.slice(0, 5).map(stat => ({
    name: stat.name,
    profit: stat.profit
  }));

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Lucro por Produto */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="text-emerald-500" size={20} />
            <h3 className="font-bold text-lg">Top 5 Produtos por Lucro</h3>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
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
                  cursor={{ fill: '#f9fafb' }}
                  contentStyle={{ 
                    borderRadius: '12px', 
                    border: 'none', 
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                    fontSize: '14px'
                  }}
                  formatter={(value: number) => [formatBRL(value), 'Lucro']}
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
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <Package className="text-blue-500" size={20} />
            <h3 className="font-bold text-lg">Resumo de Performance</h3>
          </div>
          <div className="space-y-4">
            {productStats.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Nenhuma venda registrada ainda.</p>
            ) : (
              productStats.map((stat, index) => (
                <div key={stat.sku} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center font-bold text-xs shadow-sm">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-bold text-sm">{stat.name}</p>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wider">{stat.sku}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-emerald-600 font-bold text-sm">
                      {formatBRL(stat.profit)}
                    </p>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider">
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
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-50">
          <div className="flex items-center gap-2">
            <DollarSign className="text-amber-500" size={20} />
            <h3 className="font-bold text-lg">Detalhamento de Lucratividade</h3>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 text-[11px] uppercase tracking-wider text-gray-400 font-bold">
                <th className="px-6 py-4">Produto</th>
                <th className="px-6 py-4">SKU</th>
                <th className="px-6 py-4 text-center">Qtd Vendida</th>
                <th className="px-6 py-4 text-right">Lucro Total</th>
                <th className="px-6 py-4 text-right">Lucro Médio/Un</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {productStats.map(stat => (
                <tr key={stat.sku} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-bold text-sm text-gray-900">{stat.name}</p>
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-500 font-mono">{stat.sku}</td>
                  <td className="px-6 py-4 text-center text-sm font-medium text-gray-700">
                    {stat.total_sold}
                  </td>
                  <td className={`px-6 py-4 text-right font-bold text-sm ${stat.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {formatBRL(stat.profit)}
                  </td>
                  <td className={`px-6 py-4 text-right text-xs font-medium ${stat.total_sold > 0 && (stat.profit / stat.total_sold) < 0 ? 'text-rose-600' : 'text-gray-500'}`}>
                    {stat.total_sold > 0 ? formatBRL(stat.profit / stat.total_sold) : 'R$ 0,00'}
                  </td>
                </tr>
              ))}
              {productStats.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400 text-sm">
                    Nenhum dado disponível para exibição.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
