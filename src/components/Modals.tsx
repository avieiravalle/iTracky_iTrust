import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Product } from '../types';

interface ModalsProps {
  showAddProduct: boolean;
  setShowAddProduct: (show: boolean) => void;
  showTransaction: { type: 'ENTRY' | 'EXIT', productId?: number } | null;
  setShowTransaction: (val: { type: 'ENTRY' | 'EXIT', productId?: number } | null) => void;
  products: Product[];
  onAddProduct: (e: React.FormEvent<HTMLFormElement>) => void;
  onTransaction: (e: React.FormEvent<HTMLFormElement>) => void;
}

export const Modals: React.FC<ModalsProps> = ({
  showAddProduct,
  setShowAddProduct,
  showTransaction,
  setShowTransaction,
  products,
  onAddProduct,
  onTransaction
}) => {
  return (
    <AnimatePresence>
      {showAddProduct && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4">
          <motion.div 
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-t-[2.5rem] md:rounded-3xl p-8 shadow-2xl transition-colors"
          >
            <h3 className="text-xl font-bold mb-6 dark:text-white">Cadastrar Novo Produto</h3>
            <form onSubmit={onAddProduct} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-2">Nome do Produto</label>
                <input name="name" required className="w-full px-4 py-3 bg-gray-50 dark:bg-zinc-800 rounded-xl border-none focus:ring-2 focus:ring-black/5 dark:focus:ring-white/5 outline-none dark:text-white" placeholder="Ex: Monitor Dell 24" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-2">SKU / Código</label>
                <input name="sku" required className="w-full px-4 py-3 bg-gray-50 dark:bg-zinc-800 rounded-xl border-none focus:ring-2 focus:ring-black/5 dark:focus:ring-white/5 outline-none dark:text-white" placeholder="Ex: MON-DELL-001" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-2">Estoque Mínimo (Alerta)</label>
                <input name="min_stock" type="number" defaultValue={5} className="w-full px-4 py-3 bg-gray-50 dark:bg-zinc-800 rounded-xl border-none focus:ring-2 focus:ring-black/5 dark:focus:ring-white/5 outline-none dark:text-white" />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowAddProduct(false)} className="flex-1 px-4 py-3 rounded-xl font-bold text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">Cancelar</button>
                <button type="submit" className="flex-1 px-4 py-3 bg-black dark:bg-white text-white dark:text-black rounded-xl font-bold hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors shadow-lg shadow-black/10">Salvar</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {showTransaction && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4">
          <motion.div 
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-t-[2.5rem] md:rounded-3xl p-8 shadow-2xl transition-colors"
          >
            <h3 className="text-xl font-bold mb-6 dark:text-white">
              Registrar {showTransaction.type === 'ENTRY' ? 'Entrada' : 'Saída'}
            </h3>
            <form onSubmit={onTransaction} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-2">Produto</label>
                <select name="product_id" required className="w-full px-4 py-3 bg-gray-50 dark:bg-zinc-800 rounded-xl border-none focus:ring-2 focus:ring-black/5 dark:focus:ring-white/5 outline-none appearance-none dark:text-white">
                  <option value="">Selecione um produto...</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} (SKU: {p.sku})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-2">Quantidade</label>
                  <input name="quantity" type="number" required min="1" className="w-full px-4 py-3 bg-gray-50 dark:bg-zinc-800 rounded-xl border-none focus:ring-2 focus:ring-black/5 dark:focus:ring-white/5 outline-none dark:text-white" placeholder="0" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-2">
                    {showTransaction.type === 'ENTRY' ? 'Custo (R$)' : 'Preço (R$)'}
                  </label>
                  <input name="unit_cost" type="number" step="0.01" required className="w-full px-4 py-3 bg-gray-50 dark:bg-zinc-800 rounded-xl border-none focus:ring-2 focus:ring-black/5 dark:focus:ring-white/5 outline-none dark:text-white" placeholder="0,00" />
                </div>
              </div>

              {showTransaction.type === 'ENTRY' && (
                <div>
                  <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-2">Data de Validade (Opcional)</label>
                  <input name="expiry_date" type="date" className="w-full px-4 py-3 bg-gray-50 dark:bg-zinc-800 rounded-xl border-none focus:ring-2 focus:ring-black/5 dark:focus:ring-white/5 outline-none dark:text-white" />
                </div>
              )}

              {showTransaction.type === 'EXIT' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-2">Status</label>
                    <select name="status" required className="w-full px-4 py-3 bg-gray-50 dark:bg-zinc-800 rounded-xl border-none focus:ring-2 focus:ring-black/5 dark:focus:ring-white/5 outline-none appearance-none dark:text-white">
                      <option value="PAID">Pago</option>
                      <option value="PENDING">A Receber</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-2">Cliente</label>
                    <input name="client_name" className="w-full px-4 py-3 bg-gray-50 dark:bg-zinc-800 rounded-xl border-none focus:ring-2 focus:ring-black/5 dark:focus:ring-white/5 outline-none dark:text-white" placeholder="Opcional" />
                  </div>
                </div>
              )}
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowTransaction(null)} className="flex-1 px-4 py-3 rounded-xl font-bold text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">Cancelar</button>
                <button 
                  type="submit" 
                  className={`flex-1 px-4 py-3 text-white rounded-xl font-bold transition-colors shadow-lg ${showTransaction.type === 'ENTRY' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/10' : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/10'}`}
                >
                  Confirmar
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
