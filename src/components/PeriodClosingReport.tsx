import { useState } from 'react';
import { Calendar, FileText, Loader2, Printer, X, TrendingUp, TrendingDown, Wallet, Package, AlertTriangle, Star, Percent, BarChart } from 'lucide-react';

interface ReportData {
  financial: {
    totalRevenue: number;
    totalReceived: number;
    accountsPayable: number;
    netBalance: number;
  };
  inventory: {
    entriesValue: number;
    entriesQuantity: number;
    exitsQuantity: number;
    cmv: number;
    criticalStockItems: { name: string; sku: string; current_stock: number; min_stock: number }[];
  };
  performance: {
    averageTicket: number;
    leadProduct: { name: string; quantitySold: number };
    contributionMargin: number;
    totalSalesTransactions: number;
  };
  period: {
    start: string;
    end: string;
    generatedAt: string;
  };
  storeName: string;
}

const today = new Date().toISOString().split('T')[0];

export function PeriodClosingReport() {
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [isLoading, setIsLoading] = useState(false);
  const [reportData, setReportData] = useState<ReportData | null>(null);

  const handleGenerateReport = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('Sessão expirada. Faça o login novamente.');
      }

      const response = await fetch(`/api/reports/period-summary?startDate=${startDate}&endDate=${endDate}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || errorData.error || 'Falha ao gerar relatório.');
      }
      const data = await response.json();
      setReportData(data);
    } catch (error) {
      alert((error as Error).message);
      setReportData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-4 no-print">
        <div className="flex-1 min-w-[150px]">
          <label htmlFor="startDate" className="text-sm font-medium text-gray-700 dark:text-gray-300">Data de Início</label>
          <input type="date" id="startDate" value={startDate} onChange={e => setStartDate(e.target.value)} className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="flex-1 min-w-[150px]">
          <label htmlFor="endDate" className="text-sm font-medium text-gray-700 dark:text-gray-300">Data de Fim</label>
          <input type="date" id="endDate" value={endDate} onChange={e => setEndDate(e.target.value)} className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <button
          onClick={handleGenerateReport}
          disabled={isLoading}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed"
        >
          {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Calendar className="w-5 h-5" />}
          Gerar Relatório
        </button>
      </div>

      {isLoading && (
        <div className="flex justify-center items-center p-16">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      )}

      {reportData && !isLoading && (
        <>
          <style>{`
            @media print {
              body * { visibility: hidden; }
              #printable-report, #printable-report * { visibility: visible; }
              #printable-report { position: absolute; left: 0; top: 0; width: 100%; height: auto; }
              .no-print { display: none !important; }
              @page { size: A4; margin: 2cm; }
            }
          `}</style>
          <div id="printable-report" className="space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-end no-print">
              <button onClick={() => window.print()} className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700">
                <Printer size={16} /> Imprimir / Salvar PDF
              </button>
            </div>
            
            <header className="text-center border-b pb-4">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{reportData.storeName}</h1>
              <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300">Relatório de Fechamento de Período</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Período de {new Date(reportData.period.start + 'T00:00:00').toLocaleDateString('pt-BR')} a {new Date(reportData.period.end + 'T00:00:00').toLocaleDateString('pt-BR')}
              </p>
            </header>

            <section>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-800 dark:text-gray-200"><Wallet size={20} /> Visão Financeira</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-gray-50 dark:bg-zinc-800/50 rounded-lg text-center"><p className="text-sm text-gray-600 dark:text-gray-400">Faturamento Bruto</p><p className="text-xl font-bold text-gray-800 dark:text-gray-200">{formatCurrency(reportData.financial.totalRevenue)}</p></div>
                <div className="p-4 bg-green-50 dark:bg-green-500/10 rounded-lg text-center"><p className="text-sm text-green-800 dark:text-green-300">Recebimentos (Caixa)</p><p className="text-xl font-bold text-green-600 dark:text-green-400">{formatCurrency(reportData.financial.totalReceived)}</p></div>
                <div className="p-4 bg-red-50 dark:bg-red-500/10 rounded-lg text-center"><p className="text-sm text-red-800 dark:text-red-300">Contas a Pagar (Entradas)</p><p className="text-xl font-bold text-red-600 dark:text-red-400">{formatCurrency(reportData.financial.accountsPayable)}</p></div>
                <div className={`p-4 rounded-lg text-center ${reportData.financial.netBalance >= 0 ? 'bg-blue-50 dark:bg-blue-500/10' : 'bg-rose-50 dark:bg-rose-500/10'}`}><p className={`text-sm ${reportData.financial.netBalance >= 0 ? 'text-blue-800 dark:text-blue-300' : 'text-rose-800 dark:text-rose-300'}`}>Saldo Líquido</p><p className={`text-xl font-bold ${reportData.financial.netBalance >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-rose-600 dark:text-rose-400'}`}>{formatCurrency(reportData.financial.netBalance)}</p></div>
              </div>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-800 dark:text-gray-200"><Package size={20} /> Movimentação de Estoque</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 dark:bg-zinc-800/50 rounded-lg space-y-2">
                  <div className="flex justify-between items-center"><span className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-1"><TrendingUp size={14} className="text-green-500"/> Total de Entradas</span><span className="font-bold text-gray-900 dark:text-gray-100">{reportData.inventory.entriesQuantity} un</span></div>
                  <div className="flex justify-between items-center"><span className="text-sm text-gray-700 dark:text-gray-300">Valor das Entradas</span><span className="font-bold text-gray-900 dark:text-gray-100">{formatCurrency(reportData.inventory.entriesValue)}</span></div>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-zinc-800/50 rounded-lg space-y-2">
                  <div className="flex justify-between items-center"><span className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-1"><TrendingDown size={14} className="text-red-500"/> Total de Saídas</span><span className="font-bold text-gray-900 dark:text-gray-100">{reportData.inventory.exitsQuantity} un</span></div>
                  <div className="flex justify-between items-center"><span className="text-sm text-gray-700 dark:text-gray-300">CMV (Custo das Vendas)</span><span className="font-bold text-gray-900 dark:text-gray-100">{formatCurrency(reportData.inventory.cmv)}</span></div>
                </div>
              </div>
              {reportData.inventory.criticalStockItems.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-md font-semibold mb-2 flex items-center gap-2 text-red-700 dark:text-red-400"><AlertTriangle size={18}/> Itens com Estoque Crítico</h4>
                  <div className="p-4 bg-red-50 dark:bg-red-500/10 rounded-lg max-h-40 overflow-y-auto">
                    <table className="w-full text-sm">
                      <tbody>
                        {reportData.inventory.criticalStockItems.map(item => (
                          <tr key={item.sku} className="border-b border-red-100 last:border-0">
                            <td className="py-1 pr-2 text-red-900 dark:text-red-200">{item.name}</td>
                            <td className="py-1 text-right"><span className="font-bold text-red-900 dark:text-red-200">{item.current_stock}</span> / <span className="text-xs text-red-700 dark:text-red-300">mín. {item.min_stock}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-800 dark:text-gray-200"><BarChart size={20} /> KPIs de Performance</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-gray-50 dark:bg-zinc-800/50 rounded-lg text-center"><p className="text-sm text-gray-600 dark:text-gray-400">Ticket Médio</p><p className="text-xl font-bold text-gray-800 dark:text-gray-200">{formatCurrency(reportData.performance.averageTicket)}</p></div>
                <div className="p-4 bg-gray-50 dark:bg-zinc-800/50 rounded-lg text-center"><p className="text-sm text-gray-600 dark:text-gray-400">Margem de Contribuição</p><p className="text-xl font-bold text-gray-800 dark:text-gray-200">{reportData.performance.contributionMargin.toFixed(2)}%</p></div>
                <div className="p-4 bg-gray-50 dark:bg-zinc-800/50 rounded-lg text-center col-span-2">
                  <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center justify-center gap-1"><Star size={14} className="text-yellow-500"/> Produto Carro-Chefe</p>
                  <p className="text-lg font-bold truncate text-gray-800 dark:text-gray-200" title={reportData.performance.leadProduct.name}>{reportData.performance.leadProduct.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{reportData.performance.leadProduct.quantitySold} unidades vendidas</p>
                </div>
              </div>
            </section>

            <footer className="text-center pt-4 text-xs text-gray-400 dark:text-gray-500">
              Relatório gerado em {new Date(reportData.period.generatedAt).toLocaleString('pt-BR')}
            </footer>
          </div>
        </>
      )}
    </div>
  );
}