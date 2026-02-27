import React, { useState } from 'react';
import { TrendingUp, AlertTriangle, Package, Calendar, Clock, Lightbulb, Bell } from 'lucide-react';
import { Product, Stats, MonthlyStat, User } from '../types';
import { formatBRL } from '../utils/format';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { OpportunityRadarModal } from './OpportunityRadarModal';

interface DashboardProps {
  products: Product[];
  stats: Stats;
  monthlyStats: MonthlyStat[];
  evolutionPeriod: 'day' | 'week' | 'month' | 'quarter' | 'custom';
  setEvolutionPeriod: (period: 'day' | 'week' | 'month' | 'quarter' | 'custom') => void;
  customDateRange: { start: string; end: string };
  setCustomDateRange: (range: { start: string; end: string }) => void;
  darkMode: boolean;
  onViewFinanceiro: () => void;
  user: User | null;
}

export const Dashboard: React.FC<DashboardProps> = ({ 
  products, 
  stats, 
  monthlyStats, 
  evolutionPeriod, 
  setEvolutionPeriod,
  customDateRange,
  setCustomDateRange,
  darkMode,
  onViewFinanceiro,
  user
}) => {
  const isColaborador = user?.role === 'colaborador';
  const lowStockProducts = products.filter(p => p.current_stock <= p.min_stock);
  const totalValue = products.reduce((acc, p) => acc + (p.current_stock * p.average_cost), 0);
  
  const expiringProducts = products.filter(p => {
    if (!p.expiry_date) return false;
    const expiry = new Date(p.expiry_date);
    const today = new Date();
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 90;
  }).sort((a, b) => new Date(a.expiry_date!).getTime() - new Date(b.expiry_date!).getTime());
  
  const [showRadarModal, setShowRadarModal] = useState(false);
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Format labels based on period with memoization
  const formattedMonthlyData = React.useMemo(() => {
    if (!monthlyStats) return [];
    
    return monthlyStats.map(item => {
      let displayLabel = item.month;
      
      try {
        if (evolutionPeriod === 'month') {
          const [year, month] = item.month.split('-');
          const date = new Date(parseInt(year), parseInt(month) - 1);
          displayLabel = date.toLocaleString('pt-BR', { month: 'short' }).replace('.', '');
          displayLabel = displayLabel.charAt(0).toUpperCase() + displayLabel.slice(1);
        } else if (evolutionPeriod === 'day' || evolutionPeriod === 'custom') {
          const [year, month, day] = item.month.split('-');
          displayLabel = `${day}/${month}`;
        } else if (evolutionPeriod === 'week') {
          const [year, week] = item.month.split('-');
          displayLabel = isMobile ? `S${week}` : `Sem ${week}`;
        } else if (evolutionPeriod === 'quarter') {
          displayLabel = isMobile ? item.month.split('-')[1] : item.month.replace('-', ' ');
        }
      } catch (e) {
        console.error("Erro ao formatar data:", e);
      }

      return {
        ...item,
        displayMonth: displayLabel
      };
    });
  }, [monthlyStats, evolutionPeriod, isMobile]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Visão Geral</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Acompanhe o desempenho da sua loja.</p>
        </div>
        <button 
          onClick={() => {
            if (expiringProducts.length > 0) {
              document.getElementById('expiring-section')?.scrollIntoView({ behavior: 'smooth' });
            }
          }}
          className="relative p-3 bg-white dark:bg-zinc-900 rounded-xl border border-gray-100 dark:border-zinc-800 shadow-sm hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
          title={expiringProducts.length > 0 ? `${expiringProducts.length} produtos vencendo em breve` : 'Nenhuma notificação'}
        >
          <Bell size={20} className="text-gray-500 dark:text-gray-400" />
          {expiringProducts.length > 0 && (
            <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-amber-500 rounded-full animate-pulse border-2 border-white dark:border-zinc-900"></span>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {!isColaborador && (
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm transition-colors">
            <p className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-1">Valor em Estoque</p>
            <h3 className="text-2xl font-bold dark:text-white">{formatBRL(totalValue)}</h3>
            <div className="mt-4 flex items-center gap-2 text-emerald-600 text-xs font-bold">
              <TrendingUp size={14} />
              <span>Patrimônio atual</span>
            </div>
          </div>
        )}
        {!isColaborador && (
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm transition-colors">
            <p className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-1">Lucro Realizado</p>
            <h3 className={`text-2xl font-bold ${stats?.realized_profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatBRL(stats?.realized_profit || 0)}</h3>
            <div className="mt-4 flex items-center gap-2 text-emerald-600 text-xs font-bold">
              <TrendingUp size={14} />
              <span>Vendas Pagas</span>
            </div>
          </div>
        )}
        {!isColaborador && (
          <button 
            onClick={onViewFinanceiro}
            className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm transition-all hover:shadow-md hover:border-amber-200 dark:hover:border-amber-500/30 text-left group"
          >
            <p className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-1 group-hover:text-amber-600 transition-colors">Lucro a Receber</p>
            <h3 className={`text-2xl font-bold ${stats?.pending_profit >= 0 ? 'text-amber-500' : 'text-rose-600'}`}>{formatBRL(stats?.pending_profit || 0)}</h3>
            <div className="mt-4 flex items-center gap-2 text-amber-500 text-xs font-bold">
              <Clock size={14} />
              <span>Ver detalhes</span>
            </div>
          </button>
        )}
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm transition-colors">
          <p className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-1">Baixo Estoque</p>
          <h3 className="text-2xl font-bold text-rose-600">{lowStockProducts.length}</h3>
          <div className="mt-4 flex items-center gap-2 text-rose-600 text-xs font-bold">
            <AlertTriangle size={14} />
            <span>Itens críticos</span>
          </div>
        </div>
        {!isColaborador && (
          <button
            onClick={() => setShowRadarModal(true)}
            className="bg-blue-50 dark:bg-blue-500/10 p-6 rounded-2xl border border-blue-100 dark:border-blue-500/20 shadow-sm transition-all hover:shadow-md hover:bg-blue-100 dark:hover:bg-blue-500/20 text-left group col-span-1 md:col-span-2 lg:col-span-2"
          >
            <div className="flex items-center gap-3 text-blue-600 dark:text-blue-400 mb-2">
              <Lightbulb size={18} />
              <span className="text-xs font-bold uppercase tracking-wider">Radar de Oportunidades</span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Dicas iTrust</h3>
            <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">
              Clique para ver dicas de como aumentar seu lucro e girar seu estoque.
            </p>
          </button>
        )}
        <div className={`bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm transition-colors col-span-1 ${!isColaborador ? 'md:col-span-2 lg:col-span-2' : ''}`}>
          <p className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-1">Total de SKUs</p>
          <h3 className="text-2xl font-bold dark:text-white">{products.length}</h3>
          <div className="mt-4 flex items-center gap-2 text-gray-400 dark:text-gray-500 text-xs font-bold">
            <Package size={14} />
            <span>Itens cadastrados</span>
          </div>
        </div>
      </div>

      {/* Gráfico de Evolução Mensal */}
      {!isColaborador && (
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm transition-colors">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-2">
              <Calendar className="text-black dark:text-white" size={20} />
              <h3 className="font-bold text-lg dark:text-white">Evolução do Lucro</h3>
            </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex bg-gray-100 dark:bg-zinc-800 p-1 rounded-xl">
              <button 
                onClick={() => setEvolutionPeriod('day')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${evolutionPeriod === 'day' ? 'bg-white dark:bg-zinc-700 text-black dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
              >
                Dia
              </button>
              <button 
                onClick={() => setEvolutionPeriod('week')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${evolutionPeriod === 'week' ? 'bg-white dark:bg-zinc-700 text-black dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
              >
                Sem
              </button>
              <button 
                onClick={() => setEvolutionPeriod('month')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${evolutionPeriod === 'month' ? 'bg-white dark:bg-zinc-700 text-black dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
              >
                Mês
              </button>
              <button 
                onClick={() => setEvolutionPeriod('quarter')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${evolutionPeriod === 'quarter' ? 'bg-white dark:bg-zinc-700 text-black dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
              >
                Trim
              </button>
               <button 
                onClick={() => setEvolutionPeriod('custom')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${evolutionPeriod === 'custom' ? 'bg-white dark:bg-zinc-700 text-black dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
              >
                Personalizado
              </button>
            </div>
            
            {evolutionPeriod === 'custom' && (
              <div className="flex items-center gap-2 bg-gray-100 dark:bg-zinc-800 p-1 rounded-xl animate-in fade-in slide-in-from-left-4 duration-200">
                <input 
                  type="date" 
                  value={customDateRange.start}
                  onChange={(e) => setCustomDateRange({ ...customDateRange, start: e.target.value })}
                  className="bg-transparent text-xs font-bold text-gray-600 dark:text-gray-300 outline-none px-2 py-1 border-none focus:ring-0"
                />
                <span className="text-gray-400 text-xs">até</span>
                <input 
                  type="date" 
                  value={customDateRange.end}
                  onChange={(e) => setCustomDateRange({ ...customDateRange, end: e.target.value })}
                  className="bg-transparent text-xs font-bold text-gray-600 dark:text-gray-300 outline-none px-2 py-1 border-none focus:ring-0"
                />
              </div>
            )}
          </div>
          </div>
          
          <div className="h-72 w-full">
            {formattedMonthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={formattedMonthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? "#27272a" : "#f3f4f6"} />
                  <XAxis 
                    dataKey="displayMonth" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fill: '#9ca3af' }}
                    dy={10}
                    interval="preserveStartEnd"
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fill: '#9ca3af' }}
                    tickFormatter={(value) => `R$ ${value}`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: '12px', 
                      border: 'none', 
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                      fontSize: '14px',
                      backgroundColor: darkMode ? '#18181b' : '#ffffff',
                      color: darkMode ? '#ffffff' : '#000000'
                    }}
                    itemStyle={{ color: '#10b981' }}
                    formatter={(value: number) => [formatBRL(value), 'Lucro']}
                    labelStyle={{ fontWeight: 'bold', marginBottom: '4px', color: darkMode ? '#ffffff' : '#000000' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="profit" 
                    stroke="#10b981" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorProfit)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                Sem dados para o período selecionado
              </div>
            )}
          </div>
        </div>
      )}

      {lowStockProducts.length > 0 && (
        <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 rounded-2xl p-6 transition-colors">
          <div className="flex items-center gap-2 mb-4 text-rose-800 dark:text-rose-400">
            <AlertTriangle size={20} />
            <h3 className="font-bold">Alertas de Reposição</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {lowStockProducts.map(p => (
              <div key={p.id} className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-rose-200 dark:border-rose-500/30 flex justify-between items-center transition-colors">
                <div>
                  <p className="font-bold text-sm dark:text-white">{p.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">SKU: {p.sku}</p>
                </div>
                <div className="text-right">
                  <p className="text-rose-600 dark:text-rose-400 font-bold text-sm">{p.current_stock} un</p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">Mín: {p.min_stock}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {expiringProducts.length > 0 && (
        <div id="expiring-section" className="bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 rounded-2xl p-6 transition-colors">
          <div className="flex items-center gap-2 mb-4 text-amber-800 dark:text-amber-400">
            <Clock size={20} />
            <h3 className="font-bold">Vencimento Próximo (90 dias)</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {expiringProducts.map(p => {
               const diffTime = new Date(p.expiry_date!).getTime() - new Date().getTime();
               const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
               
               return (
              <div key={p.id} className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-amber-200 dark:border-amber-500/30 flex flex-col gap-2 transition-colors">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-sm dark:text-white">{p.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">SKU: {p.sku}</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold text-sm ${diffDays <= 30 ? 'text-rose-600' : 'text-amber-600 dark:text-amber-400'}`}>{diffDays} dias</p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">Restantes</p>
                  </div>
                </div>
                <div className="bg-amber-100 dark:bg-amber-900/30 p-2 rounded-lg mt-1">
                    <p className="text-[10px] font-bold text-amber-800 dark:text-amber-200 flex items-center gap-1">
                        <Lightbulb size={12} />
                        Dica de Venda:
                    </p>
                    <p className="text-[10px] text-amber-700 dark:text-amber-300 leading-tight">
                        {diffDays <= 30 ? "Liquidação Urgente! Desconto de 30-50%." : 
                         diffDays <= 60 ? "Crie combos com produtos de alto giro." : 
                         "Coloque em destaque na área de promoções."}
                    </p>
                </div>
              </div>
            )})}
          </div>
        </div>
      )}

      <OpportunityRadarModal isOpen={showRadarModal} onClose={() => setShowRadarModal(false)} />
    </div>
  );
};
