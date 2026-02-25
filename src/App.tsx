import React, { useState, useEffect } from 'react';
import { 
  ArrowDownCircle, 
  ArrowUpCircle, 
  Plus,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Store,
  LayoutDashboard,
  DollarSign,
  Search,
  Bell,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Product, User, Stats, ProductStat, MonthlyStat, Receivable } from './types';
import { Auth } from './components/Auth';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { Inventory } from './components/Inventory';
import { Informativo } from './components/Informativo';
import { Financeiro } from './components/Financeiro';
import { Manual } from './components/Manual';
import { AdminDashboard } from './components/AdminDashboard';
import { Modals } from './components/Modals';
import { POS } from './components/POS';
import { PixPaymentModal } from './components/PixPaymentModal';
import { TeamManagement } from './components/TeamManagement';
import { StoreSettings } from './components/StoreSettings';

export default function App() {
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('userData');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [token, setToken] = useState<string | null>(localStorage.getItem('authToken'));
  const [screen, setScreen] = useState<'login' | 'register' | 'app' | 'admin' | 'mode_selection'>('login');
  const [appMode, setAppMode] = useState<'full' | 'pos_finance'>('full');
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<Stats>({ realized_profit: 0, pending_profit: 0 });
  const [productStats, setProductStats] = useState<ProductStat[]>([]);
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStat[]>([]);
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [evolutionPeriod, setEvolutionPeriod] = useState<'day' | 'week' | 'month' | 'quarter' | 'custom'>('month');
  const [customDateRange, setCustomDateRange] = useState({ 
    start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0], 
    end: new Date().toISOString().split('T')[0] 
  });
  const [activeTab, setActiveTab] = useState<'dashboard' | 'inventory' | 'transactions' | 'informativo' | 'financeiro' | 'manual' | 'admin' | 'pdv' | 'team' | 'settings'>('dashboard');
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showTransaction, setShowTransaction] = useState<{ type: 'ENTRY' | 'EXIT', productId?: number } | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [loginError, setLoginError] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDeletingProduct, setIsDeletingProduct] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    document.body.style.fontFamily = "'Inter', sans-serif";
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  // Aplicar cores personalizadas
  useEffect(() => {
    const customColors = (user as any)?.custom_colors;
    if (customColors) {
      document.documentElement.style.setProperty('--color-primary', customColors.primary);
      document.documentElement.style.setProperty('--color-secondary', customColors.secondary);
      document.documentElement.style.setProperty('--color-accent', customColors.accent);

      // Aplicar preferência de tema da loja
      if (customColors.theme_mode) {
        if (customColors.theme_mode === 'dark') setDarkMode(true);
        else if (customColors.theme_mode === 'light') setDarkMode(false);
        else if (customColors.theme_mode === 'system') {
          setDarkMode(window.matchMedia('(prefers-color-scheme: dark)').matches);
        }
      }
    } else {
      document.documentElement.style.removeProperty('--color-primary');
      document.documentElement.style.removeProperty('--color-secondary');
      document.documentElement.style.removeProperty('--color-accent');
    }
  }, [user]);

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Atalho de teclado para trocar modo (Gestor) - Ctrl+M
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'm') {
        if (user?.role === 'gestor') {
          e.preventDefault();
          localStorage.removeItem('appMode');
          setScreen('mode_selection');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [user]);

  // Função auxiliar para fetch com autenticação
  const authFetch = async (url: string, options: RequestInit = {}) => {
    const headers = { ...options.headers, 'Authorization': `Bearer ${token}` };
    const res = await fetch(url, { ...options, headers });
    if (res.status === 401 || res.status === 403) handleLogout();
    return res;
  };

  const fetchData = async () => {
    if (!user || !token) return;
    try {
      // Define o range baseado no período selecionado
      const rangeMap: Record<string, number> = {
        day: 30,      // Últimos 30 dias
        week: 12,     // Últimas 12 semanas
        month: 12,    // Últimos 12 meses
        quarter: 8    // Últimos 8 trimestres
      };

      let evolutionUrl = `/api/profit-evolution?period=${evolutionPeriod}`;
      if (evolutionPeriod === 'custom') {
        evolutionUrl += `&startDate=${customDateRange.start}&endDate=${customDateRange.end}`;
      } else {
        evolutionUrl += `&range=${rangeMap[evolutionPeriod]}`;
      }

      const [productsRes, statsRes, productStatsRes, monthlyStatsRes, receivablesRes, userRes] = await Promise.allSettled([
        authFetch(`/api/products`), // Não precisa mais enviar userId na URL
        authFetch(`/api/stats`),
        authFetch(`/api/product-stats`),
        authFetch(evolutionUrl),
        authFetch(`/api/receivables`),
        authFetch(`/api/me`) // Garante que buscamos as configurações novas
      ]);

      if (productsRes.status === 'fulfilled' && productsRes.value.ok) {
        const data = await productsRes.value.json();
        setProducts(data);
      }
      
      if (statsRes.status === 'fulfilled' && statsRes.value.ok) {
        const statsData = await statsRes.value.json();
        setStats(statsData);
      }

      if (productStatsRes.status === 'fulfilled' && productStatsRes.value.ok) {
        const productStatsData = await productStatsRes.value.json();
        setProductStats(productStatsData);
      }

      if (monthlyStatsRes.status === 'fulfilled' && monthlyStatsRes.value.ok) {
        const monthlyStatsData = await monthlyStatsRes.value.json();
        setMonthlyStats(monthlyStatsData);
      }

      if (receivablesRes.status === 'fulfilled' && receivablesRes.value.ok) {
        const receivablesData = await receivablesRes.value.json();
        setReceivables(receivablesData);
      }

      if (userRes.status === 'fulfilled' && userRes.value.ok) {
        const userData = await userRes.value.json();
        if (JSON.stringify(userData) !== JSON.stringify(user)) {
          setUser(userData);
          localStorage.setItem('userData', JSON.stringify(userData));
        }
      }
    } catch (error) {
      console.error("Failed to fetch data", error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchData();

      // Atualização automática em tempo real (Polling a cada 5 segundos)
      const interval = setInterval(() => {
        fetchData();
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [user, evolutionPeriod, customDateRange, token]);

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const payload = Object.fromEntries(formData.entries());
    
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      setRegisteredEmail(payload.email as string);
      
      if (payload.role === 'gestor') {
        setShowPaymentModal(true);
      } else {
        setScreen('login');
        setLoginError('');
      }
    } else {
      const err = await res.json();
      alert(err.error || "Erro no cadastro");
    }
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoginError('');
    const formData = new FormData(e.currentTarget);
    const payload = Object.fromEntries(formData.entries());

    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data = await res.json();
      setUser(data.user);
      setToken(data.token);
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('userData', JSON.stringify(data.user));
      if (data.user.role === 'gestor') {
        setScreen('mode_selection');
      } else {
        setScreen('app');
      }
      setLoginError('');
    } else {
      const err = await res.json();
      setLoginError(err.error || "E-mail ou senha incorretos");
    }
  };

  const handleAddProduct = async (productData: { name: string, sku: string, min_stock: number }) => {
    if (!token) {
      setToast({ message: 'Sessão expirada. Faça login novamente.', type: 'error' });
      return;
    }
    
    try {
      const res = await authFetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData),
      });

      if (res.ok) {
        setShowAddProduct(false);
        fetchData();
        setToast({ message: 'Produto cadastrado com sucesso!', type: 'success' });
      } else {
        const err = await res.json();
        setToast({ message: err.error || 'Erro ao cadastrar produto', type: 'error' });
      }
    } catch (error) {
      console.error(error);
      setToast({ message: 'Erro de conexão ao salvar produto', type: 'error' });
    }
  };

  const handleTransaction = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const payload = {
      product_id: Number(formData.get('product_id')),
      type: showTransaction?.type,
      quantity: Number(formData.get('quantity')),
      unit_cost: Number(formData.get('unit_cost')),
      status: formData.get('status'),
      sale_price: formData.get('sale_price') ? Number(formData.get('sale_price')) : undefined,
      client_name: formData.get('client_name'),
      expiry_date: formData.get('expiry_date'),
    };

    const res = await authFetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      setShowTransaction(null);
      fetchData();
    } else {
      const err = await res.json();
      alert(err.error || "Erro na transação");
    }
  };

  const handleUpdateSalePrice = async (productId: number, newPrice: number) => {
    if (!token) {
      setToast({ message: 'Sessão expirada. Faça login novamente.', type: 'error' });
      return;
    }

    try {
      const res = await authFetch(`/api/products/${productId}/price`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sale_price: newPrice }),
      });

      if (res.ok) {
        fetchData(); 
        setToast({ message: 'Preço de venda atualizado!', type: 'success' });
      } else {
        const err = await res.json();
        setToast({ message: err.error || 'Erro ao atualizar preço', type: 'error' });
      }
    } catch (error) {
      console.error(error);
      setToast({ message: 'Erro de conexão ao atualizar preço', type: 'error' });
    }
  };

  const handleMarkAsPaid = async (id: number, amount?: number) => {
    const res = await authFetch(`/api/transactions/${id}/pay`, { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount })
    });
    if (res.ok) {
      fetchData();
    }
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    setScreen('login');
  };

  const handleDeleteProduct = async () => {
    if (!productToDelete || !token) return;
    setIsDeletingProduct(true);
    try {
      const res = await authFetch(`/api/products/${productToDelete.id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        setToast({ message: 'Produto excluído com sucesso!', type: 'success' });
        fetchData();
        setProductToDelete(null);
      } else {
        const err = await res.json();
        setToast({ message: err.error || 'Erro ao excluir produto', type: 'error' });
      }
    } catch (error) {
      setToast({ message: 'Erro de conexão ao excluir produto', type: 'error' });
    } finally {
      setIsDeletingProduct(false);
    }
  };

  // Restaurar sessão ao carregar a página (Persistência de Login)
  useEffect(() => {
    const restoreSession = async () => {
      if (token && !user) {
        try {
          const res = await fetch('/api/me', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          if (res.ok) {
            const userData = await res.json();
            setUser(userData);
            localStorage.setItem('userData', JSON.stringify(userData));
            // Se estiver na tela de login mas com token válido, vai para o app
            if (screen === 'login') {
              // Se for gestor, manda escolher o modo, senão vai direto pro app
              if (userData.role === 'gestor') setScreen('mode_selection');
              else setScreen('app');
            }
          } else {
            handleLogout(); // Token inválido ou expirado
          }
        } catch (error) {
          handleLogout();
        }
      }
    };
    restoreSession();
  }, [token]); // Executa sempre que o token mudar (inicialização ou login)

  if (screen === 'admin') {
    return (
      <div className="min-h-screen bg-[#F8F9FA] dark:bg-zinc-950 p-4 md:p-8 transition-colors">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <button 
              type="button"
              onClick={() => setScreen('login')}
              className="px-4 py-2 bg-white dark:bg-zinc-900 rounded-xl border border-gray-100 dark:border-zinc-800 text-sm font-bold hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors dark:text-white"
            >
              ← Voltar para Login
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <ShieldCheck className="text-white w-5 h-5" />
              </div>
              <h1 className="font-bold text-lg dark:text-white">Painel Master</h1>
            </div>
          </div>
          <AdminDashboard />
          <footer className="mt-12 text-center pt-6 border-t border-gray-200 dark:border-zinc-800">
            <p className="text-xs text-[#2D3436]/70 dark:text-gray-500 font-medium">
              iTrust ERP – Gestão inteligente, confiança absoluta.
            </p>
          </footer>
        </div>
      </div>
    );
  }

  if (screen === 'login' || screen === 'register') {
    return (
      <>
        <Auth 
          screen={screen} 
          setScreen={setScreen} 
          onLogin={handleLogin} 
          onRegister={handleRegister}
          onClearError={() => setLoginError('')}
          onAdminClick={() => setScreen('admin')}
          registeredEmail={registeredEmail}
          loginError={loginError}
        />
        <PixPaymentModal 
          isOpen={showPaymentModal} 
          onClose={() => { setShowPaymentModal(false); setScreen('login'); }} 
          email={registeredEmail} 
        />
      </>
    );
  }

  if (screen === 'mode_selection') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 transition-colors">
        <div className="max-w-4xl w-full">
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Bem-vindo, {user?.name}</h1>
            <p className="text-gray-500 dark:text-gray-400">Como deseja acessar o sistema hoje?</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <button
              onClick={() => { setAppMode('full'); setScreen('app'); setActiveTab('dashboard'); }}
              className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border-2 border-transparent hover:border-blue-500 dark:hover:border-blue-500 shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all group text-left"
            >
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <LayoutDashboard size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Acesso Completo</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                Acesso a todos os módulos: Dashboard, Estoque, Relatórios, Financeiro e Configurações.
              </p>
            </button>

            <button
              onClick={() => { setAppMode('pos_finance'); setScreen('app'); setActiveTab('pdv'); }}
              className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border-2 border-transparent hover:border-emerald-500 dark:hover:border-emerald-500 shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all group text-left"
            >
              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <div className="flex gap-1">
                  <Store size={24} />
                  <DollarSign size={24} />
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Frente de Caixa & Financeiro</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                Modo focado em vendas e recebimentos. Interface simplificada para operação diária.
              </p>
            </button>
          </div>
          <footer className="mt-12 text-center">
            <p className="text-xs text-[#2D3436]/70 dark:text-gray-500 font-medium">
              iTrust ERP – Gestão inteligente, confiança absoluta.
            </p>
          </footer>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F7F6] dark:bg-[#0f172a] text-[#2D3436] dark:text-white pb-20 md:pb-0 transition-colors font-sans">
      <Sidebar 
        user={user} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onLogout={handleLogout}
        onShowTransaction={(type) => setShowTransaction({ type })}
        onShowReportModal={() => setShowReportModal(true)}
        onShowAddProduct={() => setShowAddProduct(true)}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        appMode={appMode}
        onSwitchMode={() => {
          localStorage.removeItem('appMode');
          setScreen('mode_selection');
        }}
        isCollapsed={isSidebarCollapsed}
        toggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      <main className={`p-4 md:p-8 transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'md:ml-20' : 'md:ml-64'}`}>
        {/* Header Superior iTrust */}
        <header className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-8 bg-white dark:bg-[#1e293b] p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-4">
            {(user as any)?.logo_url && (
              <img 
                src={(user as any).logo_url} 
                alt="Logo" 
                className="w-12 h-12 rounded-xl object-cover bg-white shadow-sm border border-gray-100 dark:border-gray-700" 
              />
            )}
            <div>
              <h2 className="text-xl font-bold text-[#2D3436] dark:text-white">
                {activeTab === 'dashboard' ? 'Início' : 
                 activeTab === 'inventory' ? 'Inventário' : 
                 activeTab === 'informativo' ? 'Relatórios' :
                 activeTab === 'financeiro' ? 'Financeiro' :
                 activeTab === 'manual' ? 'Ajuda' :
                 activeTab === 'pdv' ? 'PDV' :
                 activeTab === 'team' ? 'Equipe' :
                 activeTab === 'settings' ? 'Configurações da Loja' :
                 'Configurações'}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="text-right hidden md:block">
                <p className="text-sm font-bold text-[#2D3436] dark:text-white">{user?.name}</p>
                <p className="text-xs text-[#00D4FF] font-medium capitalize">{user?.role}</p>
              </div>
              <div className="w-10 h-10 bg-[#1A3A5F] text-white rounded-full flex items-center justify-center font-bold shadow-lg shadow-blue-900/20">
                {user?.name.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        {/* Barra de Ações Rápidas (Reposicionada) */}
        <div className="flex justify-end gap-3 mb-6">
            <button 
              type="button"
              onClick={() => setShowTransaction({ type: 'ENTRY' })}
              data-testid="btn-entry"
              className="flex items-center gap-2 bg-white dark:bg-[#1e293b] text-[#2D3436] dark:text-white px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 font-medium hover:border-[#4CAF50] hover:text-[#4CAF50] transition-all shadow-sm"
            >
              <ArrowDownCircle size={18} />
              Entrada
            </button>
            <button 
              type="button"
              onClick={() => setShowTransaction({ type: 'EXIT' })}
              data-testid="btn-exit"
              className="flex items-center gap-2 bg-white dark:bg-[#1e293b] text-[#2D3436] dark:text-white px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 font-medium hover:border-rose-500 hover:text-rose-500 transition-all shadow-sm"
            >
              <ArrowUpCircle size={18} />
              Saída
            </button>
            <button 
              type="button"
              onClick={() => setShowAddProduct(true)}
              data-testid="btn-new-product"
              className="flex items-center gap-2 bg-[#4CAF50] text-white px-6 py-2 rounded-xl font-bold hover:bg-[#43A047] transition-all shadow-lg shadow-green-500/20"
            >
              <Plus size={18} />
              Novo Produto
            </button>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'dashboard' && (
              <Dashboard 
                products={products} 
                stats={stats} 
                monthlyStats={monthlyStats}
                evolutionPeriod={evolutionPeriod}
                setEvolutionPeriod={setEvolutionPeriod}
                customDateRange={customDateRange}
                setCustomDateRange={setCustomDateRange}
                darkMode={darkMode}
                onViewFinanceiro={() => setActiveTab('financeiro')}
                user={user}
              />
            )}
            {activeTab === 'inventory' && (
              <Inventory 
                products={products} 
                user={user} 
                onUpdateSalePrice={handleUpdateSalePrice} 
                onDeleteProduct={(product) => setProductToDelete(product)}
              />
            )}
            {activeTab === 'informativo' && <Informativo productStats={productStats} />}
            {activeTab === 'financeiro' && (
              <Financeiro 
                receivables={receivables} 
                stats={stats} 
                onMarkAsPaid={handleMarkAsPaid} 
                onNewSale={() => setShowTransaction({ type: 'EXIT' })}
                user={user}
              />
            )}
            {activeTab === 'manual' && <Manual />}
            {activeTab === 'pdv' && (
              <POS 
                products={products} 
                user={user} 
                onCheckoutComplete={fetchData} 
              />
            )}
            {activeTab === 'team' && <TeamManagement user={user} />}
            {activeTab === 'settings' && <StoreSettings user={user} onUpdateUser={fetchData} />}
            {activeTab === 'admin' && <AdminDashboard />}
          </motion.div>
        </AnimatePresence>
        <footer className="mt-12 text-center pt-6 border-t border-gray-200 dark:border-zinc-800">
          <p className="text-xs text-[#2D3436]/70 dark:text-gray-500 font-medium">
            iTrust ERP – Gestão inteligente, confiança absoluta.
          </p>
        </footer>
      </main>

      <Modals 
        showAddProduct={showAddProduct}
        setShowAddProduct={setShowAddProduct}
        showTransaction={showTransaction}
        setShowTransaction={setShowTransaction}
        showReportModal={showReportModal}
        setShowReportModal={setShowReportModal}
        products={products}
        onAddProduct={handleAddProduct}
        onTransaction={handleTransaction}
        user={user}
      />

      {/* Modal de Confirmação de Exclusão de Produto */}
      <AnimatePresence>
        {productToDelete && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-gray-100 dark:border-zinc-800"
            >
              <div className="flex flex-col items-center text-center mb-6">
                <div className="w-12 h-12 bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-500 rounded-full flex items-center justify-center mb-4">
                  <AlertTriangle size={24} />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Excluir Produto?</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  Tem certeza que deseja remover <strong>{productToDelete.name}</strong>? Esta ação não pode ser desfeita.
                </p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setProductToDelete(null)}
                  className="flex-1 py-3 bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleDeleteProduct}
                  disabled={isDeletingProduct}
                  className="flex-1 py-3 bg-rose-600 text-white font-bold rounded-xl hover:bg-rose-700 transition-colors shadow-lg shadow-rose-600/20 flex items-center justify-center gap-2"
                >
                  {isDeletingProduct ? <Loader2 className="animate-spin w-4 h-4" /> : 'Sim, Excluir'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 20, x: '-50%' }}
            className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-6 py-3 rounded-xl shadow-xl flex items-center gap-3 z-[60] ${
              toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
            }`}
          >
            {toast.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
            <span className="font-bold text-sm">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
