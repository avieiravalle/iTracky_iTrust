import React, { useState, useEffect } from 'react';
import { 
  ArrowDownCircle, 
  ArrowUpCircle, 
  Plus,
  Package,
  ShieldCheck
} from 'lucide-react';
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

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [screen, setScreen] = useState<'login' | 'register' | 'app' | 'admin'>('login');
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<Stats>({ realized_profit: 0, pending_profit: 0 });
  const [productStats, setProductStats] = useState<ProductStat[]>([]);
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStat[]>([]);
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [monthlyPeriod, setMonthlyPeriod] = useState(6);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'inventory' | 'transactions' | 'informativo' | 'financeiro' | 'manual' | 'admin'>('dashboard');
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showTransaction, setShowTransaction] = useState<{ type: 'ENTRY' | 'EXIT', productId?: number } | null>(null);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [loginError, setLoginError] = useState('');

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [productsRes, statsRes, productStatsRes, monthlyStatsRes, receivablesRes] = await Promise.allSettled([
        fetch(`/api/products?userId=${user.id}`),
        fetch(`/api/stats?userId=${user.id}`),
        fetch(`/api/product-stats?userId=${user.id}`),
        fetch(`/api/monthly-stats?userId=${user.id}&months=${monthlyPeriod}`),
        fetch(`/api/receivables?userId=${user.id}`)
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
    } catch (error) {
      console.error("Failed to fetch data", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, monthlyPeriod]);

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
      setScreen('login');
      setLoginError('');
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
      const userData = await res.json();
      setUser(userData);
      setScreen('app');
      setLoginError('');
    } else {
      const err = await res.json();
      setLoginError(err.error || "E-mail ou senha incorretos");
    }
  };

  const handleAddProduct = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    const formData = new FormData(e.currentTarget);
    const payload = {
      user_id: user.id,
      name: formData.get('name'),
      sku: formData.get('sku'),
      min_stock: Number(formData.get('min_stock')),
    };

    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      setShowAddProduct(false);
      fetchData();
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
      client_name: formData.get('client_name'),
      expiry_date: formData.get('expiry_date'),
    };

    const res = await fetch('/api/transactions', {
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

  const handleMarkAsPaid = async (id: number, amount?: number) => {
    const res = await fetch(`/api/transactions/${id}/pay`, { 
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
    setScreen('login');
  };

  if (screen === 'admin') {
    return (
      <div className="min-h-screen bg-[#F8F9FA] dark:bg-zinc-950 p-4 md:p-8 transition-colors">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <button 
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
        </div>
      </div>
    );
  }

  if (screen === 'login' || screen === 'register') {
    return (
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
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] dark:bg-zinc-950 text-[#1A1A1A] dark:text-white font-sans pb-20 md:pb-0 transition-colors">
      <Sidebar 
        user={user} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onLogout={handleLogout}
        onShowTransaction={(type) => setShowTransaction({ type })}
        onShowAddProduct={() => setShowAddProduct(true)}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
      />

      <main className="md:ml-64 p-4 md:p-8">
        <header className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-8">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
              {activeTab === 'dashboard' ? 'Visão Geral' : 
               activeTab === 'inventory' ? 'Controle de Estoque' : 
               activeTab === 'informativo' ? 'Informativo de Lucros' :
               activeTab === 'financeiro' ? 'Gestão Financeira' :
               activeTab === 'manual' ? 'Manual de Instruções' :
               'Painel Administrativo'}
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-xs md:text-sm">Bem-vindo ao seu painel de controle.</p>
          </div>
          <div className="hidden md:flex gap-3">
            <button 
              onClick={() => setShowTransaction({ type: 'ENTRY' })}
              className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl border border-emerald-100 font-medium hover:bg-emerald-100 transition-colors"
            >
              <ArrowDownCircle size={18} />
              Entrada
            </button>
            <button 
              onClick={() => setShowTransaction({ type: 'EXIT' })}
              className="flex items-center gap-2 bg-rose-50 text-rose-700 px-4 py-2 rounded-xl border border-rose-100 font-medium hover:bg-rose-100 transition-colors"
            >
              <ArrowUpCircle size={18} />
              Saída
            </button>
            <button 
              onClick={() => setShowAddProduct(true)}
              className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-xl font-medium hover:bg-gray-800 transition-colors"
            >
              <Plus size={18} />
              Novo Produto
            </button>
          </div>
        </header>

        {activeTab === 'dashboard' && (
          <Dashboard 
            products={products} 
            stats={stats} 
            monthlyStats={monthlyStats}
            monthlyPeriod={monthlyPeriod}
            setMonthlyPeriod={setMonthlyPeriod}
            darkMode={darkMode}
            onViewFinanceiro={() => setActiveTab('financeiro')}
            user={user}
          />
        )}
        {activeTab === 'inventory' && <Inventory products={products} user={user} />}
        {activeTab === 'informativo' && <Informativo productStats={productStats} />}
        {activeTab === 'financeiro' && (
          <Financeiro 
            receivables={receivables} 
            stats={stats} 
            onMarkAsPaid={handleMarkAsPaid} 
            onNewSale={() => setShowTransaction({ type: 'EXIT' })}
          />
        )}
        {activeTab === 'manual' && <Manual />}
        {activeTab === 'admin' && <AdminDashboard />}
      </main>

      <Modals 
        showAddProduct={showAddProduct}
        setShowAddProduct={setShowAddProduct}
        showTransaction={showTransaction}
        setShowTransaction={setShowTransaction}
        products={products}
        onAddProduct={handleAddProduct}
        onTransaction={handleTransaction}
      />
    </div>
  );
}
