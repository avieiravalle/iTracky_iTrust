import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Package, ArrowUpCircle, ArrowDownCircle, Plus, TrendingUp, DollarSign, BookOpen, Sun, Moon, ShieldCheck, X, ArrowRight, Download, Share, Store, ArrowLeftRight, FileText, Users, Settings, ChevronLeft, ChevronRight } from 'lucide-react';
import { User } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface SidebarProps {
  user: User | null;
  activeTab: string;
  setActiveTab: (tab: 'dashboard' | 'inventory' | 'transactions' | 'informativo' | 'financeiro' | 'manual' | 'admin' | 'pdv' | 'team' | 'settings') => void;
  onLogout: () => void;
  onShowTransaction: (type: 'ENTRY' | 'EXIT') => void;
  onShowAddProduct: () => void;
  onShowReportModal: () => void;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  appMode?: 'full' | 'pos_finance';
  onSwitchMode?: () => void;
  isCollapsed?: boolean;
  toggleSidebar?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  user, 
  activeTab, 
  setActiveTab, 
  onLogout,
  onShowTransaction,
  onShowAddProduct,
  onShowReportModal,
  darkMode,
  setDarkMode,
  appMode = 'full',
  onSwitchMode,
  isCollapsed = false,
  toggleSidebar
}) => {
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isIos, setIsIos] = useState(false);
  const [showIosInstructions, setShowIosInstructions] = useState(false);
  const [showLogoutConfirmation, setShowLogoutConfirmation] = useState(false);

  useEffect(() => {
    // Detectar iOS e verificar se já não está instalado (standalone)
    const isIosDevice = /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    if (isIosDevice && !isStandalone) {
      setIsIos(true);
    }

    const handler = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    installPrompt.userChoice.then((choice: any) => {
      if (choice.outcome === 'accepted') {
        setInstallPrompt(null);
      }
    });
  };

  return (
    <>
      {/* Sidebar - Desktop Only */}
      <aside 
        className={`fixed left-0 top-0 h-full bg-[#1A3A5F] border-r border-white/10 z-10 hidden md:block transition-all duration-300 shadow-2xl ${isCollapsed ? 'w-20' : 'w-64'}`} 
        style={{ backgroundColor: 'var(--color-primary, #1A3A5F)' }}
      >
        {toggleSidebar && (
          <button onClick={toggleSidebar} className="absolute -right-3 top-9 bg-white dark:bg-zinc-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-zinc-700 rounded-full p-1 shadow-md hover:text-blue-600 transition-colors z-50">
            {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        )}
        <div className={`flex flex-col h-full transition-all duration-300 ${isCollapsed ? 'p-3' : 'p-6'}`}>
          <div className={`flex items-center mb-8 transition-all ${isCollapsed ? 'flex-col gap-4 justify-center' : 'justify-between'}`}>
            <div className="flex items-center gap-2">
              {(user as any)?.logo_url ? (
                <img src={(user as any).logo_url} alt="Logo" className="w-10 h-10 rounded-xl object-cover bg-white shrink-0" />
              ) : (
                <div className="w-10 h-10 bg-[#00D4FF] rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/20" style={{ backgroundColor: 'var(--color-accent, #00D4FF)' }}>
                  <Package className="text-[#1A3A5F] w-6 h-6" style={{ color: 'var(--color-primary, #1A3A5F)' }} />
                </div>
              )}
              {!isCollapsed && <h1 className="font-bold text-lg tracking-tight text-white truncate max-w-[120px]">{user?.establishment_name || 'iTrust'}</h1>}
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
            {appMode === 'full' && (
              <button 
                type="button"
                onClick={() => setActiveTab('manual')}
                className={`w-full flex items-center gap-3 py-3 rounded-xl transition-all font-medium ${isCollapsed ? 'justify-center px-2' : 'px-4'} ${activeTab === 'manual' ? 'bg-white/10 text-white' : 'text-gray-300 hover:bg-white/5 hover:text-white'}`}
                style={activeTab === 'manual' ? { backgroundColor: 'rgba(255,255,255,0.1)', color: 'var(--color-accent, #00D4FF)' } : {}}
              >
                <BookOpen size={20} />
                {!isCollapsed && <span className="font-medium">Ajuda/Manual</span>}
              </button>
            )}
            {appMode === 'full' && (
              <button 
                type="button"
                onClick={() => setActiveTab('dashboard')}
                className={`w-full flex items-center gap-3 py-3 rounded-xl transition-all font-medium ${isCollapsed ? 'justify-center px-2' : 'px-4'} ${activeTab === 'dashboard' ? 'bg-white/10 text-white' : 'text-gray-300 hover:bg-white/5 hover:text-white'}`}
                style={activeTab === 'dashboard' ? { backgroundColor: 'rgba(255,255,255,0.1)', color: 'var(--color-accent, #00D4FF)' } : {}}
              >
                <LayoutDashboard size={20} />
                {!isCollapsed && <span className="font-medium">Dashboard</span>}
              </button>
            )}
            <button 
              type="button"
              onClick={() => setActiveTab('financeiro')}
              className={`w-full flex items-center gap-3 py-3 rounded-xl transition-all font-medium ${isCollapsed ? 'justify-center px-2' : 'px-4'} ${activeTab === 'financeiro' ? 'bg-white/10 text-white' : 'text-gray-300 hover:bg-white/5 hover:text-white'}`}
              style={activeTab === 'financeiro' ? { backgroundColor: 'rgba(255,255,255,0.1)', color: 'var(--color-accent, #00D4FF)' } : {}}
            >
              <DollarSign size={20} />
              {!isCollapsed && <span className="font-medium">Financeiro</span>}
            </button>
            <button 
              type="button"
              onClick={() => setActiveTab('pdv')}
              className={`w-full flex items-center gap-3 py-3 rounded-xl transition-all font-medium ${isCollapsed ? 'justify-center px-2' : 'px-4'} ${activeTab === 'pdv' ? 'bg-white/10 text-white' : 'text-gray-300 hover:bg-white/5 hover:text-white'}`}
              style={activeTab === 'pdv' ? { backgroundColor: 'rgba(255,255,255,0.1)', color: 'var(--color-accent, #00D4FF)' } : {}}
            >
              <Store size={20} />
              {!isCollapsed && <span className="font-medium">Frente de Caixa</span>}
            </button>
            {user?.role !== 'colaborador' && appMode === 'full' && (
              <button 
                type="button"
                onClick={() => setActiveTab('informativo')}
                className={`w-full flex items-center gap-3 py-3 rounded-xl transition-all font-medium ${isCollapsed ? 'justify-center px-2' : 'px-4'} ${activeTab === 'informativo' ? 'bg-white/10 text-white' : 'text-gray-300 hover:bg-white/5 hover:text-white'}`}
                style={activeTab === 'informativo' ? { backgroundColor: 'rgba(255,255,255,0.1)', color: 'var(--color-accent, #00D4FF)' } : {}}
              >
                <TrendingUp size={20} />
                {!isCollapsed && <span className="font-medium">Informativo</span>}
              </button>
            )}
            {appMode === 'full' && (
              <button 
                type="button"
                onClick={() => setActiveTab('inventory')}
                className={`w-full flex items-center gap-3 py-3 rounded-xl transition-all font-medium ${isCollapsed ? 'justify-center px-2' : 'px-4'} ${activeTab === 'inventory' ? 'bg-white/10 text-white' : 'text-gray-300 hover:bg-white/5 hover:text-white'}`}
                style={activeTab === 'inventory' ? { backgroundColor: 'rgba(255,255,255,0.1)', color: 'var(--color-accent, #00D4FF)' } : {}}
              >
                <Package size={20} />
                {!isCollapsed && <span className="font-medium">Inventário</span>}
              </button>
            )}
            {user?.role === 'gestor' && appMode === 'full' && (
              <button 
                type="button"
                onClick={() => setActiveTab('team')}
                className={`w-full flex items-center gap-3 py-3 rounded-xl transition-all font-medium ${isCollapsed ? 'justify-center px-2' : 'px-4'} ${activeTab === 'team' ? 'bg-white/10 text-white' : 'text-gray-300 hover:bg-white/5 hover:text-white'}`}
                style={activeTab === 'team' ? { backgroundColor: 'rgba(255,255,255,0.1)', color: 'var(--color-accent, #00D4FF)' } : {}}
              >
                <Users size={20} />
                {!isCollapsed && <span className="font-medium">Gestão de Equipe</span>}
              </button>
            )}
            {user?.role === 'gestor' && appMode === 'full' && (
              <button 
                type="button"
                onClick={onShowReportModal}
                className={`w-full flex items-center gap-3 py-3 rounded-xl transition-all font-medium text-gray-300 hover:bg-white/5 hover:text-white ${isCollapsed ? 'justify-center px-2' : 'px-4'}`}
              >
                <FileText size={20} />
                {!isCollapsed && <span className="font-medium">Relatório</span>}
              </button>
            )}
            {user?.role === 'gestor' && appMode === 'full' && (
              <button 
                type="button"
                onClick={() => setActiveTab('settings')}
                className={`w-full flex items-center gap-3 py-3 rounded-xl transition-all font-medium ${isCollapsed ? 'justify-center px-2' : 'px-4'} ${activeTab === 'settings' ? 'bg-white/10 text-white' : 'text-gray-300 hover:bg-white/5 hover:text-white'}`}
                style={activeTab === 'settings' ? { backgroundColor: 'rgba(255,255,255,0.1)', color: 'var(--color-accent, #00D4FF)' } : {}}
              >
                <Settings size={20} />
                {!isCollapsed && <span>Configurações</span>}
              </button>
            )}
            {(installPrompt || isIos) && (
              <button 
                type="button"
                onClick={installPrompt ? handleInstall : () => setShowIosInstructions(true)}
                className={`w-full flex items-center gap-3 py-3 rounded-xl text-emerald-400 hover:bg-emerald-500/10 transition-all font-medium ${isCollapsed ? 'justify-center px-2' : 'px-4'}`}
              >
                <Download size={20} />
                {!isCollapsed && <span className="font-medium">Instalar App</span>}
              </button>
            )}
            {user?.role === 'admin' && appMode === 'full' && (
              <button 
                type="button"
                onClick={() => setActiveTab('admin')}
                className={`w-full flex items-center gap-3 py-3 rounded-xl transition-all font-medium ${isCollapsed ? 'justify-center px-2' : 'px-4'} ${activeTab === 'admin' ? 'bg-white/10 text-white' : 'text-gray-300 hover:bg-white/5 hover:text-white'}`}
                style={activeTab === 'admin' ? { backgroundColor: 'rgba(255,255,255,0.1)', color: 'var(--color-accent, #00D4FF)' } : {}}
              >
                <ShieldCheck size={20} />
                {!isCollapsed && <span className="font-medium">Admin</span>}
              </button>
            )}
            {user?.role === 'gestor' && onSwitchMode && (
              <button 
                type="button"
                onClick={onSwitchMode}
                className={`w-full flex items-center gap-3 py-3 rounded-xl text-gray-300 hover:bg-white/5 hover:text-white transition-all font-medium ${isCollapsed ? 'justify-center px-2' : 'px-4'}`}
              >
                <ArrowLeftRight size={20} />
                {!isCollapsed && <span className="font-medium">Trocar Modo</span>}
              </button>
            )}
          </nav>

          <button 
            type="button"
            onClick={() => setShowLogoutConfirmation(true)}
            className={`w-full flex items-center gap-3 py-3 rounded-xl text-rose-400 hover:bg-rose-500/10 transition-all mt-auto font-medium ${isCollapsed ? 'justify-center px-2' : 'px-4'}`}
          >
            <ArrowUpCircle size={20} className="rotate-90" />
            {!isCollapsed && <span className="font-medium">Sair</span>}
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
              <div className={`grid ${user?.role === 'gestor' ? 'grid-cols-3' : 'grid-cols-2'} gap-4`}>
                {user?.role === 'gestor' && (
                  <button 
                    type="button"
                    onClick={() => { onShowReportModal(); setShowMobileMenu(false); }}
                    className="flex flex-col items-center gap-3 p-6 bg-blue-50 dark:bg-blue-500/10 text-blue-600 rounded-3xl transition-all active:scale-95 border border-blue-100 dark:border-blue-500/20"
                  >
                    <div className="w-12 h-12 bg-blue-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                      <FileText size={28} />
                    </div>
                    <div className="text-center">
                      <span className="block text-sm font-bold">Relatório</span>
                      <span className="text-[10px] opacity-60 uppercase tracking-tighter">Período</span>
                    </div>
                  </button>
                )}
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
                  className={`flex items-center justify-between gap-4 p-5 bg-gray-50 dark:bg-zinc-800 text-gray-700 dark:text-gray-200 rounded-3xl transition-all active:scale-95 border border-gray-200 dark:border-zinc-700 ${user?.role === 'gestor' ? 'col-span-3' : 'col-span-2'}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-black dark:bg-white text-white dark:text-black rounded-xl flex items-center justify-center">
                      <Plus size={24} />
                    </div>
                    <div className="text-left">
                      <span className="block text-sm font-bold">Novo Produto</span>
                      <span className="text-[10px] opacity-60 uppercase tracking-tighter">Cadastrar ID</span>
                    </div>
                  </div>
                  <ArrowRight size={20} className="opacity-40" />
                </button>
                {(installPrompt || isIos) && (
                  <button 
                    type="button"
                    onClick={() => { installPrompt ? handleInstall() : setShowIosInstructions(true); setShowMobileMenu(false); }}                    className={`flex items-center justify-center gap-2 p-4 mt-2 text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-500/10 rounded-3xl border border-emerald-100 dark:border-emerald-500/20 active:scale-95 transition-all hover:bg-emerald-100 dark:hover:bg-emerald-500/20 ${user?.role === 'gestor' ? 'col-span-3' : 'col-span-2'}`}
                  >
                    <Download size={20} />
                    <span>Instalar Aplicativo</span>
                  </button>
                )}
                {user?.role === 'gestor' && onSwitchMode && (
                  <button 
                    type="button"
                    onClick={() => { onSwitchMode(); setShowMobileMenu(false); }}                    className="col-span-3 flex items-center justify-center gap-2 p-4 mt-2 text-gray-600 font-bold bg-gray-50 dark:bg-zinc-800 rounded-3xl border border-gray-200 dark:border-zinc-700 active:scale-95 transition-all"
                  >
                    <ArrowLeftRight size={20} />
                    <span>Trocar Modo de Acesso</span>
                  </button>
                )}
                <button 
                  type="button"
                  onClick={() => { setShowLogoutConfirmation(true); setShowMobileMenu(false); }}                  className={`flex items-center justify-center gap-2 p-4 mt-2 text-rose-600 font-bold bg-rose-50 dark:bg-rose-500/10 rounded-3xl border border-rose-100 dark:border-rose-500/20 active:scale-95 transition-all hover:bg-rose-100 dark:hover:bg-rose-500/20 ${user?.role === 'gestor' ? 'col-span-3' : 'col-span-2'}`}
                >
                  <ArrowUpCircle size={20} className="rotate-90" />
                  <span>Sair do Sistema</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Bottom Navigation - Mobile Only */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-lg border-t border-[#E5E7EB] dark:border-zinc-800 z-50 flex justify-around items-center px-2 py-3 md:hidden transition-colors safe-area-bottom">
        {appMode === 'full' && (
          <button 
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center gap-1 transition-all flex-1 ${activeTab === 'dashboard' ? 'text-black dark:text-white' : 'text-gray-400'}`}
          >
            <LayoutDashboard size={22} className={activeTab === 'dashboard' ? 'scale-110' : ''} />
            <span className="text-[10px] font-bold uppercase tracking-tighter">Home</span>
          </button>
        )}
        
        {appMode === 'full' && (
          <button 
            type="button"
            onClick={() => setActiveTab('inventory')}
            className={`flex flex-col items-center gap-1 transition-all flex-1 ${activeTab === 'inventory' ? 'text-black dark:text-white' : 'text-gray-400'}`}
          >
            <Package size={22} className={activeTab === 'inventory' ? 'scale-110' : ''} />
            <span className="text-[10px] font-bold uppercase tracking-tighter">Estoque</span>
          </button>
        )}

        <button 
          type="button"
          onClick={() => setActiveTab('pdv')}
          className={`flex flex-col items-center gap-1 transition-all flex-1 ${activeTab === 'pdv' ? 'text-black dark:text-white' : 'text-gray-400'}`}
        >
          <Store size={22} className={activeTab === 'pdv' ? 'scale-110' : ''} />
          <span className="text-[10px] font-bold uppercase tracking-tighter">PDV</span>
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

        {appMode === 'full' && (
          <button 
            type="button"
            onClick={() => setActiveTab('manual')}
            className={`flex flex-col items-center gap-1 transition-all flex-1 ${activeTab === 'manual' ? 'text-black dark:text-white' : 'text-gray-400'}`}
          >
            <BookOpen size={22} className={activeTab === 'manual' ? 'scale-110' : ''} />
            <span className="text-[10px] font-bold uppercase tracking-tighter">Ajuda</span>
          </button>
        )}
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

      {/* Modal de Instruções iOS */}
      <AnimatePresence>
        {showIosInstructions && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-3xl p-6 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-lg dark:text-white">Instalar no iPhone/iPad</h3>
                <button onClick={() => setShowIosInstructions(false)} className="p-2 bg-gray-100 dark:bg-zinc-800 rounded-full text-gray-500">
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-4 text-sm text-gray-600 dark:text-gray-300">
                <p>O iOS não permite instalação automática. Siga os passos:</p>
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-zinc-800 rounded-xl">
                  <span className="flex items-center justify-center w-8 h-8 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 font-bold rounded-lg shrink-0">1</span>
                  <p>Toque no botão <span className="font-bold">Compartilhar</span> <Share className="inline w-4 h-4 mx-1" /> na barra do navegador.</p>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-zinc-800 rounded-xl">
                  <span className="flex items-center justify-center w-8 h-8 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 font-bold rounded-lg shrink-0">2</span>
                  <p>Role para baixo e toque em <span className="font-bold">Adicionar à Tela de Início</span>.</p>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-zinc-800 rounded-xl">
                  <span className="flex items-center justify-center w-8 h-8 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 font-bold rounded-lg shrink-0">3</span>
                  <p>Confirme clicando em <span className="font-bold">Adicionar</span> no canto superior.</p>
                </div>
              </div>
              <button 
                onClick={() => setShowIosInstructions(false)}
                className="w-full mt-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors"
              >
                Entendi
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Confirmação de Logout */}
      <AnimatePresence>
        {showLogoutConfirmation && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-gray-100 dark:border-zinc-800"
            >
              <h3 className="font-bold text-lg dark:text-white mb-2">Sair do Sistema?</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
                Tem certeza que deseja desconectar da sua conta?
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowLogoutConfirmation(false)}
                  className="flex-1 py-3 bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => { setShowLogoutConfirmation(false); onLogout(); }}
                  className="flex-1 py-3 bg-rose-600 text-white font-bold rounded-xl hover:bg-rose-700 transition-colors shadow-lg shadow-rose-600/20"
                >
                  Sair
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
