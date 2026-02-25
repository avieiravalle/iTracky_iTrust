import React, { useState, useEffect, useCallback } from 'react';
import { X, Loader2, Zap, Combine, Clock, Info, Lightbulb, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Insight {
  icon: 'Zap' | 'Combine' | 'Clock' | 'Info';
  title: string;
  text: string;
}

interface OpportunityRadarModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type AnalysisPeriod = 'weekly' | 'biweekly' | 'monthly';

const ICONS = {
  Zap: <Zap className="w-6 h-6 text-yellow-500" />,
  Combine: <Combine className="w-6 h-6 text-indigo-500" />,
  Clock: <Clock className="w-6 h-6 text-rose-500" />,
  Info: <Info className="w-6 h-6 text-blue-500" />,
};

// Define animation variants for the container and cards
const containerVariants = {
  hidden: { opacity: 1 }, // Start visible to avoid flicker on re-animation
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1, // Delay between each card animation
    },
  },
};

const cardVariantsList = [
  { // Fade in up
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 100 } },
  },
  { // Fade in from left
    hidden: { x: -20, opacity: 0 },
    visible: { x: 0, opacity: 1, transition: { type: 'spring', stiffness: 100 } },
  },
  { // Scale up
    hidden: { scale: 0.9, opacity: 0 },
    visible: { scale: 1, opacity: 1, transition: { type: 'spring', stiffness: 100 } },
  },
];

export const OpportunityRadarModal: React.FC<OpportunityRadarModalProps> = ({ isOpen, onClose }) => {
  const [insights, setInsights] = useState<Insight[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [animationKey, setAnimationKey] = useState(0);
  const [analysisPeriod, setAnalysisPeriod] = useState<AnalysisPeriod>('biweekly');
  const [activeCardVariant, setActiveCardVariant] = useState(() => cardVariantsList[0]);

  const fetchInsights = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`/api/business-insights?period=${analysisPeriod}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        throw new Error('Não foi possível buscar as oportunidades. Tente novamente mais tarde.');
      }
      const data = await res.json();
      setInsights(data);

      // On success, pick a new random animation and update the key to trigger it
      const randomIndex = Math.floor(Math.random() * cardVariantsList.length);
      setActiveCardVariant(cardVariantsList[randomIndex]);
      setAnimationKey(prev => prev + 1);
    } catch (err: any) {
      setError(err.message);
      setInsights(null); // Limpa os insights em caso de erro
    } finally {
      setIsLoading(false);
    }
  }, [analysisPeriod]);

  useEffect(() => {
    if (isOpen) {
      setInsights(null); // Limpa ao abrir para garantir que o spinner inicial apareça
      fetchInsights();
    }
  }, [isOpen, fetchInsights]); // fetchInsights is now dependent on analysisPeriod

  const handlePeriodChange = (period: AnalysisPeriod) => {
    setAnalysisPeriod(period);
  };
  const periodTexts: Record<AnalysisPeriod, string> = {
    weekly: 'Análises semanais do seu ERP para impulsionar o negócio.',
    biweekly: 'Análises quinzenais do seu ERP para impulsionar o negócio.',
    monthly: 'Análises mensais do seu ERP para impulsionar o negócio.'
  };
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white dark:bg-zinc-900 w-full max-w-2xl rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto border border-zinc-800"
          >
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                  <Lightbulb className="w-7 h-7 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="font-bold text-xl dark:text-white">Radar de Oportunidades</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{periodTexts[analysisPeriod]}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={fetchInsights} 
                  disabled={isLoading}
                  className="p-2 bg-gray-100 dark:bg-zinc-800 rounded-full text-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                  title="Atualizar dicas"
                >
                  <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
                </button>
                <button onClick={onClose} className="p-2 bg-gray-100 dark:bg-zinc-800 rounded-full text-gray-500"><X size={20} /></button>
              </div>
            </div>

            <div className="flex justify-center mb-6">
              <div className="flex bg-gray-100 dark:bg-zinc-800 p-1 rounded-xl">
                <button 
                  onClick={() => handlePeriodChange('weekly')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${analysisPeriod === 'weekly' ? 'bg-white dark:bg-zinc-700 text-black dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                >
                  Semanal
                </button>
                <button 
                  onClick={() => handlePeriodChange('biweekly')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${analysisPeriod === 'biweekly' ? 'bg-white dark:bg-zinc-700 text-black dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                >
                  Quinzenal
                </button>
                <button 
                  onClick={() => handlePeriodChange('monthly')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${analysisPeriod === 'monthly' ? 'bg-white dark:bg-zinc-700 text-black dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                >
                  Mensal
                </button>
              </div>
            </div>

            <div className="space-y-4 min-h-[256px]">
              {isLoading && !insights && (
                <div className="flex flex-col items-center justify-center h-64 gap-4 text-gray-500 dark:text-gray-400">
                  <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
                  <p className="font-medium">Analisando seus dados...</p>
                  <p className="text-xs text-center">Nossa inteligência artificial está buscando as melhores<br/>estratégias para o seu negócio.</p>
                </div>
              )}
              {error && <div className="text-center text-rose-500 p-8">{error}</div>}
              {insights && !error && (
                <motion.div 
                  key={animationKey} // This is crucial to re-trigger the animation on update
                  className="grid grid-cols-1 md:grid-cols-3 gap-4"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                >
                  {insights.map((insight, index) => (
                    <motion.div 
                      key={index} 
                      variants={activeCardVariant}
                      className="bg-gray-50 dark:bg-zinc-800/50 p-5 rounded-2xl border border-gray-200 dark:border-zinc-700/50 flex flex-col"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        {ICONS[insight.icon] || <Lightbulb className="w-6 h-6 text-gray-500" />}
                        <h4 className="font-bold text-gray-800 dark:text-white">{insight.title}</h4>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300 flex-1">
                        {insight.text}
                      </p>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};