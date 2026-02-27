import React from 'react';
import { Sun, Moon, Laptop } from 'lucide-react';

interface SettingsProps {
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
}

const themeOptions = [
  { name: 'Claro', value: 'light', icon: <Sun size={20} /> },
  { name: 'Escuro', value: 'dark', icon: <Moon size={20} /> },
  { name: 'Sistema', value: 'system', icon: <Laptop size={20} /> },
];

export const Settings: React.FC<SettingsProps> = ({ theme, setTheme }) => {
  return (
    <div className="w-full space-y-8 pb-12 p-4 md:p-0">
      <header className="space-y-2">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Identidade Visual</h2>
        <p className="text-gray-500 dark:text-gray-400">Personalize a aparência do sistema.</p>
      </header>

      <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-gray-100 dark:border-zinc-800 shadow-sm">
        <h3 className="font-bold text-lg text-gray-800 dark:text-white mb-4">Tema da Interface</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Escolha como você quer visualizar o sistema. A opção 'Sistema' usará a configuração padrão do seu navegador ou sistema operacional.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {themeOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setTheme(option.value as 'light' | 'dark' | 'system')}
              className={`
                p-4 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-3
                ${
                  theme === option.value
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                    : 'border-gray-200 dark:border-zinc-700 bg-transparent hover:border-gray-300 dark:hover:border-zinc-600'
                }
              `}
            >
              <div className={`
                ${theme === option.value ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}
              `}>
                {option.icon}
              </div>
              <span className={`
                font-bold text-sm 
                ${theme === option.value ? 'text-gray-800 dark:text-white' : 'text-gray-600 dark:text-gray-400'}
              `}>
                {option.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Aqui você pode adicionar as outras opções, como upload de logo e seleção de cores */}
      <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-gray-100 dark:border-zinc-800 shadow-sm mt-8">
        <h3 className="font-bold text-lg text-gray-800 dark:text-white mb-4">Logotipo e Cores</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Funcionalidade de upload de logo e personalização de cores em desenvolvimento.
        </p>
      </div>
    </div>
  );
};