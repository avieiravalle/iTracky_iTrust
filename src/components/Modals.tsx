import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Product } from '../types';
import { AlertCircle, CheckCircle2, Loader2, ScanBarcode, Camera, X, Search } from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';

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
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const [searchSku, setSearchSku] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [prefilledSku, setPrefilledSku] = useState('');
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const lastScanTimeRef = useRef<number>(0);
  const quantityInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!showAddProduct) {
      if (!prefilledSku) setSku('');
      setSkuError('');
      setName('');
      setNameError('');
    } else if (prefilledSku) {
      setSku(prefilledSku);
      setPrefilledSku('');
    }
  }, [showAddProduct, prefilledSku]);

  useEffect(() => {
    if (showTransaction) {
      setTransactionStatus('PAID');
      setSelectedProductId(showTransaction.productId ? showTransaction.productId.toString() : '');
      setSearchSku('');
      setSearchTerm('');
      setIsScanning(false);
    }
  }, [showTransaction]);

  // Lógica do Scanner de Câmera
  useEffect(() => {
    if (isScanning && showTransaction && !scannerRef.current) {
      const scanner = new Html5QrcodeScanner(
        "reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        /* verbose= */ false
      );
      scannerRef.current = scanner;

      scanner.render(
        (decodedText) => {
          handleProductFound(decodedText);
          scanner.clear();
          setIsScanning(false);
          scannerRef.current = null;
        },
        (error) => {
          // console.warn(error);
        }
      );
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
        scannerRef.current = null;
      }
    };
  }, [isScanning, products, showTransaction]);

  const playBeep = () => {
    try {
      // Cria o contexto de áudio (funciona na maioria dos navegadores modernos)
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContext) {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.type = 'sine'; // Tipo de onda (senoidal = som limpo)
        osc.frequency.value = 1200; // Frequência em Hz (Bip agudo)
        gain.gain.value = 0.1; // Volume (10% para não ser estridente)
        
        osc.start();
        setTimeout(() => {
          osc.stop();
          ctx.close();
        }, 150); // Duração de 150ms
      }
    } catch (e) {
      console.error("Erro ao tocar som de bip", e);
    }
  };

  const handleProductFound = (skuCode: string) => {
    const now = Date.now();
    if (now - lastScanTimeRef.current < 1000) return;
    lastScanTimeRef.current = now;

    playBeep();
    if (navigator.vibrate) navigator.vibrate(200);
    const product = products.find(p => p.sku.toLowerCase() === skuCode.toLowerCase());
    
    if (product) {
      setSelectedProductId(product.id.toString());
      setSearchSku(product.sku);
      setSearchTerm('');
    } else {
      if (showTransaction?.type === 'ENTRY') {
        if (window.confirm(`Produto com SKU "${skuCode}" não encontrado. Deseja cadastrá-lo agora?`)) {
          setPrefilledSku(skuCode);
          setShowTransaction(null);
          setShowAddProduct(true);
        }
      } else {
        alert(`Produto com SKU "${skuCode}" não encontrado no estoque.`);
      }
    }
  };

  // Lógica do Leitor USB (Input de Texto)
  const handleSkuSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchSku(val);
    
    // Tenta encontrar o produto exato enquanto digita (ou quando o leitor USB cola o texto)
    const product = products.find(p => p.sku.toLowerCase() === val.toLowerCase());
    if (product) {
      setSelectedProductId(product.id.toString());
    }
  };

  const handleManualProductSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedProductId(val);
    if (!val) setSearchSku('');
    else {
      const p = products.find(prod => prod.id.toString() === val);
      if (p) setSearchSku(p.sku);
    }
  };

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

  // Filtra os produtos com base no texto digitado (Nome ou SKU)
  const filteredProducts = products.filter(p => 
    searchTerm === '' ||
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
                <input name="min_stock" data-testid="input-product-min-stock" type="number" inputMode="numeric" defaultValue={5} className="w-full px-4 py-3 bg-gray-50 dark:bg-zinc-800 rounded-xl border-none focus:ring-2 focus:ring-black/5 dark:focus:ring-white/5 outline-none dark:text-white" />
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
              
              {/* Área de Scanner */}
              <div className="bg-gray-50 dark:bg-zinc-800 p-4 rounded-xl border border-gray-100 dark:border-zinc-700">
                <div className="flex items-center gap-2 mb-3">
                  <ScanBarcode className="text-blue-500" size={20} />
                  <span className="text-xs font-bold text-gray-500 uppercase">Scanner / Leitor USB</span>
                </div>
                
                {isScanning ? (
                  <div className="relative">
                    <div id="reader" className="w-full rounded-lg overflow-hidden min-h-[300px] bg-black"></div>
                    <button 
                      type="button" 
                      onClick={() => setIsScanning(false)}
                      className="absolute top-2 right-2 bg-white/80 p-1 rounded-full text-gray-600 hover:text-red-500 z-10"
                    >
                      <X size={20} />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={searchSku}
                      onChange={handleSkuSearchChange}
                      onKeyDown={(e) => { if(e.key === 'Enter') { e.preventDefault(); handleProductFound(searchSku); } }}
                      placeholder="Clique aqui para usar o leitor USB..." 
                      className="flex-1 px-3 py-2 bg-white dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-700 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none dark:text-white"
                    />
                    <button 
                      type="button"
                      onClick={() => setIsScanning(true)}
                      className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      title="Abrir Câmera"
                    >
                      <Camera size={20} />
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-2">Buscar Produto</label>
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input 
                    type="text" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && filteredProducts.length > 0) {
                        e.preventDefault(); // Evita enviar o formulário
                        const firstProduct = filteredProducts[0];
                        setSelectedProductId(firstProduct.id.toString());
                        setSearchSku(firstProduct.sku);
                        setSearchTerm(''); // Limpa a busca após selecionar
                        setTimeout(() => {
                          quantityInputRef.current?.focus();
                        }, 10);
                      }
                    }}
                    placeholder="Digite o nome para filtrar a lista..." 
                    className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-zinc-800 rounded-xl border-none focus:ring-2 focus:ring-black/5 dark:focus:ring-white/5 outline-none dark:text-white text-sm"
                    autoFocus
                  />
                </div>

                <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-2">Produto</label>
                <select name="product_id" data-testid="select-product" required value={selectedProductId} onChange={handleManualProductSelect} className="w-full px-4 py-3 bg-gray-50 dark:bg-zinc-800 rounded-xl border-none focus:ring-2 focus:ring-black/5 dark:focus:ring-white/5 outline-none appearance-none dark:text-white">
                  <option value="">Selecione um produto...</option>
                  {filteredProducts.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} (SKU: {p.sku}) {showTransaction.type === 'EXIT' ? `- Est: ${p.current_stock}` : ''}
                    </option>
                  ))}
                </select>
                {searchTerm && filteredProducts.length === 0 && (
                  <p className="text-xs text-rose-500 mt-1 ml-1">Nenhum produto encontrado com "{searchTerm}"</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-2">Quantidade</label>
                  <input ref={quantityInputRef} name="quantity" data-testid="input-quantity" type="number" inputMode="numeric" required min="1" className="w-full px-4 py-3 bg-gray-50 dark:bg-zinc-800 rounded-xl border-none focus:ring-2 focus:ring-black/5 dark:focus:ring-white/5 outline-none dark:text-white" placeholder="0" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-2">
                    {showTransaction.type === 'ENTRY' ? 'Custo (R$)' : 'Preço (R$)'}
                  </label>
                  <input name="unit_cost" data-testid="input-unit-cost" type="number" inputMode="decimal" step="0.01" required className="w-full px-4 py-3 bg-gray-50 dark:bg-zinc-800 rounded-xl border-none focus:ring-2 focus:ring-black/5 dark:focus:ring-white/5 outline-none dark:text-white" placeholder="0,00" />
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
