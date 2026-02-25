import React, { useState, useEffect } from 'react';
import { Search, Loader2, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Product, User } from '../types';
import { formatBRL } from '../utils/format';

interface InventoryProps {
  products: Product[];
  user: User | null;
  onUpdateSalePrice: (productId: number, newPrice: number) => Promise<void>;
  onDeleteProduct: (product: Product) => void;
}

export const Inventory: React.FC<InventoryProps> = ({ products, user, onUpdateSalePrice, onDeleteProduct }) => {
  const isColaborador = user?.role === 'colaborador';
  const [editingPrice, setEditingPrice] = useState<Record<number, string>>({});
  const [savingPrice, setSavingPrice] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const handlePriceChange = (productId: number, value: string) => {
    setEditingPrice(prev => ({ ...prev, [productId]: value }));
  };

  const handleSavePrice = async (productId: number) => {
    const newPriceStr = editingPrice[productId];
    const originalProduct = products.find(p => p.id === productId);

    // Se não há mudança ou o campo de edição não existe para este ID, não faz nada.
    if (newPriceStr === undefined || !originalProduct) return;

    const newPrice = parseFloat(newPriceStr);

    // Se o preço for inválido ou não mudou, reverte para o valor original e limpa o estado de edição.
    if (isNaN(newPrice) || newPrice === originalProduct.sale_price) {
      const { [productId]: _, ...rest } = editingPrice;
      setEditingPrice(rest);
      return;
    }

    setSavingPrice(productId);
    await onUpdateSalePrice(productId, newPrice);
    setSavingPrice(null);
    
    // Limpa o estado de edição para este ID após salvar.
    const { [productId]: _, ...rest } = editingPrice;
    setEditingPrice(rest);
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Lógica de Paginação
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentProducts = filteredProducts.slice(startIndex, startIndex + itemsPerPage);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm overflow-hidden transition-colors">
      <div className="p-4 md:p-6 border-bottom border-gray-50 dark:border-zinc-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por nome ou SKU..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
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
              {!isColaborador && <th className="px-6 py-4">Preço Venda</th>}
              {!isColaborador && <th className="px-6 py-4">Valor Total</th>}
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-zinc-800">
            {currentProducts.map(p => (
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
                  <td className="px-6 py-2">
                    <div className="relative flex items-center">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">R$</span>
                      <input
                        type="number"
                        step="0.01"
                        disabled={isColaborador}
                        value={editingPrice[p.id] ?? p.sale_price}
                        onChange={(e) => handlePriceChange(p.id, e.target.value)}
                        onBlur={() => handleSavePrice(p.id)}
                        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                        className="w-28 bg-gray-50 dark:bg-zinc-800 border border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-zinc-900 rounded-lg py-1.5 pl-8 pr-2 text-right font-medium text-sm outline-none transition-all disabled:bg-transparent disabled:border-transparent disabled:cursor-not-allowed"
                      />
                      {savingPrice === p.id && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-blue-500" />}
                    </div>
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
                <td className="px-6 py-4 text-right">
                  {!isColaborador && (
                    <button 
                      onClick={() => onDeleteProduct(p)}
                      className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors"
                      title="Excluir Produto"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card Layout */}
      <div className="md:hidden divide-y divide-gray-50 dark:divide-zinc-800">
        {currentProducts.map(p => (
          <div key={p.id} className="p-4 space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-bold text-sm text-gray-900 dark:text-white">{p.name}</p>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 font-mono uppercase tracking-wider">{p.sku}</p>
              </div>
              <div className="flex items-center gap-2">
                {p.current_stock <= p.min_stock ? (
                  <span className="px-2 py-1 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[9px] font-bold rounded-lg uppercase">Reposição</span>
                ) : (
                  <span className="px-2 py-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9px] font-bold rounded-lg uppercase">OK</span>
                )}
                {!isColaborador && (
                  <button 
                    onClick={() => onDeleteProduct(p)}
                    className="p-1 text-gray-400 hover:text-rose-600"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
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
                  <p className="text-[9px] text-gray-400 dark:text-gray-500 uppercase font-bold mb-1">Preço Venda</p>
                  <div className="relative">
                    <span className="absolute left-1 top-1/2 -translate-y-1/2 text-gray-400 text-xs">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      disabled={isColaborador}
                      value={editingPrice[p.id] ?? p.sale_price}
                      onChange={(e) => handlePriceChange(p.id, e.target.value)}
                      onBlur={() => handleSavePrice(p.id)}
                      className="w-full bg-transparent text-right font-bold text-xs text-gray-900 dark:text-white outline-none pl-5 pr-1"
                    />
                  </div>
                </div>
              )}
              {!isColaborador && (
                <div className="bg-gray-50 dark:bg-zinc-800/50 p-2 rounded-xl">
                  <p className="text-[9px] text-gray-400 dark:text-gray-500 uppercase font-bold mb-1">Custo Médio</p>
                  <p className="text-xs font-bold text-gray-900 dark:text-white">{formatBRL(p.average_cost || 0)}</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="p-4 border-t border-gray-50 dark:border-zinc-800 flex items-center justify-between bg-white dark:bg-zinc-900">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredProducts.length)} de {filteredProducts.length}
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
  );
};
