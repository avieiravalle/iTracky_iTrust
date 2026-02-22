import React from 'react';
import { Search } from 'lucide-react';
import { Product, User } from '../types';
import { formatBRL } from '../utils/format';

interface InventoryProps {
  products: Product[];
  user: User | null;
}

export const Inventory: React.FC<InventoryProps> = ({ products, user }) => {
  const isColaborador = user?.role === 'colaborador';
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm overflow-hidden transition-colors">
      <div className="p-4 md:p-6 border-bottom border-gray-50 dark:border-zinc-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por nome ou SKU..." 
            className="pl-10 pr-4 py-2 bg-gray-50 dark:bg-zinc-800 border-none rounded-xl text-sm w-full focus:ring-2 focus:ring-black/5 dark:focus:ring-white/5 outline-none dark:text-white dark:placeholder-gray-500"
          />
        </div>
      </div>
      <div className="overflow-x-auto hidden md:block">
        <table className="w-full text-left border-collapse min-w-full">
          <thead>
            <tr className="bg-gray-50/50 dark:bg-zinc-800/50 text-[11px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-bold">
              <th className="px-6 py-4">Produto</th>
              <th className="px-6 py-4">SKU</th>
              <th className="px-6 py-4 text-center">Validade</th>
              <th className="px-6 py-4">Estoque Atual</th>
              {!isColaborador && <th className="px-6 py-4">Custo Médio</th>}
              {!isColaborador && <th className="px-6 py-4">Valor Total</th>}
              <th className="px-6 py-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-zinc-800">
            {products.map(p => (
              <tr key={p.id} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/50 transition-colors group">
                <td className="px-6 py-4">
                  <p className="font-bold text-sm text-gray-900 dark:text-white">{p.name}</p>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 font-mono">{p.sku}</td>
                <td className="px-6 py-4 text-center">
                  {p.expiry_date ? (
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                      {new Date(p.expiry_date).toLocaleDateString('pt-BR')}
                    </span>
                  ) : (
                    <span className="text-gray-300 dark:text-zinc-700">-</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <span className={`font-bold text-sm ${p.current_stock <= p.min_stock ? 'text-rose-600 dark:text-rose-400' : 'text-gray-900 dark:text-white'}`}>
                    {p.current_stock} un
                  </span>
                </td>
                {!isColaborador && (
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                    {formatBRL(p.average_cost || 0)}
                  </td>
                )}
                {!isColaborador && (
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                    {formatBRL((p.current_stock || 0) * (p.average_cost || 0))}
                  </td>
                )}
                <td className="px-6 py-4">
                  {p.current_stock <= p.min_stock ? (
                    <span className="px-2 py-1 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[10px] font-bold rounded-lg uppercase whitespace-nowrap">Reposição</span>
                  ) : (
                    <span className="px-2 py-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold rounded-lg uppercase whitespace-nowrap">OK</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card Layout */}
      <div className="md:hidden divide-y divide-gray-50 dark:divide-zinc-800">
        {products.map(p => (
          <div key={p.id} className="p-4 space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-bold text-sm text-gray-900 dark:text-white">{p.name}</p>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 font-mono uppercase tracking-wider">{p.sku}</p>
              </div>
              {p.current_stock <= p.min_stock ? (
                <span className="px-2 py-1 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[9px] font-bold rounded-lg uppercase">Reposição</span>
              ) : (
                <span className="px-2 py-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9px] font-bold rounded-lg uppercase">OK</span>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="bg-gray-50 dark:bg-zinc-800/50 p-2 rounded-xl">
                <p className="text-[9px] text-gray-400 dark:text-gray-500 uppercase font-bold mb-1">Estoque</p>
                <p className={`text-xs font-bold ${p.current_stock <= p.min_stock ? 'text-rose-600' : 'text-gray-900 dark:text-white'}`}>{p.current_stock} un</p>
              </div>
              <div className="bg-gray-50 dark:bg-zinc-800/50 p-2 rounded-xl">
                <p className="text-[9px] text-gray-400 dark:text-gray-500 uppercase font-bold mb-1">Validade</p>
                <p className="text-xs font-bold text-gray-900 dark:text-white">{p.expiry_date ? new Date(p.expiry_date).toLocaleDateString('pt-BR') : '-'}</p>
              </div>
              {!isColaborador && (
                <div className="bg-gray-50 dark:bg-zinc-800/50 p-2 rounded-xl">
                  <p className="text-[9px] text-gray-400 dark:text-gray-500 uppercase font-bold mb-1">Custo Médio</p>
                  <p className="text-xs font-bold text-gray-900 dark:text-white">{formatBRL(p.average_cost || 0)}</p>
                </div>
              )}
              {!isColaborador && (
                <div className="bg-gray-50 dark:bg-zinc-800/50 p-2 rounded-xl">
                  <p className="text-[9px] text-gray-400 dark:text-gray-500 uppercase font-bold mb-1">Total</p>
                  <p className="text-xs font-bold text-gray-900 dark:text-white">{formatBRL((p.current_stock || 0) * (p.average_cost || 0))}</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
