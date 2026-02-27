import React from 'react';
import { Check, Star, Users, Building } from 'lucide-react';

export interface Plan {
  name: string;
  price: string;
  features: string[];
  icon: React.ReactNode;
  bgColor: string;
  textColor: string;
  isFeatured?: boolean;
}

const plans: Plan[] = [
  {
    name: 'Básico',
    price: 'R$ 89,90',
    icon: <Users size={28} />,
    bgColor: 'bg-gray-100 dark:bg-gray-800',
    textColor: 'text-gray-800 dark:text-gray-200',
    features: [
      '1 Gestor',
      'Até 4 Colaboradores',
      'Controle de Estoque',
      'Frente de Caixa (PDV)',
    ],
  },
  {
    name: 'Profissional',
    price: 'R$ 189,90',
    icon: <Star size={28} />,
    bgColor: 'bg-blue-600',
    textColor: 'text-white',
    isFeatured: true,
    features: [
      '1 Gestor',
      'Até 9 Colaboradores',
      'Relatórios Avançados',
      'Radar de Oportunidades (IA)',
    ],
  },
  {
    name: 'Empresarial',
    price: 'R$ 299,90',
    icon: <Building size={28} />,
    bgColor: 'bg-gray-100 dark:bg-gray-800',
    textColor: 'text-gray-800 dark:text-gray-200',
    features: [
      'Até 2 Gestores',
      'Colaboradores Ilimitados',
      'Suporte Prioritário',
      'API para Integrações',
    ],
  },
];

interface PlanSelectionProps {
  onPlanSelect: (plan: Plan) => void;
}

export const PlanSelection: React.FC<PlanSelectionProps> = ({ onPlanSelect }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-[#0f172a] p-4">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-800 dark:text-white">Escolha o plano ideal para você</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">Comece pequeno ou cresça sem limites. Temos a solução certa.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl w-full">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`rounded-2xl p-8 flex flex-col shadow-lg transition-transform transform hover:-translate-y-2 ${plan.bgColor} ${plan.isFeatured ? 'border-4 border-cyan-400' : 'border border-gray-200 dark:border-gray-700'}`}
          >
            <div className={`flex items-center gap-4 mb-6 ${plan.textColor}`}>
              <div className={plan.isFeatured ? 'text-cyan-300' : ''}>{plan.icon}</div>
              <h2 className="text-2xl font-bold">{plan.name}</h2>
            </div>

            <p className={`text-4xl font-extrabold mb-6 ${plan.textColor}`}>
              {plan.price}<span className="text-lg font-medium opacity-70">/mês</span>
            </p>

            <ul className="space-y-3 mb-8 flex-grow">
              {plan.features.map((feature, i) => (
                <li key={i} className={`flex items-center gap-3 ${plan.textColor}`}>
                  <Check className={plan.isFeatured ? 'text-cyan-300' : 'text-emerald-500'} size={20} />
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => onPlanSelect(plan)}
              className={
                plan.isFeatured
                  ? 'w-full py-3 px-6 bg-white text-blue-600 font-bold rounded-lg shadow-md hover:bg-gray-100 transition-colors'
                  : 'w-full py-3 px-6 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors'
              }
            >
              Selecionar Plano
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};