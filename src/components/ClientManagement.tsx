import React, { useState, useEffect } from 'react';
import { Contact, Loader2, ServerCrash, TrendingUp, Calendar } from 'lucide-react';

// Funções auxiliares
const formatCurrency = (value: number) => 
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const formatDate = (dateString: string) => 
  new Date(dateString).toLocaleDateString('pt-BR', { timeZone: 'UTC' });


interface Client {
  client_name: string;
  total_spent: number;
  last_purchase: string;
}

export const ClientManagement: React.FC<{ token: string }> = ({ token }) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchClients = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch('/api/clients', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (!res.ok) {
          throw new Error('Falha ao buscar clientes.');
        }
        const data = await res.json();
        setClients(data);
      } catch (err: any) {
        setError(err.message || 'Ocorreu um erro no servidor.');
      } finally {
        setLoading(false);
      }
    };

    fetchClients();
  }, [token]);

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center text-center p-10">
          <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
          <p className="mt-4 text-gray-500">Carregando clientes...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center text-center p-10 bg-rose-50 rounded-2xl">
          <ServerCrash className="w-12 h-12 text-rose-500" />
          <p className="mt-4 font-bold text-rose-700">Erro ao carregar</p>
          <p className="text-sm text-rose-600">{error}</p>
        </div>
      );
    }

    if (clients.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center text-center p-10 bg-gray-50 rounded-2xl">
          <Contact className="w-12 h-12 text-gray-400" />
          <p className="mt-4 font-bold text-gray-700">Nenhum cliente encontrado</p>
          <p className="text-sm text-gray-500">Comece a registrar vendas com o nome do cliente para vê-los aqui.</p>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto bg-white rounded-2xl border border-gray-100 shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                Cliente
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                Total Gasto
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                Última Compra
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {clients.map((client) => (
              <tr key={client.client_name} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{client.client_name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <TrendingUp size={16} className="text-emerald-500" />
                    {formatCurrency(client.total_spent)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                   <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Calendar size={16} />
                    {formatDate(client.last_purchase)}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-bold text-gray-900">Clientes</h2>
        <p className="mt-1 text-sm text-gray-500">
          Visualize o histórico e o valor de cada cliente registrado em suas vendas.
        </p>
      </header>
      {renderContent()}
    </div>
  );
};