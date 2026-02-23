import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Product } from '../types';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

interface ModalsProps {
  showAddProduct: boolean;
  setShowAddProduct: (show: boolean) => void;
  showTransaction: { type: 'ENTRY' | 'EXIT', productId?: number } | null;
  setShowTransaction: (val: { type: 'ENTRY' | 'EXIT', productId?: number } | null) => void;
  products: Product[];
  onAddProduct: (data: { name: string, sku: string, min_stock: number }) => Promise<void> | void;
  onTransaction: (e: React.FormEvent<HTMLFormElement>) => Promise<void> | void;
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
  const [sku, setSku] = useState('');
  const [skuError, setSkuError] = useState('');
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState('PAID');

  useEffect(() => {
    if (!showAddProduct) {
      setSku('');
      setSkuError('');
      setName('');
      setNameError('');
    }
  }, [showAddProduct]);

  useEffect(() => {
    if (showTransaction) {
      setTransactionStatus('PAID');
    }
  }, [showTransaction]);

  const handleSkuChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSku(val);
    const exists = products.some(p => p.sku.toLowerCase() === val.toLowerCase());
    setSkuError(exists ? 'Este SKU já está em uso.' : '');
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    const exists = products.some(p => p.name.toLowerCase() === val.toLowerCase());
    setNameError(exists ? 'Este nome de produto já existe.' : '');
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsSubmitting(true);
    try {
      const formData = new FormData(e.currentTarget);
      await onAddProduct({
        name: formData.get('name') as string,
        sku: formData.get('sku') as string,
        min_stock: Number(formData.get('min_stock')),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTransactionSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsSubmitting(true);
    try {
      await onTransaction(e);
    } finally {
      setIsSubmitting(false);
    }
  };

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
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-2">Nome do Produto</label>
                <div className="relative">
                  <input name="name" data-testid="input-product-name" required value={name} onChange={handleNameChange} className={`w-full px-4 py-3 bg-gray-50 dark:bg-zinc-800 rounded-xl border-none focus:ring-2 outline-none dark:text-white ${nameError ? 'focus:ring-rose-500/50' : 'focus:ring-black/5 dark:focus:ring-white/5'}`} placeholder="Ex: Monitor Dell 24" />
                  {name && !nameError && <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500 w-5 h-5" />}
                </div>
                {nameError && (
                  <div className="flex items-center gap-1 mt-1 text-rose-500 text-xs font-bold">
                    <AlertCircle size={12} />
                    <span>{nameError}</span>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-2">SKU / Código</label>
                <div className="relative">
                  <input name="sku" data-testid="input-product-sku" required value={sku} onChange={handleSkuChange} className={`w-full px-4 py-3 bg-gray-50 dark:bg-zinc-800 rounded-xl border-none focus:ring-2 outline-none dark:text-white ${skuError ? 'focus:ring-rose-500/50' : 'focus:ring-black/5 dark:focus:ring-white/5'}`} placeholder="Ex: MON-DELL-001" />
                  {sku && !skuError && <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500 w-5 h-5" />}
                </div>
                {skuError && (
                  <div className="flex items-center gap-1 mt-1 text-rose-500 text-xs font-bold">
                    <AlertCircle size={12} />
                    <span>{skuError}</span>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-2">Estoque Mínimo (Alerta)</label>
                <input name="min_stock" data-testid="input-product-min-stock" type="number" defaultValue={5} className="w-full px-4 py-3 bg-gray-50 dark:bg-zinc-800 rounded-xl border-none focus:ring-2 focus:ring-black/5 dark:focus:ring-white/5 outline-none dark:text-white" />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" data-testid="btn-cancel-product" onClick={() => setShowAddProduct(false)} className="flex-1 px-4 py-3 rounded-xl font-bold text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">Cancelar</button>
                <button type="submit" disabled={!!skuError || !!nameError || isSubmitting} data-testid="btn-save-product" className="flex-1 px-4 py-3 bg-black dark:bg-white text-white dark:text-black rounded-xl font-bold hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors shadow-lg shadow-black/10 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center">
                  {isSubmitting ? <Loader2 className="animate-spin w-5 h-5" /> : 'Salvar'}
                </button>
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
            <form onSubmit={handleTransactionSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-2">Produto</label>
                <select name="product_id" data-testid="select-product" required className="w-full px-4 py-3 bg-gray-50 dark:bg-zinc-800 rounded-xl border-none focus:ring-2 focus:ring-black/5 dark:focus:ring-white/5 outline-none appearance-none dark:text-white">
                  <option value="">Selecione um produto...</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} (SKU: {p.sku})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-2">Quantidade</label>
                  <input name="quantity" data-testid="input-quantity" type="number" required min="1" className="w-full px-4 py-3 bg-gray-50 dark:bg-zinc-800 rounded-xl border-none focus:ring-2 focus:ring-black/5 dark:focus:ring-white/5 outline-none dark:text-white" placeholder="0" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-2">
                    {showTransaction.type === 'ENTRY' ? 'Custo (R$)' : 'Preço (R$)'}
                  </label>
                  <input name="unit_cost" data-testid="input-unit-cost" type="number" step="0.01" required className="w-full px-4 py-3 bg-gray-50 dark:bg-zinc-800 rounded-xl border-none focus:ring-2 focus:ring-black/5 dark:focus:ring-white/5 outline-none dark:text-white" placeholder="0,00" />
                </div>
              </div>

              {showTransaction.type === 'ENTRY' && (
                <div>
                  <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-2">Data de Validade (Opcional)</label>
                  <input name="expiry_date" data-testid="input-expiry-date" type="date" className="w-full px-4 py-3 bg-gray-50 dark:bg-zinc-800 rounded-xl border-none focus:ring-2 focus:ring-black/5 dark:focus:ring-white/5 outline-none dark:text-white" />
                </div>
              )}

              {showTransaction.type === 'EXIT' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-2">Status</label>
                    <select name="status" data-testid="select-status" required value={transactionStatus} onChange={(e) => setTransactionStatus(e.target.value)} className="w-full px-4 py-3 bg-gray-50 dark:bg-zinc-800 rounded-xl border-none focus:ring-2 focus:ring-black/5 dark:focus:ring-white/5 outline-none appearance-none dark:text-white">
                      <option value="PAID">Pago</option>
                      <option value="PENDING">A Receber</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-2">Cliente</label>
                    <input 
                      name="client_name" 
                      data-testid="input-client-name" 
                      required={transactionStatus === 'PENDING'}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-zinc-800 rounded-xl border-none focus:ring-2 focus:ring-black/5 dark:focus:ring-white/5 outline-none dark:text-white" 
                      placeholder={transactionStatus === 'PENDING' ? "Nome do Cliente (Obrigatório)" : "Opcional"} 
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button type="button" data-testid="btn-cancel-transaction" onClick={() => setShowTransaction(null)} className="flex-1 px-4 py-3 rounded-xl font-bold text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">Cancelar</button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  data-testid="btn-confirm-transaction"
                  className={`flex-1 px-4 py-3 text-white rounded-xl font-bold transition-colors shadow-lg ${showTransaction.type === 'ENTRY' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/10' : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/10'} disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center`}
                >
                  {isSubmitting ? <Loader2 className="animate-spin w-5 h-5" /> : 'Confirmar'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
