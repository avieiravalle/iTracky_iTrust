import React, { useState } from 'react';
import { LayoutDashboard, Package, ArrowUpCircle, ArrowDownCircle, Plus, TrendingUp, DollarSign, BookOpen, Sun, Moon, ShieldCheck, X, ArrowRight } from 'lucide-react';
import { User } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface SidebarProps {
  user: User | null;
  activeTab: string;
  setActiveTab: (tab: 'dashboard' | 'inventory' | 'transactions' | 'informativo' | 'financeiro' | 'manual' | 'admin') => void;
  onLogout: () => void;
  onShowTransaction: (type: 'ENTRY' | 'EXIT') => void;
  onShowAddProduct: () => void;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  user, 
  activeTab, 
  setActiveTab, 
  onLogout,
  onShowTransaction,
  onShowAddProduct,
  darkMode,
  setDarkMode
}) => {
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  return (
    <>
      {/* Sidebar - Desktop Only */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-white dark:bg-zinc-900 border-r border-[#E5E7EB] dark:border-zinc-800 z-10 hidden md:block transition-colors">
        <div className="p-6 flex flex-col h-full">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Package className="text-white w-5 h-5" />
              </div>
              <h1 className="font-bold text-lg tracking-tight dark:text-white">{user?.establishment_name || 'StockFlow'}</h1>
            </div>
            <button 
              type="button"
              onClick={() => setDarkMode(!darkMode)}
              aria-label="Alternar tema"
              className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors text-gray-500 dark:text-gray-400"
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>

          <nav className="space-y-1 flex-1">
            <button 
              type="button"
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'dashboard' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800'}`}
            >
              <LayoutDashboard size={20} />
              <span className="font-medium">Dashboard</span>
            </button>
            <button 
              type="button"
              onClick={() => setActiveTab('inventory')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'inventory' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800'}`}
            >
              <Package size={20} />
              <span className="font-medium">Inventário</span>
            </button>
            {user?.role !== 'colaborador' && (
              <>
                <button 
                  type="button"
                  onClick={() => setActiveTab('informativo')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'informativo' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800'}`}
                >
                  <TrendingUp size={20} />
                  <span className="font-medium">Informativo</span>
                </button>
              </>
            )}
            <button 
              type="button"
              onClick={() => setActiveTab('financeiro')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'financeiro' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800'}`}
            >
              <DollarSign size={20} />
              <span className="font-medium">Financeiro</span>
            </button>
            <button 
              type="button"
              onClick={() => setActiveTab('manual')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'manual' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800'}`}
            >
              <BookOpen size={20} />
              <span className="font-medium">Ajuda/Manual</span>
            </button>
            {user?.role === 'admin' && (
              <button 
                type="button"
                onClick={() => setActiveTab('admin')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'admin' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-blue-500 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10'}`}
              >
                <ShieldCheck size={20} />
                <span className="font-medium">Admin</span>
              </button>
            )}
          </nav>

          <button 
            type="button"
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all mt-auto"
          >
            <ArrowUpCircle size={20} className="rotate-90" />
            <span className="font-medium">Sair</span>
          </button>
        </div>
      </aside>

      {/* Mobile Action Menu Overlay */}
      <AnimatePresence>
        {showMobileMenu && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMobileMenu(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 md:hidden"
            />
            <motion.div 
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="fixed bottom-0 left-0 right-0 bg-white dark:bg-zinc-900 rounded-t-[2.5rem] p-8 pb-32 shadow-2xl z-40 md:hidden border-t border-gray-100 dark:border-zinc-800"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="font-bold text-lg dark:text-white">Ações Rápidas</h3>
                <button 
                  type="button"
                  onClick={() => setShowMobileMenu(false)}
                  className="p-2 bg-gray-100 dark:bg-zinc-800 rounded-full text-gray-500"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button 
                  type="button"
                  onClick={() => { onShowTransaction('ENTRY'); setShowMobileMenu(false); }}
                  className="flex flex-col items-center gap-3 p-6 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 rounded-3xl transition-all active:scale-95 border border-emerald-100 dark:border-emerald-500/20"
                >
                  <div className="w-12 h-12 bg-emerald-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                    <ArrowDownCircle size={28} />
                  </div>
                  <div className="text-center">
                    <span className="block text-sm font-bold">Entrada</span>
                    <span className="text-[10px] opacity-60 uppercase tracking-tighter">Reposição</span>
                  </div>
                </button>
                <button 
                  type="button"
                  onClick={() => { onShowTransaction('EXIT'); setShowMobileMenu(false); }}
                  className="flex flex-col items-center gap-3 p-6 bg-rose-50 dark:bg-rose-500/10 text-rose-600 rounded-3xl transition-all active:scale-95 border border-rose-100 dark:border-rose-500/20"
                >
                  <div className="w-12 h-12 bg-rose-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-rose-500/20">
                    <ArrowUpCircle size={28} />
                  </div>
                  <div className="text-center">
                    <span className="block text-sm font-bold">Saída</span>
                    <span className="text-[10px] opacity-60 uppercase tracking-tighter">Venda/Uso</span>
                  </div>
                </button>
                <button 
                  type="button"
                  onClick={() => { onShowAddProduct(); setShowMobileMenu(false); }}
                  className="col-span-2 flex items-center justify-between gap-4 p-5 bg-gray-50 dark:bg-zinc-800 text-gray-700 dark:text-gray-200 rounded-3xl transition-all active:scale-95 border border-gray-200 dark:border-zinc-700"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-black dark:bg-white text-white dark:text-black rounded-xl flex items-center justify-center">
                      <Plus size={24} />
                    </div>
                    <div className="text-left">
                      <span className="block text-sm font-bold">Novo Produto</span>
                      <span className="text-[10px] opacity-60 uppercase tracking-tighter">Cadastrar SKU</span>
                    </div>
                  </div>
                  <ArrowRight size={20} className="opacity-40" />
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Bottom Navigation - Mobile Only */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-lg border-t border-[#E5E7EB] dark:border-zinc-800 z-20 flex justify-around items-center px-2 py-3 md:hidden transition-colors safe-area-bottom">
        <button 
          type="button"
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center gap-1 transition-all flex-1 ${activeTab === 'dashboard' ? 'text-black dark:text-white' : 'text-gray-400'}`}
        >
          <LayoutDashboard size={22} className={activeTab === 'dashboard' ? 'scale-110' : ''} />
          <span className="text-[10px] font-bold uppercase tracking-tighter">Home</span>
        </button>
        
        <button 
          type="button"
          onClick={() => setActiveTab('inventory')}
          className={`flex flex-col items-center gap-1 transition-all flex-1 ${activeTab === 'inventory' ? 'text-black dark:text-white' : 'text-gray-400'}`}
        >
          <Package size={22} className={activeTab === 'inventory' ? 'scale-110' : ''} />
          <span className="text-[10px] font-bold uppercase tracking-tighter">Estoque</span>
        </button>

        <div className="relative -mt-10 flex-1 flex justify-center">
          <button 
            type="button"
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className={`w-14 h-14 rounded-full flex items-center justify-center shadow-xl border-4 border-[#F8F9FA] dark:border-zinc-950 active:scale-90 transition-all ${showMobileMenu ? 'bg-rose-500 text-white rotate-45' : 'bg-black dark:bg-white text-white dark:text-black'}`}
          >
            {showMobileMenu ? <X size={28} /> : <Plus size={28} />}
          </button>
        </div>

        <button 
          type="button"
          onClick={() => setActiveTab('financeiro')}
          className={`flex flex-col items-center gap-1 transition-all flex-1 ${activeTab === 'financeiro' ? 'text-black dark:text-white' : 'text-gray-400'}`}
        >
          <DollarSign size={22} className={activeTab === 'financeiro' ? 'scale-110' : ''} />
          <span className="text-[10px] font-bold uppercase tracking-tighter">Contas</span>
        </button>

        <button 
          type="button"
          onClick={() => setActiveTab('manual')}
          className={`flex flex-col items-center gap-1 transition-all flex-1 ${activeTab === 'manual' ? 'text-black dark:text-white' : 'text-gray-400'}`}
        >
          <BookOpen size={22} className={activeTab === 'manual' ? 'scale-110' : ''} />
          <span className="text-[10px] font-bold uppercase tracking-tighter">Ajuda</span>
        </button>
        {user?.role === 'admin' && (
          <button 
            type="button"
            onClick={() => setActiveTab('admin')}
            className={`flex flex-col items-center gap-1 transition-all flex-1 ${activeTab === 'admin' ? 'text-blue-600' : 'text-gray-400'}`}
          >
            <ShieldCheck size={22} className={activeTab === 'admin' ? 'scale-110' : ''} />
            <span className="text-[10px] font-bold uppercase tracking-tighter">Admin</span>
          </button>
        )}
      </nav>
    </>
  );
};
