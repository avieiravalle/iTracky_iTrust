import React, { useState, useEffect, useRef } from 'react';
import { Search, ShoppingCart, Trash2, Plus, Minus, ScanBarcode, Delete, X, CreditCard, Banknote, QrCode, CheckCircle2, Keyboard, Monitor, Tag, Clock, Copy, AlertCircle, Maximize, Minimize, Printer } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Product, User } from '../types';
import { formatBRL } from '../utils/format';

interface POSProps {
  products: Product[];
  user: User | null;
  onCheckoutComplete: () => void;
}

interface CartItem {
  product: Product;
  quantity: number;
  unitPrice: number;
  discountType: 'percentage' | 'money';
  discountValue: number;
}

// Função auxiliar para gerar o payload do PIX (Copia do PixPaymentModal para evitar dependência circular)
const generatePixPayload = (key: string, name: string, city: string, amount: string, txId: string = '***') => {
  const formattedAmount = parseFloat(amount).toFixed(2);
  if (isNaN(parseFloat(formattedAmount)) || parseFloat(formattedAmount) <= 0) return null;
  
  const format = (id: string, val: string) => id + val.length.toString().padStart(2, '0') + val;
  
  const payload = 
    '000201' +
    format('26', '0014BR.GOV.BCB.PIX' + format('01', key)) +
    format('52', '0000') +
    format('53', '986') +
    format('54', formattedAmount) +
    format('58', 'BR') +
    format('59', name) +
    format('60', city) +
    format('62', format('05', txId)) +
    '6304';

  let crc = 0xFFFF;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
      else crc = (crc << 1) & 0xFFFF;
    }
  }
  return payload + crc.toString(16).toUpperCase().padStart(4, '0');
};

export const POS: React.FC<POSProps> = ({ products, user, onCheckoutComplete }) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [barcode, setBarcode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'money' | 'credit' | 'debit' | 'pix'>('money');
  const [clientName, setClientName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [amountReceived, setAmountReceived] = useState('');
  const [discountPercentage, setDiscountPercentage] = useState('');
  const [transactionStatus, setTransactionStatus] = useState<'PAID' | 'PENDING'>('PAID');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listEndRef = useRef<HTMLTableRowElement>(null);

  // 1. Foco Permanente: Foca ao montar e sempre que o carrinho mudar
  useEffect(() => {
    if (showPaymentModal) return;

    const focusInput = () => {
      // Pequeno delay para garantir que a renderização terminou
      setTimeout(() => {
        // Não roubar foco se o usuário estiver editando preço (outro input focado)
        const active = document.activeElement;
        if (active && active.tagName === 'INPUT' && active !== inputRef.current) {
          return;
        }

        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 10);
    };

    focusInput();

    // Listener global para devolver o foco ao input se clicar no "vazio"
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Se não clicou em um botão ou input, foca no scanner
      if (!showPaymentModal && target.tagName !== 'BUTTON' && target.tagName !== 'INPUT' && target.tagName !== 'A') {
        focusInput();
      }
    };

    document.addEventListener('click', handleGlobalClick);
    return () => document.removeEventListener('click', handleGlobalClick);
  }, [cart, showPaymentModal]);

  // Auto-scroll: Rola para o último item sempre que o carrinho mudar
  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [cart]);

  // Monitorar estado de tela cheia
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Gestão de Atalhos de Teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // F2: Focar no Input de Busca
      if (e.key === 'F2') {
        e.preventDefault();
        inputRef.current?.focus();
      }

      // F4: Imprimir Nota
      if (e.key === 'F4') {
        e.preventDefault();
        window.print();
      }
      
      // F10: Finalizar Venda
      if (e.key === 'F10') {
        e.preventDefault();
        if (showPaymentModal) return;
        if (cart.length > 0) {
          setShowPaymentModal(true);
        } else {
          setErrorMsg('Adicione itens ao carrinho para finalizar a venda.');
          setTimeout(() => setErrorMsg(''), 3000);
        }
      }

      // ESC: Cancelar / Limpar Carrinho (se não estiver no modal)
      if (e.key === 'Escape' && !showPaymentModal) {
        if (cart.length > 0 && confirm('Deseja cancelar a venda atual e limpar a tela?')) {
          setCart([]);          setDiscountPercentage('');
          setClientName('');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, showPaymentModal]);

  // Efeito para filtrar sugestões enquanto digita
  useEffect(() => {
    if (barcode.length > 1) {
      const matches = products.filter(p => 
        p.name.toLowerCase().includes(barcode.toLowerCase()) || 
        p.sku.toLowerCase().includes(barcode.toLowerCase())
      ).slice(0, 5); // Limita a 5 sugestões
      setSuggestions(matches);
    } else {
      setSuggestions([]);
    }
  }, [barcode, products]);

  // Função para tocar som de bip
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
        osc.frequency.value = 1000; // Frequência em Hz (Bip padrão)
        gain.gain.value = 0.1; // Volume
        
        osc.start();
        setTimeout(() => {
          osc.stop();
          ctx.close();
        }, 100); // Duração curta
      }
    } catch (e) {
      console.error("Erro ao tocar som de bip", e);
    }
  };

  // 2. Lógica de Adicionar ao Carrinho (Scanner ou Manual)
  const handleScan = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      
      if (!barcode.trim()) return;

      // 1. Busca exata por SKU ou Código de Barras (Prioridade para Scanner)
      let product = products.find(p => p.sku.toLowerCase() === barcode.toLowerCase() || p.name.toLowerCase() === barcode.toLowerCase());
      
      // 2. Se não achar exato, mas tem sugestões visíveis, pega a primeira (Facilita digitação manual)
      if (!product && suggestions.length > 0) {
        product = suggestions[0];
      }

      if (product) {
        addToCart(product);
        setBarcode('');
        // setSuggestions([]) será limpo pelo useEffect quando barcode for vazio
        setErrorMsg('');
      } else {
        setErrorMsg(`Produto não encontrado: ${barcode}`);
        setBarcode(''); // Limpa para o próximo scan
      }
    }
  };

  const addToCart = (product: Product) => {
    playBeep(); // Toca o som ao adicionar
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      
      // Verifica estoque
      const currentQtyInCart = existing ? existing.quantity : 0;
      if (currentQtyInCart + 1 > product.current_stock) {
        setErrorMsg(`Estoque insuficiente para ${product.name}`);
        return prev;
      }

      if (existing) {
        return prev.map(item => 
          item.product.id === product.id 
            ? { ...item, quantity: item.quantity + 1 } 
            : item
        );
      }
      const defaultSalePrice = product.sale_price > 0 ? product.sale_price : product.average_cost * 1.5;
      return [...prev, { product, quantity: 1, unitPrice: defaultSalePrice, discountType: 'percentage', discountValue: 0 }];
    });
  };

  const selectSuggestion = (product: Product) => {
    addToCart(product);
    setBarcode('');
    setSuggestions([]);
    inputRef.current?.focus();
  };

  const removeFromCart = (productId: number) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
    inputRef.current?.focus();
  };

  const updateQuantity = (productId: number, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        const newQty = item.quantity + delta;
        if (newQty > item.product.current_stock) return item;
        if (newQty < 1) return item;
        return { ...item, quantity: newQty };
      }
      return item;
    }));
    inputRef.current?.focus();
  };

  const updateUnitPrice = (productId: number, newPrice: number) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        return { ...item, unitPrice: newPrice };
      }
      return item;
    }));
  };

  const updateDiscount = (productId: number, value: number, type?: 'percentage' | 'money') => {
    setCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        return { 
          ...item, 
          discountValue: value,
          discountType: type !== undefined ? type : item.discountType
        };
      }
      return item;
    }));
  };

  // Cálculos de Totais
  const calculateTotal = () => {
    const subtotal = cart.reduce((acc, item) => {
      let itemPrice = item.unitPrice;
      if (item.discountValue > 0) {
        if (item.discountType === 'percentage') {
          itemPrice = itemPrice * (1 - item.discountValue / 100);
        } else {
          itemPrice = Math.max(0, itemPrice - item.discountValue);
        }
      }
      return acc + (itemPrice * item.quantity);
    }, 0);
    
    const discountValue = (subtotal * (parseFloat(discountPercentage) || 0)) / 100;
    
    return Math.max(0, subtotal - discountValue);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setIsProcessing(true);
    
    if (transactionStatus === 'PENDING' && !clientName.trim()) {
      alert('Nome do cliente é obrigatório para vendas "A Receber".');
      setIsProcessing(false);
      return;
    }

    try {
      const itemsPayload = cart.map(item => {
        let netUnitPrice = item.unitPrice;
        if (item.discountValue > 0) {
          if (item.discountType === 'percentage') {
            netUnitPrice = netUnitPrice * (1 - item.discountValue / 100);
          } else {
            netUnitPrice = Math.max(0, netUnitPrice - item.discountValue);
          }
        }
        const finalUnitPrice = netUnitPrice * (1 - ((parseFloat(discountPercentage) || 0) / 100));
        return {
          product_id: item.product.id,
          quantity: item.quantity,
          unit_price: finalUnitPrice
        };
      });

      const res = await fetch('/api/pos/checkout', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          items: itemsPayload,
          paymentMethod,
          clientName,
          status: transactionStatus,
          amountPaid: transactionStatus === 'PENDING' ? (parseFloat(amountReceived) || 0) : undefined
        })
      });

      if (res.ok) {
        alert('Venda realizada com sucesso!');
        setCart([]);
        setShowPaymentModal(false);
        setClientName('');
        setAmountReceived('');
        setDiscountPercentage('');
        setTransactionStatus('PAID');
        onCheckoutComplete();
      } else {
        const data = await res.json();
        alert(`Erro: ${data.error}`);
      }
    } catch (error) {
      alert('Erro ao processar venda.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Lógica para gerar QR Code PIX
  const getPixData = () => {
    const pixKey = (user as any)?.pix_key;
    if (!pixKey) return null;
    const amount = transactionStatus === 'PAID' ? calculateTotal() : (parseFloat(amountReceived) || 0);
    const payload = generatePixPayload(pixKey, user?.establishment_name || 'Loja', 'Brasil', amount.toString());
    return { payload, qrUrl: payload ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(payload)}` : null };
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  return (
    <>
      {/* Layout de Impressão Térmica (80mm) - Visível apenas na impressão */}
      <div className="hidden print:block bg-white text-black p-0 m-0 font-mono text-xs w-[80mm]">
        <div className="text-center mb-2">
          <h2 className="font-bold text-sm uppercase">{user?.establishment_name || 'Minha Loja'}</h2>
          <p className="text-[10px]">{new Date().toLocaleString('pt-BR')}</p>
          <p className="text-[10px]">*** CUPOM NÃO FISCAL ***</p>
        </div>
        
        <div className="border-b border-black border-dashed my-2" />
        
        <table className="w-full text-left mb-2">
          <thead>
            <tr className="text-[10px]">
              <th className="pb-1">ITEM</th>
              <th className="pb-1 text-right">QTD</th>
              <th className="pb-1 text-right">VL.UN</th>
              <th className="pb-1 text-right">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {cart.map((item) => {
              let itemPrice = item.unitPrice;
              if (item.discountValue > 0) {
                if (item.discountType === 'percentage') {
                  itemPrice = itemPrice * (1 - item.discountValue / 100);
                } else {
                  itemPrice = Math.max(0, itemPrice - item.discountValue);
                }
              }
              const total = itemPrice * item.quantity;
              
              return (
                <tr key={item.product.id} className="align-top">
                  <td className="pr-1 max-w-[35mm] overflow-hidden truncate">{item.product.name}</td>
                  <td className="text-right pr-1">{item.quantity}</td>
                  <td className="text-right pr-1">{itemPrice.toFixed(2)}</td>
                  <td className="text-right">{total.toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        
        <div className="border-b border-black border-dashed my-2" />
        
        <div className="flex justify-between font-bold text-sm mb-4">
          <span>TOTAL A PAGAR</span>
          <span>{formatBRL(calculateTotal())}</span>
        </div>
        
        <div className="text-center text-[10px]">
          <p>Obrigado pela preferência!</p>
          <p>Volte sempre.</p>
        </div>
      </div>

      {/* Interface do PDV - Oculta na impressão */}
      <div className="print:hidden flex flex-col lg:flex-row h-[calc(100vh-12rem)] md:h-[calc(100vh-12rem)] lg:h-[calc(100vh-12rem)] bg-[#121214] text-gray-100 rounded-xl overflow-hidden font-sans shadow-2xl border border-zinc-800">
      <style>{`
        @media print { @page { margin: 0; size: auto; } body { margin: 0; padding: 0; } }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #18181b;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #3f3f46;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #52525b;
        }
      `}</style>
      
      {/* COLUNA ESQUERDA: Operação (Input + Lista) */}
      <div className="flex-1 flex flex-col border-r border-zinc-800 relative min-h-0">
        
        {/* Topo: Input de Busca */}
        <div className="p-4 lg:p-6 bg-[#1A1A1E] border-b border-zinc-800 z-20 shadow-md">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2 text-zinc-400">
              <Monitor size={18} />
              <span className="text-xs font-bold uppercase tracking-widest">PDV 01 • {user?.establishment_name || 'Loja Principal'}</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-xs text-zinc-500 font-mono">
                Operador: <span className="text-zinc-300">{user?.name}</span>
              </div>
              <button 
                onClick={toggleFullscreen}
                className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-lg transition-colors"
                title={isFullscreen ? "Sair da Tela Cheia" : "Tela Cheia"}
              >
                {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
              </button>
            </div>
          </div>

          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#0055FF]">
              <ScanBarcode size={28} />
            </div>
            <input
              ref={inputRef}
              type="text"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              onKeyDown={handleScan}
              placeholder="Bipe o código ou digite o nome..."
              className="w-full pl-14 pr-4 py-3 lg:py-5 text-lg lg:text-2xl font-bold bg-[#202024] border-2 border-zinc-700 rounded-xl focus:border-[#0055FF] focus:ring-4 focus:ring-[#0055FF]/20 outline-none text-white placeholder-zinc-600 transition-all shadow-inner"
              autoComplete="off"
            />
            {/* Sugestões */}
            <AnimatePresence>
              {suggestions.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-full left-0 right-0 bg-[#202024] shadow-2xl rounded-xl border border-zinc-700 mt-2 overflow-hidden z-30"
                >
                  {suggestions.map((product, index) => (
                    <button
                      key={product.id}
                      onClick={() => selectSuggestion(product)}
                      className={`w-full text-left p-4 border-b border-zinc-800 last:border-0 flex justify-between items-center group transition-colors ${index === 0 ? 'bg-[#0055FF]/10' : 'hover:bg-zinc-800'}`}
                    >
                      <div>
                        <p className="font-bold text-white">{product.name}</p>
                        <p className="text-xs text-zinc-400 font-mono">{product.sku}</p>
                      </div>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
            
            {errorMsg && (
              <div className="absolute top-full left-0 mt-2 flex items-center gap-2 text-rose-500 text-sm font-bold animate-pulse bg-rose-500/10 px-3 py-1 rounded-lg">
                <X size={14} /> {errorMsg}
              </div>
            )}
          </div>
        </div>

        {/* Centro: Tabela de Itens */}
        <div className="flex-1 overflow-auto bg-[#121214] relative custom-scrollbar scroll-smooth">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-[#121214] z-10 shadow-sm border-b border-zinc-800">
              <tr className="text-xs uppercase text-zinc-500 font-bold">
                <th className="px-3 py-3 lg:px-6 lg:py-4 w-10 lg:w-16">#</th>
                <th className="px-3 py-3 lg:px-6 lg:py-4">Produto</th>
                <th className="px-3 py-3 lg:px-6 lg:py-4 text-center w-16 lg:w-32">Qtd</th>
                <th className="hidden sm:table-cell px-3 py-3 lg:px-6 lg:py-4 text-right w-24 lg:w-32">Unitário</th>
                <th className="hidden sm:table-cell px-3 py-3 lg:px-6 lg:py-4 text-right w-32">Desconto</th>
                <th className="px-3 py-3 lg:px-6 lg:py-4 text-right w-20 lg:w-32">Total</th>
                <th className="px-3 py-3 lg:px-6 lg:py-4 text-center w-10 lg:w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {cart.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-32">
                    <div className="flex flex-col items-center opacity-20">
                      <ShoppingCart size={64} className="mb-4" />
                      <p className="text-xl font-medium">Caixa Livre</p>
                      <p className="text-sm">Aguardando início da venda</p>
                    </div>
                  </td>
                </tr>
              ) : (
                cart.map((item, index) => {
                  const unitPrice = item.unitPrice;
                  const isLast = index === cart.length - 1;
                  let finalPrice = unitPrice;
                  if (item.discountValue > 0) {
                    if (item.discountType === 'percentage') {
                      finalPrice = unitPrice * (1 - item.discountValue / 100);
                    } else {
                      finalPrice = Math.max(0, unitPrice - item.discountValue);
                    }
                  }
                  return (
                    <tr 
                      key={item.product.id} 
                      ref={isLast ? listEndRef : null} 
                      className={`group transition-colors ${isLast ? 'bg-[#0055FF]/10' : 'hover:bg-zinc-800/30'}`}
                    >
                      <td className="px-3 py-3 lg:px-6 lg:py-4 text-zinc-600 font-mono text-xs">{index + 1}</td>
                      <td className="px-3 py-3 lg:px-6 lg:py-4">
                        <p className="font-bold text-gray-200 text-sm lg:text-lg line-clamp-2">{item.product.name}</p>
                        <p className="text-xs text-zinc-500 font-mono">{item.product.sku}</p>
                      </td>
                      <td className="px-3 py-3 lg:px-6 lg:py-4">
                        <div className="flex items-center justify-center gap-3 bg-zinc-900 rounded-lg p-1 border border-zinc-800">
                          <button onClick={() => updateQuantity(item.product.id, -1)} className="p-1 hover:bg-zinc-700 rounded text-zinc-400 hover:text-white"><Minus size={14}/></button>
                          <span className="font-bold w-8 text-center text-white">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.product.id, 1)} className="p-1 hover:bg-zinc-700 rounded text-zinc-400 hover:text-white"><Plus size={14}/></button>
                        </div>
                      </td>
                      <td className="hidden sm:table-cell px-3 py-3 lg:px-6 lg:py-4 text-right">
                      <input 
                        type="number" 
                        step="0.01"
                        min="0"
                        value={unitPrice}
                        onChange={(e) => updateUnitPrice(item.product.id, parseFloat(e.target.value) || 0)}
                          className="w-24 text-right bg-transparent border-b border-zinc-700 focus:border-[#0055FF] outline-none p-1 text-zinc-300 focus:text-white transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>
                      <td className="hidden sm:table-cell px-3 py-3 lg:px-6 lg:py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <input 
                            type="number"
                            min="0"
                            step={item.discountType === 'percentage' ? '1' : '0.01'}
                            value={item.discountValue}
                            onChange={(e) => updateDiscount(item.product.id, parseFloat(e.target.value) || 0)}
                            className="w-16 text-right bg-transparent border-b border-zinc-700 focus:border-[#0055FF] outline-none p-1 text-zinc-300 focus:text-white transition-colors text-xs"
                          />
                          <button
                            onClick={() => updateDiscount(item.product.id, item.discountValue, item.discountType === 'percentage' ? 'money' : 'percentage')}
                            className="text-[10px] font-bold uppercase text-zinc-500 hover:text-white bg-zinc-800 px-1.5 py-1 rounded w-8"
                          >
                            {item.discountType === 'percentage' ? '%' : 'R$'}
                          </button>
                        </div>
                      </td>
                      <td className="px-3 py-3 lg:px-6 lg:py-4 text-right font-bold text-white text-sm lg:text-lg">{formatBRL(finalPrice * item.quantity)}</td>
                      <td className="px-3 py-3 lg:px-6 lg:py-4 text-center">
                        <button onClick={() => removeFromCart(item.product.id)} className="text-zinc-600 hover:text-rose-500 hover:bg-rose-500/10 p-2 rounded-lg transition-colors lg:opacity-0 lg:group-hover:opacity-100"><Trash2 size={18} /></button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Rodapé de Atalhos */}
        <div className="bg-[#1A1A1E] border-t border-zinc-800 p-3 hidden lg:flex justify-center gap-4 text-xs font-mono text-zinc-500 select-none">
          <div className="flex items-center gap-2 px-3 py-1 bg-zinc-900 rounded border border-zinc-800">
            <span className="font-bold text-zinc-300 bg-zinc-800 px-1.5 rounded">F2</span> Buscar
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-zinc-900 rounded border border-zinc-800 cursor-pointer hover:bg-zinc-800 transition-colors" onClick={() => window.print()}>
            <span className="font-bold text-zinc-300 bg-zinc-800 px-1.5 rounded">F4</span> Imprimir
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-zinc-900 rounded border border-zinc-800">
            <span className="font-bold text-zinc-300 bg-zinc-800 px-1.5 rounded">F10</span> Finalizar
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-zinc-900 rounded border border-zinc-800">
            <span className="font-bold text-zinc-300 bg-zinc-800 px-1.5 rounded">ESC</span> Cancelar
          </div>
        </div>
      </div>

      {/* COLUNA DIREITA: Resumo e Pagamento */}
      <div className="w-full lg:w-96 bg-[#1A1A1E] flex flex-col border-t lg:border-t-0 lg:border-l border-zinc-800 shadow-2xl z-30 shrink-0">
        <div className="p-4 lg:p-8 flex-1 flex flex-col">
          <h2 className="text-zinc-400 uppercase text-xs font-bold tracking-widest mb-4 lg:mb-8 hidden lg:block">Resumo da Venda</h2>
          
          <div className="space-y-6 mb-auto hidden lg:block">
            <div className="flex justify-between items-center p-4 bg-zinc-900/50 rounded-xl border border-zinc-800">
              <span className="text-zinc-400 text-sm">Itens</span>
              <span className="text-white font-bold text-xl">{cart.reduce((acc, item) => acc + item.quantity, 0)}</span>
            </div>

            <div className="flex justify-between items-center p-4 bg-zinc-900/50 rounded-xl border border-zinc-800">
              <span className="text-zinc-400 text-sm flex items-center gap-2"><Tag size={14}/> Desconto (%)</span>
              <div className="flex items-center gap-2">
                <input 
                  type="number" 
                  value={discountPercentage} 
                  onChange={e => setDiscountPercentage(e.target.value)}
                  placeholder="0"
                  className="w-20 bg-transparent text-right font-bold text-white outline-none border-b border-zinc-700 focus:border-[#0055FF]"
                />
                <span className="text-zinc-500 text-lg">%</span>
              </div>
            </div>
          </div>

          {/* Mobile Compact Summary */}
          <div className="flex lg:hidden justify-between items-center mb-2 text-xs text-zinc-500">
             <span>{cart.reduce((acc, item) => acc + item.quantity, 0)} itens no carrinho</span>
          </div>

          <div className="mt-0 lg:mt-8 space-y-2 lg:space-y-4">
            <div className="flex justify-between items-end lg:block lg:text-right">
              <p className="text-zinc-500 text-sm font-medium mb-1">Total a Pagar</p>
              <p className="text-3xl lg:text-5xl font-black text-white tracking-tight">{formatBRL(calculateTotal())}</p>
            </div>

            <button
              onClick={() => setShowPaymentModal(true)}
              disabled={cart.length === 0}
              className="w-full py-4 lg:py-5 bg-[#0055FF] hover:bg-[#0044CC] text-white rounded-xl font-bold text-lg lg:text-xl transition-all shadow-lg shadow-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] flex items-center justify-center gap-3 mt-2 lg:mt-8"
            >
              <CheckCircle2 size={24} /> 
              Finalizar Venda
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Pagamento */}
      <AnimatePresence>
        {showPaymentModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto border border-zinc-800"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-xl dark:text-white">Pagamento</h3>
                <button onClick={() => { setShowPaymentModal(false); setAmountReceived(''); }} className="p-2 bg-gray-100 dark:bg-zinc-800 rounded-full text-gray-500">
                  <X size={20} />
                </button>
              </div>

              {/* Resumo da Venda no Modal */}
              <div className="mb-6 bg-gray-50 dark:bg-zinc-800 rounded-2xl p-5 border border-gray-200 dark:border-zinc-700">
                <div className="flex justify-between items-center mb-3">
                  <p className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Itens do Carrinho</p>
                  <span className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs font-bold px-2 py-1 rounded-lg">{cart.length} itens</span>
                </div>
                <div className="max-h-48 overflow-y-auto pr-2 space-y-3">
                  {cart.map((item) => (
                    <div key={item.product.id} className="flex justify-between items-start text-sm border-b border-gray-100 dark:border-zinc-700 last:border-0 pb-2 last:pb-0">
                      <div className="flex-1">
                        <p className="font-bold text-gray-800 dark:text-white line-clamp-1">{item.product.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded">{item.quantity}x</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">Unit: {formatBRL(item.unitPrice)}</span>
                        </div>
                      </div>
                      <span className="font-bold text-gray-900 dark:text-white whitespace-nowrap ml-3 mt-1">{formatBRL(item.unitPrice * item.quantity)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                {/* Seletor de Tipo de Venda */}
                <div className="flex p-1 bg-gray-100 dark:bg-zinc-800 rounded-xl">
                  <button
                    onClick={() => { setTransactionStatus('PAID'); setAmountReceived(''); }}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${transactionStatus === 'PAID' ? 'bg-white dark:bg-zinc-700 shadow text-blue-600 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}
                  >
                    Pagamento Imediato
                  </button>
                  <button
                    onClick={() => { setTransactionStatus('PENDING'); setAmountReceived(''); }}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${transactionStatus === 'PENDING' ? 'bg-white dark:bg-zinc-700 shadow text-amber-600 dark:text-amber-400' : 'text-gray-500 dark:text-gray-400'}`}
                  >
                    A Receber (Fiado)
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-2">
                    Cliente {transactionStatus === 'PENDING' ? '(Obrigatório)' : '(Opcional)'}
                  </label>
                  <input 
                    type="text" 
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Nome do cliente"
                    className={`w-full px-4 py-3 bg-gray-50 dark:bg-zinc-800 rounded-xl border-2 focus:ring-2 focus:ring-blue-500/20 outline-none dark:text-white transition-colors ${transactionStatus === 'PENDING' && !clientName ? 'border-amber-500/50' : 'border-transparent'}`}
                    autoFocus={transactionStatus === 'PENDING'}
                  />
                </div>

                {transactionStatus === 'PENDING' && (
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Valor de Entrada (Opcional)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      value={amountReceived}
                      onChange={(e) => setAmountReceived(e.target.value)}
                      placeholder="0,00"
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-zinc-800 rounded-xl border-none focus:ring-2 focus:ring-blue-500/20 outline-none dark:text-white text-lg font-bold"
                    />
                  </div>
                )}

                {(transactionStatus === 'PAID' || (transactionStatus === 'PENDING' && parseFloat(amountReceived) > 0)) ? (
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Forma de Pagamento {transactionStatus === 'PENDING' ? 'da Entrada' : ''}</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button 
                        onClick={() => setPaymentMethod('money')}
                        className={`p-3 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${paymentMethod === 'money' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-100 dark:border-zinc-700 dark:text-gray-300'}`}
                      >
                        <Banknote size={24} />
                        <span className="text-xs font-bold">Dinheiro</span>
                      </button>
                      <button 
                        onClick={() => setPaymentMethod('pix')}
                        className={`p-3 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${paymentMethod === 'pix' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-100 dark:border-zinc-700 dark:text-gray-300'}`}
                      >
                        <QrCode size={24} />
                        <span className="text-xs font-bold">PIX</span>
                      </button>
                      <button 
                        onClick={() => setPaymentMethod('credit')}
                        className={`p-3 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${paymentMethod === 'credit' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-100 dark:border-zinc-700 dark:text-gray-300'}`}
                      >
                        <CreditCard size={24} />
                        <span className="text-xs font-bold">Crédito</span>
                      </button>
                      <button 
                        onClick={() => setPaymentMethod('debit')}
                        className={`p-3 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${paymentMethod === 'debit' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-100 dark:border-zinc-700 dark:text-gray-300'}`}
                      >
                        <CreditCard size={24} />
                        <span className="text-xs font-bold">Débito</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-amber-50 dark:bg-amber-500/10 rounded-xl border border-amber-100 dark:border-amber-500/20 flex items-start gap-3">
                    <Clock className="text-amber-600 dark:text-amber-400 shrink-0" size={20} />
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                      Esta venda será registrada em <strong>Contas a Receber</strong>. Você poderá registrar os pagamentos parciais ou totais posteriormente no menu Financeiro.
                    </p>
                  </div>
                )}

                {/* Área do QR Code PIX */}
                {paymentMethod === 'pix' && (transactionStatus === 'PAID' || (transactionStatus === 'PENDING' && parseFloat(amountReceived) > 0)) && (
                  <div className="bg-white p-4 rounded-xl border border-gray-200 flex flex-col items-center text-center">
                    {(user as any)?.pix_key ? (
                      <>
                        <p className="text-xs font-bold text-gray-500 uppercase mb-2">Escaneie para pagar</p>
                        {getPixData()?.qrUrl && (
                          <img src={getPixData()?.qrUrl || ''} alt="QR Code PIX" className="w-40 h-40 object-contain mb-3" />
                        )}
                        <div className="w-full flex items-center gap-2 bg-gray-100 p-2 rounded-lg border border-gray-200">
                          <p className="text-xs font-mono text-gray-600 truncate flex-1 text-left">{(user as any)?.pix_key}</p>
                          <button 
                            onClick={() => { navigator.clipboard.writeText((user as any)?.pix_key); alert('Chave copiada!'); }}
                            className="text-blue-600 hover:text-blue-800"
                            title="Copiar Chave"
                          >
                            <Copy size={16} />
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="text-rose-500 text-sm font-bold flex flex-col items-center gap-2">
                        <AlertCircle size={24} />
                        <p>Chave PIX não configurada.</p>
                        <p className="text-xs font-normal text-gray-500">Acesse Configurações para cadastrar sua chave.</p>
                      </div>
                    )}
                  </div>
                )}

                {transactionStatus === 'PAID' && paymentMethod === 'money' && (
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Valor Recebido</label>
                    <input 
                      type="number" 
                      step="0.01"
                      value={amountReceived}
                      onChange={(e) => setAmountReceived(e.target.value)}
                      placeholder="0,00"
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-zinc-800 rounded-xl border-none focus:ring-2 focus:ring-blue-500/20 outline-none dark:text-white text-lg font-bold"
                      autoFocus
                    />
                  </div>
                )}

                <div className="pt-4 border-t border-gray-100 dark:border-zinc-800">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-500">Total a Pagar</span>
                    <span className="text-2xl font-black text-gray-900 dark:text-white">{formatBRL(calculateTotal())}</span>
                  </div>
                  
                  {transactionStatus === 'PAID' && paymentMethod === 'money' && (
                    <div className="flex justify-between items-center mb-4 p-3 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl">
                      <span className="text-emerald-700 dark:text-emerald-400 font-bold">Troco</span>
                      <span className="text-xl font-black text-emerald-700 dark:text-emerald-400">
                        {formatBRL(Math.max(0, (parseFloat(amountReceived) || 0) - calculateTotal()))}
                      </span>
                    </div>
                  )}

                  <button 
                    onClick={handleCheckout}
                    disabled={isProcessing || (transactionStatus === 'PENDING' && !clientName)}
                    className={`w-full py-4 text-white rounded-xl font-bold text-lg transition-all shadow-lg flex items-center justify-center gap-2 ${transactionStatus === 'PAID' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20' : 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'}`}
                  >
                    {isProcessing ? 'Processando...' : (
                      <>
                        <CheckCircle2 /> {transactionStatus === 'PAID' ? 'Confirmar Pagamento' : 'Confirmar A Receber'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
    </>
  );
};