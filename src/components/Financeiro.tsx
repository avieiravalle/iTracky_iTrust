import React from 'react';
import { 
  DollarSign, 
  Clock, 
  CheckCircle2, 
  User as UserIcon, 
  Package, 
  ArrowRight,
  Wallet,
  Plus,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Receivable, Stats, User } from '../types';
import { motion } from 'motion/react';
import { formatBRL } from '../utils/format';

interface FinanceiroProps {
  receivables: Receivable[];
  stats: Stats;
  onMarkAsPaid: (id: number, amount?: number) => void;
  onNewSale: () => void;
  user: User | null;
}

export const Financeiro: React.FC<FinanceiroProps> = ({ receivables, stats, onMarkAsPaid, onNewSale, user }) => {
  const isColaborador = user?.role === 'colaborador';
  const [partialPayment, setPartialPayment] = React.useState<{ id: number, amount: string } | null>(null);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [itemsPerPage, setItemsPerPage] = React.useState(4);

  // Lógica de Paginação
  const totalPages = Math.ceil(receivables.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentReceivables = receivables.slice(startIndex, startIndex + itemsPerPage);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  React.useEffect(() => {
    setCurrentPage(1);
  }, [itemsPerPage]);
  const handlePartialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (partialPayment && partialPayment.amount) {
      onMarkAsPaid(partialPayment.id, parseFloat(partialPayment.amount));
      setPartialPayment(null);
    }
  };

  const totalReceivable = receivables.reduce((acc, r) => acc + (r.unit_cost * r.quantity - (r.amount_paid || 0)), 0);
  const totalExpectedProfit = receivables.reduce((acc, r) => acc + r.expected_profit, 0);

  return (
    <div className="space-y-6">
      {/* Resumo Financeiro */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {!isColaborador && (
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm transition-colors">
            <div className="flex items-center gap-2 text-emerald-600 mb-2">
              <CheckCircle2 size={18} />
              <span className="text-xs font-bold uppercase tracking-wider">Lucro Realizado</span>
            </div>
            <h3 className={`text-2xl font-bold ${stats.realized_profit >= 0 ? 'text-gray-900 dark:text-white' : 'text-rose-600'}`}>
              {formatBRL(stats.realized_profit)}
            </h3>
            <p className="text-gray-400 text-[10px] mt-1 uppercase">Valores já recebidos</p>
          </div>
        )}

        {!isColaborador && (
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm transition-colors">
            <div className="flex items-center gap-2 text-amber-500 mb-2">
              <Clock size={18} />
              <span className="text-xs font-bold uppercase tracking-wider">A Receber (Lucro)</span>
            </div>
            <h3 className={`text-2xl font-bold ${stats.pending_profit >= 0 ? 'text-gray-900 dark:text-white' : 'text-rose-600'}`}>
              {formatBRL(stats.pending_profit)}
            </h3>
            <p className="text-gray-400 text-[10px] mt-1 uppercase">Lucro projetado pendente</p>
          </div>
        )}

        <div className="bg-black dark:bg-white p-6 rounded-2xl shadow-lg shadow-black/10 transition-colors">
          <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500 mb-2">
            <Wallet size={18} />
            <span className="text-xs font-bold uppercase tracking-wider">Total a Receber</span>
          </div>
          <h3 className="text-2xl font-bold text-white dark:text-black">
            {formatBRL(totalReceivable)}
          </h3>
          <p className="text-gray-500 dark:text-gray-400 text-[10px] mt-1 uppercase">Valor bruto das vendas pendentes</p>
        </div>
      </div>

      {/* Lista de Valores a Receber */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm overflow-hidden transition-colors">
        <div className="p-6 border-b border-gray-50 dark:border-zinc-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-2">
            <DollarSign className="text-amber-500" size={20} />
            <h3 className="font-bold text-lg dark:text-white">Contas a Receber</h3>
            <span className="bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[10px] font-bold px-2 py-1 rounded-lg uppercase">
              {receivables.length} Pendentes
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 self-end sm:self-center">
              <label htmlFor="itemsPerPageFin" className="text-xs text-gray-500 dark:text-gray-400">Itens por pág:</label>
              <select
                  id="itemsPerPageFin"
                  value={itemsPerPage}
                  onChange={(e) => setItemsPerPage(Number(e.target.value))}
                  className="bg-gray-50 dark:bg-zinc-800 border-none rounded-md text-xs font-bold focus:ring-2 focus:ring-black/5 dark:focus:ring-white/5 outline-none py-1"
              >
                  <option value={4}>4</option>
                  <option value={10}>10</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto hidden md:block">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-gray-50/50 dark:bg-zinc-800/50 text-[11px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-bold">
                <th className="px-6 py-4">Cliente / Data</th>
                <th className="px-6 py-4">Produto</th>
                <th className="px-6 py-4 text-center">Qtd</th>
                <th className="px-6 py-4 text-right">Valor Venda</th>
                {!isColaborador && <th className="px-6 py-4 text-right">Lucro Previsto</th>}
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-zinc-800">
              {currentReceivables.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 mb-1">
                      <UserIcon size={14} className="text-gray-400 dark:text-gray-500" />
                      <p className="font-bold text-sm text-gray-900 dark:text-white">{r.client_name || 'Consumidor Final'}</p>
                    </div>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">
                      {new Date(r.timestamp).toLocaleDateString('pt-BR')} às {new Date(r.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Package size={14} className="text-gray-400 dark:text-gray-500" />
                      <div>
                        <p className="font-bold text-sm text-gray-700 dark:text-gray-300">{r.product_name}</p>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 font-mono">{r.product_sku}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center text-sm font-medium text-gray-700 dark:text-gray-300">
                    {r.quantity}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <p className="font-bold text-sm text-gray-900 dark:text-white">
                      {formatBRL(r.unit_cost * r.quantity)}
                    </p>
                    {r.amount_paid > 0 && (
                      <p className="text-[10px] text-emerald-600 font-bold">
                        Pago: {formatBRL(r.amount_paid)}
                      </p>
                    )}
                    <p className="text-[10px] text-gray-400 dark:text-gray-500">Saldo: {formatBRL(r.unit_cost * r.quantity - r.amount_paid)}</p>
                  </td>
                  {!isColaborador && (
                    <td className="px-6 py-4 text-right">
                      <p className={`font-bold text-sm ${r.expected_profit >= 0 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {formatBRL(r.expected_profit)}
                      </p>
                    </td>
                  )}
                  <td className="px-6 py-4 text-right space-y-2">
                    {partialPayment?.id === r.id ? (
                      <form onSubmit={handlePartialSubmit} className="flex items-center gap-2 justify-end">
                        <input 
                          type="number" 
                          step="0.01" 
                          autoFocus
                          value={partialPayment.amount || ''}
                          onChange={(e) => setPartialPayment({ ...partialPayment, amount: e.target.value })}
                          className="w-24 px-2 py-1 text-xs border border-gray-200 dark:border-zinc-700 rounded bg-white dark:bg-zinc-800 dark:text-white outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="Valor"
                        />
                        <button type="submit" className="p-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded">
                          <CheckCircle2 size={16} />
                        </button>
                        <button type="button" onClick={() => setPartialPayment(null)} className="p-1 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded">
                          <Plus size={16} className="rotate-45" />
                        </button>
                      </form>
                    ) : (
                      <div className="flex items-center gap-2 justify-end">
                        <button 
                          type="button"
                          onClick={() => setPartialPayment({ id: r.id, amount: '' })}
                          className="text-[10px] font-bold uppercase text-blue-600 hover:underline"
                        >
                          Parcial
                        </button>
                        <button 
                          type="button"
                          onClick={() => onMarkAsPaid(r.id)}
                          className="inline-flex items-center gap-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors"
                        >
                          <CheckCircle2 size={14} />
                          Quitar
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {currentReceivables.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-gray-400 dark:text-gray-600">
                      <DollarSign size={32} strokeWidth={1.5} />
                      <p className="text-sm">Nenhum valor a receber pendente.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Controles de Paginação */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-50 dark:border-zinc-800 flex items-center justify-between">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {startIndex + 1}-{Math.min(startIndex + itemsPerPage, receivables.length)} de {receivables.length}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed text-gray-600 dark:text-gray-400"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed text-gray-600 dark:text-gray-400"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* Mobile Card Layout */}
        <div className="md:hidden divide-y divide-gray-50 dark:divide-zinc-800">
          {currentReceivables.map((r) => (
            <div key={r.id} className="p-4 space-y-4">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gray-100 dark:bg-zinc-800 rounded-lg flex items-center justify-center">
                    <UserIcon size={16} className="text-gray-500" />
                  </div>
                  <div>
                    <p className="font-bold text-sm dark:text-white">{r.client_name || 'Consumidor Final'}</p>
                    <p className="text-[10px] text-gray-400">{new Date(r.timestamp).toLocaleDateString('pt-BR')}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-gray-400 uppercase font-bold">Saldo</p>
                  <p className="font-bold text-sm text-rose-600">{formatBRL(r.unit_cost * r.quantity - r.amount_paid)}</p>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-zinc-800/50 p-3 rounded-2xl space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Produto</span>
                  <span className="font-bold dark:text-white">{r.product_name}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Quantidade</span>
                  <span className="font-bold dark:text-white">{r.quantity} un</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Total Venda</span>
                  <span className="font-bold dark:text-white">{formatBRL(r.unit_cost * r.quantity)}</span>
                </div>
                {r.amount_paid > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-emerald-600 font-bold">Já Pago</span>
                    <span className="font-bold text-emerald-600">{formatBRL(r.amount_paid)}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                {partialPayment?.id === r.id ? (
                  <form onSubmit={handlePartialSubmit} className="flex-1 flex items-center gap-2">
                    <input 
                      type="number" 
                      step="0.01" 
                      autoFocus
                      value={partialPayment.amount}
                      onChange={(e) => setPartialPayment({ ...partialPayment, amount: e.target.value })}
                      className="flex-1 px-4 py-2 text-sm border border-gray-200 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20"
                      placeholder="Valor pago"
                    />
                    <button type="submit" className="p-2 bg-emerald-500 text-white rounded-xl">
                      <CheckCircle2 size={20} />
                    </button>
                    <button type="button" onClick={() => setPartialPayment(null)} className="p-2 bg-rose-500 text-white rounded-xl">
                      <Plus size={20} className="rotate-45" />
                    </button>
                  </form>
                ) : (
                  <>
                    <button 
                      type="button"
                      onClick={() => setPartialPayment({ id: r.id, amount: '' })}
                      className="flex-1 py-2.5 bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold uppercase tracking-wider"
                    >
                      Pag. Parcial
                    </button>
                    <button 
                      type="button"
                      onClick={() => onMarkAsPaid(r.id)}
                      className="flex-1 py-2.5 bg-emerald-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-emerald-500/20"
                    >
                      Quitar Tudo
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
          {currentReceivables.length === 0 && (
            <div className="p-12 text-center text-gray-400">
              <p>Nenhuma conta pendente.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
