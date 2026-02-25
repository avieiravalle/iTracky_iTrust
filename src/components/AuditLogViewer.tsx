import React from 'react';
import { FileText, AlertCircle, CheckCircle2, Info } from 'lucide-react';

interface AuditLog {
  id: string;
  action: string;
  details: string;
  user_name: string;
  timestamp: string;
  type: 'info' | 'warning' | 'success';
}

const MOCK_LOGS: AuditLog[] = [
  { id: '1', action: 'LOGIN', details: 'Login realizado com sucesso', user_name: 'João Silva', timestamp: '2023-10-25 14:30', type: 'success' },
  { id: '2', action: 'SALE_CREATE', details: 'Venda #1234 registrada (R$ 150,00)', user_name: 'João Silva', timestamp: '2023-10-25 14:35', type: 'info' },
  { id: '3', action: 'STOCK_UPDATE', details: 'Estoque do produto SKU-001 alterado manualmente', user_name: 'Admin Gestor', timestamp: '2023-10-25 15:00', type: 'warning' },
];

export function AuditLogViewer() {
  return (
    <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm mt-6">
      <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
        <FileText className="w-5 h-5" />
        Logs de Auditoria
      </h2>
      
      <div className="space-y-4">
        {MOCK_LOGS.map((log) => (
          <div key={log.id} className="flex items-start gap-4 p-3 border border-gray-100 dark:border-zinc-800 rounded-xl hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors">
            <div className="mt-1">
              {log.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
              {log.type === 'warning' && <AlertCircle className="w-5 h-5 text-amber-500" />}
              {log.type === 'info' && <Info className="w-5 h-5 text-blue-500" />}
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <h3 className="font-bold text-gray-800 dark:text-white">{log.action}</h3>
                <span className="text-xs text-gray-500 dark:text-gray-400">{log.timestamp}</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{log.details}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Usuário: {log.user_name}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}