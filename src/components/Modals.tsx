import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Product, User } from '../types';
import { AlertCircle, CheckCircle2, Loader2, ScanBarcode, Camera, X, Search, FileText, Wand2, Tag, Plus } from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { PeriodClosingReport } from './PeriodClosingReport';
import { useProductLookup } from '../../useProductLookup';

interface ModalsProps {
  showAddProduct: boolean;
  setShowAddProduct: (show: boolean) => void;
  showTransaction: { type: 'ENTRY' | 'EXIT', productId?: number } | null;
  setShowTransaction: (val: { type: 'ENTRY' | 'EXIT', productId?: number } | null) => void;
  showReportModal: boolean;
  setShowReportModal: (show: boolean) => void;
  products: Product[];
  onAddProduct: (data: { name: string, sku: string, min_stock: number, brand?: string }) => Promise<void> | void;
  onTransaction: (e: React.FormEvent<HTMLFormElement>) => Promise<void> | void;
  user: User | null;
}

export const Modals: React.FC<ModalsProps> = ({
  showAddProduct,
  setShowAddProduct,
  showTransaction,
  setShowTransaction,
  showReportModal,
  setShowReportModal,
  products,
  onAddProduct,
  onTransaction,
  user,
}) => {
  const [sku, setSku] = useState('');
  const [skuError, setSkuError] = useState('');
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState('');
  const [brand, setBrand] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState('PAID');
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);
  const [suggestedSalePrice, setSuggestedSalePrice] = useState('');
  const [exitSalePrice, setExitSalePrice] = useState('');
  const [searchSku, setSearchSku] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [prefilledSku, setPrefilledSku] = useState('');
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const lastScanTimeRef = useRef<number>(0);
  const quantityInputRef = useRef<HTMLInputElement>(null);
  const minStockInputRef = useRef<HTMLInputElement>(null);
  const scannerInputRef = useRef<HTMLInputElement>(null);
  const { lookupProduct, loading: lookupLoading } = useProductLookup();
  const [itemsAddedCount, setItemsAddedCount] = useState(0);

  useEffect(() => {
    if (!showAddProduct) {
      if (!prefilledSku) setSku('');
      setSkuError('');
      setName('');
      setNameError('');
      setBrand('');
    } else if (prefilledSku) {
      setSku(prefilledSku);
      
      // Busca automática ao abrir modal com SKU preenchido (via Câmera)
      const token = localStorage.getItem('token') || localStorage.getItem('authToken') || '';
      lookupProduct(prefilledSku, token).then(data => {
        if (data) {
          setName(data.name);
          setBrand(data.brand || '');
          setTimeout(() => minStockInputRef.current?.focus(), 100);
        }
      });

      setPrefilledSku('');
    }
  }, [showAddProduct, prefilledSku]);

  useEffect(() => {
    if (showTransaction) {
      setTransactionStatus('PAID');
      setItemsAddedCount(0);
      setSelectedProductId(showTransaction.productId ? showTransaction.productId.toString() : '');
      setSearchSku('');
      setSearchTerm('');
      setIsScanning(false);
      setIsCreatingProduct(false);
      // Limpar preços ao abrir modal
      setSuggestedSalePrice('');
      setExitSalePrice('');

      if (showTransaction.productId) {
        const product = products.find(p => p.id === showTransaction.productId);
        if (product) {
          if (showTransaction.type === 'ENTRY') {
            setSuggestedSalePrice(product.sale_price > 0 ? product.sale_price.toString() : '');
          }
        }
      }

      // Garante o foco no campo de scanner ao abrir a janela
      setTimeout(() => {
        scannerInputRef.current?.focus();
      }, 100);
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
        // Modo Unificado: Ativa criação de produto inline
        setIsCreatingProduct(true);
        setSku(skuCode);
        setSearchSku(skuCode);
        setSelectedProductId(''); // Limpa seleção para indicar novo
        
        // Tenta buscar dados online para o novo SKU
        const token = localStorage.getItem('token') || localStorage.getItem('authToken') || '';
        lookupProduct(skuCode, token).then(data => {
          if (data) {
            setName(data.name);
            setBrand(data.brand || '');
          }
        });
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
      setIsCreatingProduct(false);
    }
  };

  const handleManualProductSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedProductId(val);
    if (!val) setSearchSku('');
    else {
      const p = products.find(prod => prod.id.toString() === val);
      if (p) setSearchSku(p.sku);
      setIsCreatingProduct(false);
      // Preencher preços ao selecionar manualmente
      if (p && showTransaction?.type === 'ENTRY') {
        setSuggestedSalePrice(p.sale_price > 0 ? p.sale_price.toString() : '');
      } else if (p && showTransaction?.type === 'EXIT') {
        const defaultPrice = p.sale_price > 0 ? p.sale_price : (p.average_cost * 1.5);
        setExitSalePrice(defaultPrice > 0 ? defaultPrice.toFixed(2) : '');
      }
    }
  };

  const handleSkuChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSku(val);
    const exists = products.some(p => p.sku.toLowerCase() === val.toLowerCase());
    setSkuError(exists ? 'Este ID já está em uso.' : '');
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    const exists = products.some(p => p.name.toLowerCase() === val.toLowerCase());
    setNameError(exists ? 'Este nome de produto já existe.' : '');
  };

  const generateRandomId = () => {
    const randomId = Math.random().toString(36).substring(2, 10).toUpperCase();
    setSku(randomId);
    setSkuError('');
  };

  const handleSkuBlur = async () => {
    if (sku.length > 5) {
      const token = localStorage.getItem('token') || localStorage.getItem('authToken') || '';
      const data = await lookupProduct(sku, token);
      if (data) {
        setName(data.name);
        setBrand(data.brand || '');
        setTimeout(() => minStockInputRef.current?.focus(), 100);
      }
    }
  };

  const handleSkuKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault(); // Evita que o formulário seja enviado vazio
      const currentSku = e.currentTarget.value; // Pega o valor atual direto do evento (mais seguro para scanners rápidos)
      if (currentSku.length > 5) {
        const token = localStorage.getItem('token') || localStorage.getItem('authToken') || '';
        const data = await lookupProduct(currentSku, token);
        if (data) {
          setName(data.name);
          setBrand(data.brand || '');
          setTimeout(() => minStockInputRef.current?.focus(), 100);
        }
      }
    }
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
        brand: formData.get('brand') as string,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTransactionSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (isSubmitting) return;

    const form = e.currentTarget; // Captura a referência do formulário antes do await
    setIsSubmitting(true);
    
    let eventToPass = e; // Evento que será passado para onTransaction

    try {
      // Lógica Unificada: Se estiver criando produto, cria antes da transação
      if (isCreatingProduct && showTransaction?.type === 'ENTRY') {
        if (!name || name.trim() === '') {
          throw new Error('O nome do produto é obrigatório. Por favor, preencha o campo.');
        }

        const token = localStorage.getItem('token') || localStorage.getItem('authToken') || '';
        const formData = new FormData(form); // Usa a referência capturada
        
        // 1. Criar Produto
        const productRes = await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({
            name: name,
            sku: sku || searchSku,
            min_stock: Number(formData.get('min_stock') || 5),
            brand: brand
          })
        });

        if (!productRes.ok) throw new Error('Erro ao criar produto');
        const productData = await productRes.json();
        
        // 2. Injetar o ID do novo produto no formulário para a transação
        const hiddenInput = document.createElement('input');
        hiddenInput.type = 'hidden';
        hiddenInput.name = 'product_id';
        hiddenInput.value = productData.id;
        form.appendChild(hiddenInput);

        // Cria um evento sintético pois o original 'e' pode estar inválido após o await
        eventToPass = {
          ...e,
          currentTarget: form,
          target: form,
          preventDefault: () => {},
          stopPropagation: () => {}
        } as unknown as React.FormEvent<HTMLFormElement>;
      }

      await onTransaction(eventToPass);
      alert("Transação realizada com sucesso!");
      
      if (showTransaction?.type === 'ENTRY') {
        setItemsAddedCount(prev => prev + 1);
        form.reset();
        setSku('');
        setSkuError('');
        setName('');
        setNameError('');
        setBrand('');
        setSelectedProductId('');
        setSearchSku('');
        setSearchTerm('');
        setIsCreatingProduct(false);
        setSuggestedSalePrice('');
        setExitSalePrice('');
        setTimeout(() => scannerInputRef.current?.focus(), 100);
      } else {
        setShowTransaction(null);
      }
    } catch (error: any) {
      console.error(error);
      alert(error.message || "Erro ao realizar transação.");
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
                <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-2">ID / Código</label>
                <div className="relative flex gap-2">
                  <div className="relative flex-1">
                    <input 
                      name="sku" 
                      data-testid="input-product-sku" 
                      required 
                      value={sku} 
                      onChange={handleSkuChange} 
                      onBlur={handleSkuBlur}
                      onKeyDown={handleSkuKeyDown}
                      autoFocus
                      className={`w-full px-4 py-3 bg-gray-50 dark:bg-zinc-800 rounded-xl border-none focus:ring-2 outline-none text-gray-900 dark:text-white ${skuError ? 'focus:ring-rose-500/50' : 'focus:ring-black/5 dark:focus:ring-white/5'}`} 
                      placeholder="Escaneie ou digite..." 
                    />
                    {lookupLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-500 w-5 h-5 animate-spin" />}
                    {!lookupLoading && sku && !skuError && <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500 w-5 h-5" />}
                  </div>
                  <button type="button" onClick={handleSkuBlur} className="px-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors" title="Buscar dados na Web">
                    <Search size={20} />
                  </button>
                  <button type="button" onClick={generateRandomId} className="px-3 bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-gray-400 rounded-xl hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors" title="Gerar ID Automático">
                    <Wand2 size={20} />
                  </button>
                </div>
                {skuError && (
                  <div className="flex items-center gap-1 mt-1 text-rose-500 text-xs font-bold">
                    <AlertCircle size={12} />
                    <span>{skuError}</span>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-2">Nome do Produto</label>
                <div className="relative">
                  <input name="name" data-testid="input-product-name" required value={name} onChange={handleNameChange} className={`w-full px-4 py-3 bg-gray-50 dark:bg-zinc-800 rounded-xl border-none focus:ring-2 outline-none text-gray-900 dark:text-white ${nameError ? 'focus:ring-rose-500/50' : 'focus:ring-black/5 dark:focus:ring-white/5'}`} placeholder="Ex: Monitor Dell 24" />
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
                <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-2">Marca (Opcional)</label>
                <div className="relative">
                  <input name="brand" value={brand} onChange={e => setBrand(e.target.value)} className="w-full px-4 py-3 bg-gray-50 dark:bg-zinc-800 rounded-xl border-none focus:ring-2 focus:ring-black/5 dark:focus:ring-white/5 outline-none text-gray-900 dark:text-white" placeholder="Ex: Dell, Samsung..." />
                  {brand && <Tag className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />}
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-2">Estoque Mínimo (Alerta)</label>
                <input ref={minStockInputRef} name="min_stock" data-testid="input-product-min-stock" type="number" inputMode="numeric" defaultValue={5} className="w-full px-4 py-3 bg-gray-50 dark:bg-zinc-800 rounded-xl border-none focus:ring-2 focus:ring-black/5 dark:focus:ring-white/5 outline-none text-gray-900 dark:text-white" />
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
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold dark:text-white">
                {isCreatingProduct ? 'Cadastrar e Dar Entrada' : `Registrar ${showTransaction.type === 'ENTRY' ? 'Entrada' : 'Saída'}`}
              </h3>
              {showTransaction.type === 'ENTRY' && itemsAddedCount > 0 && (
                <span className="bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-bold px-3 py-1 rounded-full animate-in fade-in zoom-in">
                  {itemsAddedCount} item{itemsAddedCount !== 1 ? 's' : ''} add.
                </span>
              )}
            </div>
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
                      ref={scannerInputRef}
                      type="text" 
                      value={searchSku}
                      onChange={handleSkuSearchChange}
                      onKeyDown={(e) => { if(e.key === 'Enter') { e.preventDefault(); handleProductFound(searchSku); } }}
                      placeholder="Clique aqui para usar o leitor USB..." 
                      className="flex-1 px-3 py-2 bg-white dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-700 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none text-gray-900 dark:text-white"
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

              {isCreatingProduct ? (
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-500/30 space-y-3 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 mb-1">
                    <AlertCircle size={16} />
                    <span className="text-xs font-bold uppercase">Novo Produto Detectado</span>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-600 dark:text-gray-400 uppercase mb-1">ID / Código</label>
                    <input 
                      name="sku" 
                      value={sku} 
                      onChange={e => setSku(e.target.value)} 
                      className="w-full px-3 py-2 bg-white dark:bg-zinc-900 rounded-lg border border-blue-200 dark:border-blue-500/30 focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white text-sm font-mono" 
                      placeholder="Código do produto"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-600 dark:text-gray-400 uppercase mb-1">Nome do Produto</label>
                    <input 
                      name="name" 
                      value={name} 
                      onChange={e => setName(e.target.value)} 
                      className="w-full px-3 py-2 bg-white dark:bg-zinc-900 rounded-lg border border-blue-200 dark:border-blue-500/30 focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white text-sm" 
                      placeholder="Nome do produto"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-600 dark:text-gray-400 uppercase mb-1">Marca</label>
                      <input name="brand" value={brand} onChange={e => setBrand(e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-zinc-900 rounded-lg border border-blue-200 dark:border-blue-500/30 outline-none text-gray-900 dark:text-white text-sm" placeholder="Marca" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-600 dark:text-gray-400 uppercase mb-1">Estoque Mín.</label>
                      <input name="min_stock" type="number" defaultValue={5} className="w-full px-3 py-2 bg-white dark:bg-zinc-900 rounded-lg border border-blue-200 dark:border-blue-500/30 outline-none text-gray-900 dark:text-white text-sm" />
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-2">Buscar Produto</label>
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
                        } else if (showTransaction?.type === 'ENTRY' && searchTerm.trim()) {
                          e.preventDefault();
                          handleProductFound(searchTerm);
                        }
                      }}
                      placeholder="Digite o nome ou ID para filtrar..." 
                      className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-zinc-800 rounded-xl border-none focus:ring-2 focus:ring-black/5 dark:focus:ring-white/5 outline-none text-gray-900 dark:text-white text-sm"
                      autoFocus
                    />
                  </div>

                  <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-2">Produto</label>
                  <select name="product_id" data-testid="select-product" required={!isCreatingProduct} value={selectedProductId} onChange={handleManualProductSelect} className="w-full px-4 py-3 bg-gray-50 dark:bg-zinc-800 rounded-xl border-none focus:ring-2 focus:ring-black/5 dark:focus:ring-white/5 outline-none appearance-none text-gray-900 dark:text-white">
                    <option value="">Selecione um produto...</option>
                    {filteredProducts.map(p => (
                      <option key={p.id} value={p.id}>{p.name} (ID: {p.sku}) {showTransaction.type === 'EXIT' ? `- Est: ${p.current_stock}` : ''}</option>
                    ))}
                  </select>
                  {searchTerm && filteredProducts.length === 0 && (
                    <div className="mt-2 p-3 bg-rose-50 dark:bg-rose-900/20 rounded-xl border border-rose-100 dark:border-rose-800">
                      <p className="text-xs text-rose-500 dark:text-rose-400 mb-2 font-medium">Nenhum produto encontrado com "{searchTerm}"</p>
                      {showTransaction?.type === 'ENTRY' && (
                        <button 
                          type="button"
                          onClick={() => handleProductFound(searchTerm)}
                          className="w-full py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-sm"
                        >
                          <Plus size={14} />
                          Cadastrar "{searchTerm}"
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-2">Quantidade</label>
                  <input ref={quantityInputRef} name="quantity" data-testid="input-quantity" type="number" inputMode="numeric" required min="1" className="w-full px-4 py-3 bg-gray-50 dark:bg-zinc-800 rounded-xl border-none focus:ring-2 focus:ring-black/5 dark:focus:ring-white/5 outline-none text-gray-900 dark:text-white" placeholder="0" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-2">
                    {showTransaction.type === 'ENTRY' ? 'Custo (R$)' : 'Preço (R$)'}
                  </label>
                  <input 
                    name="unit_cost" 
                    data-testid="input-unit-cost" 
                    type="number" 
                    inputMode="decimal" 
                    step="0.01" 
                    required 
                    value={showTransaction.type === 'EXIT' ? exitSalePrice : undefined}
                    onChange={showTransaction.type === 'EXIT' ? (e) => setExitSalePrice(e.target.value) : undefined}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-zinc-800 rounded-xl border-none focus:ring-2 focus:ring-black/5 dark:focus:ring-white/5 outline-none text-gray-900 dark:text-white" 
                    placeholder="0,00" 
                  />
                </div>
              </div>

              {showTransaction.type === 'ENTRY' && (
                <>
                  {user?.role === 'gestor' && (
                    <div>
                      <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-2">Preço de Venda Sugerido (R$)</label>
                      <input name="sale_price" type="number" inputMode="decimal" step="0.01" value={suggestedSalePrice} onChange={e => setSuggestedSalePrice(e.target.value)} className="w-full px-4 py-3 bg-gray-50 dark:bg-zinc-800 rounded-xl border-none focus:ring-2 focus:ring-black/5 dark:focus:ring-white/5 outline-none text-gray-900 dark:text-white" placeholder="Ex: 29,90" />
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-2">Data de Validade (Opcional)</label>
                    <input name="expiry_date" data-testid="input-expiry-date" type="date" className="w-full px-4 py-3 bg-gray-50 dark:bg-zinc-800 rounded-xl border-none focus:ring-2 focus:ring-black/5 dark:focus:ring-white/5 outline-none text-gray-900 dark:text-white" />
                  </div>
                </>
              )}

              {showTransaction.type === 'EXIT' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-2">Status</label>
                    <select name="status" data-testid="select-status" required value={transactionStatus} onChange={(e) => setTransactionStatus(e.target.value)} className="w-full px-4 py-3 bg-gray-50 dark:bg-zinc-800 rounded-xl border-none focus:ring-2 focus:ring-black/5 dark:focus:ring-white/5 outline-none appearance-none text-gray-900 dark:text-white">
                      <option value="PAID">Pago</option>
                      <option value="PENDING">A Receber</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-2">Cliente</label>
                    <input 
                      name="client_name" 
                      data-testid="input-client-name" 
                      required={transactionStatus === 'PENDING'}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-zinc-800 rounded-xl border-none focus:ring-2 focus:ring-black/5 dark:focus:ring-white/5 outline-none text-gray-900 dark:text-white" 
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

      {showReportModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4">
          <motion.div 
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="bg-white dark:bg-zinc-900 w-full max-w-2xl rounded-t-[2.5rem] md:rounded-3xl p-8 shadow-2xl transition-colors max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold dark:text-white">Gerar Relatório de Período</h3>
              <button 
                type="button" 
                onClick={() => setShowReportModal(false)}
                className="p-2 bg-gray-100 dark:bg-zinc-800 rounded-full text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
              >
                <X size={20} />
              </button>
            </div>
            <PeriodClosingReport />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
