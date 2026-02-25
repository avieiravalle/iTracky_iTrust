import React, { useState, useEffect, useRef } from 'react';
import { Save, Upload, RefreshCw, Palette, Trash2, Check, Sun, Moon, Monitor } from 'lucide-react';
import { User } from '../types';

interface StoreSettingsProps {
  user: User | null;
  onUpdateUser: () => void;
}

const PREDEFINED_THEMES = [
  { name: 'iTrust (Padrão)', colors: { primary: '#1A3A5F', secondary: '#4CAF50', accent: '#00D4FF' } },
  { name: 'Midnight', colors: { primary: '#0f172a', secondary: '#3b82f6', accent: '#6366f1' } },
  { name: 'Ocean', colors: { primary: '#155e75', secondary: '#06b6d4', accent: '#67e8f9' } },
  { name: 'Forest', colors: { primary: '#14532d', secondary: '#22c55e', accent: '#4ade80' } },
  { name: 'Royal', colors: { primary: '#581c87', secondary: '#a855f7', accent: '#e9d5ff' } },
  { name: 'Sunset', colors: { primary: '#7c2d12', secondary: '#f97316', accent: '#fdba74' } },
];

export function StoreSettings({ user, onUpdateUser }: StoreSettingsProps) {
  // Inicializa o estado apenas uma vez com os dados do usuário ou padrão
  const [colors, setColors] = useState(() => {
    const userColors = (user as any)?.custom_colors;
    return { primary: userColors?.primary || '#1A3A5F', secondary: userColors?.secondary || '#4CAF50', accent: userColors?.accent || '#00D4FF' };
  });
  const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'system'>((user as any)?.theme_preference || 'system');
  const [logoUrl, setLogoUrl] = useState((user as any)?.logo_url || '');
  const [isSaving, setIsSaving] = useState(false);

  // Referência para manter o usuário atualizado sem disparar re-renders do efeito de cor
  const userRef = useRef(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // Efeito de Preview em Tempo Real
  useEffect(() => {
    // Aplica as cores selecionadas imediatamente
    document.documentElement.style.setProperty('--color-primary', colors.primary);
    document.documentElement.style.setProperty('--color-secondary', colors.secondary);
    document.documentElement.style.setProperty('--color-accent', colors.accent);

    // Cleanup: Reverte para as cores salvas se o componente for desmontado (sair da tela)
    return () => {
      const savedColors = (userRef.current as any)?.custom_colors;
      if (savedColors) {
        document.documentElement.style.setProperty('--color-primary', savedColors.primary);
        document.documentElement.style.setProperty('--color-secondary', savedColors.secondary);
        document.documentElement.style.setProperty('--color-accent', savedColors.accent);
      } else {
        document.documentElement.style.removeProperty('--color-primary');
        document.documentElement.style.removeProperty('--color-secondary');
        document.documentElement.style.removeProperty('--color-accent');
      }
    };
  }, [colors]); // Removemos 'user' das dependências para evitar reversão ao salvar

  const handleColorChange = (key: keyof typeof colors, value: string) => {
    setColors(prev => ({ ...prev, [key]: value }));
  };

  const applyTheme = (themeColors: typeof PREDEFINED_THEMES[0]['colors']) => {
    setColors(themeColors);
  };

  const handleResetColors = () => {
    setColors({
      primary: '#1A3A5F',
      secondary: '#4CAF50',
      accent: '#00D4FF'
    });
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    if (window.confirm('Tem certeza que deseja remover o logo da empresa?')) {
      setLogoUrl('');
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch('/api/store-settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          custom_colors: colors,
          logo_url: logoUrl,
          theme_preference: themeMode
        })
      });

      if (res.ok) {
        onUpdateUser(); // Recarrega dados do usuário para aplicar mudanças
        alert('Configurações salvas com sucesso!');
      } else {
        alert('Erro ao salvar configurações.');
      }
    } catch (error) {
      console.error(error);
      alert('Erro de conexão.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
          <Palette className="w-6 h-6 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Identidade Visual</h1>
          <p className="text-gray-500 dark:text-gray-400">Personalize as cores e o logo da sua loja no sistema.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Seção de Cores */}
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Paleta de Cores</h3>
          
          {/* Modo de Exibição Padrão */}
          <div className="mb-6 pb-6 border-b border-gray-100 dark:border-zinc-800">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Modo de Exibição Padrão</label>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setThemeMode('light')}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${themeMode === 'light' ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'border-gray-200 dark:border-zinc-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-zinc-800'}`}
              >
                <Sun size={24} />
                <span className="text-xs font-bold">Claro</span>
              </button>
              <button
                onClick={() => setThemeMode('dark')}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${themeMode === 'dark' ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'border-gray-200 dark:border-zinc-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-zinc-800'}`}
              >
                <Moon size={24} />
                <span className="text-xs font-bold">Escuro</span>
              </button>
              <button
                onClick={() => setThemeMode('system')}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${themeMode === 'system' ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'border-gray-200 dark:border-zinc-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-zinc-800'}`}
              >
                <Monitor size={24} />
                <span className="text-xs font-bold">Sistema</span>
              </button>
            </div>
          </div>

          {/* Seletor de Temas Predefinidos */}
          <div className="mb-6 pb-6 border-b border-gray-100 dark:border-zinc-800">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Temas Predefinidos</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {PREDEFINED_THEMES.map((theme) => (
                <button
                  key={theme.name}
                  onClick={() => applyTheme(theme.colors)}
                  className="group relative flex items-center gap-3 px-3 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-all text-left"
                >
                  <div className="flex -space-x-1">
                    <div className="w-4 h-4 rounded-full shadow-sm ring-2 ring-white dark:ring-zinc-900" style={{ backgroundColor: theme.colors.primary }}></div>
                    <div className="w-4 h-4 rounded-full shadow-sm ring-2 ring-white dark:ring-zinc-900" style={{ backgroundColor: theme.colors.secondary }}></div>
                    <div className="w-4 h-4 rounded-full shadow-sm ring-2 ring-white dark:ring-zinc-900" style={{ backgroundColor: theme.colors.accent }}></div>
                  </div>
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400">{theme.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cor Primária (Menu Lateral)</label>
              <div className="flex gap-2">
                <input type="color" value={colors.primary} onChange={e => handleColorChange('primary', e.target.value)} className="h-10 w-10 rounded cursor-pointer border-0" />
                <input type="text" value={colors.primary} onChange={e => handleColorChange('primary', e.target.value)} className="flex-1 px-3 py-2 border rounded-lg dark:bg-zinc-800 dark:border-zinc-700 dark:text-white uppercase" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cor Secundária (Botões/Ações)</label>
              <div className="flex gap-2">
                <input type="color" value={colors.secondary} onChange={e => handleColorChange('secondary', e.target.value)} className="h-10 w-10 rounded cursor-pointer border-0" />
                <input type="text" value={colors.secondary} onChange={e => handleColorChange('secondary', e.target.value)} className="flex-1 px-3 py-2 border rounded-lg dark:bg-zinc-800 dark:border-zinc-700 dark:text-white uppercase" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cor de Destaque (Ícones/Detalhes)</label>
              <div className="flex gap-2">
                <input type="color" value={colors.accent} onChange={e => handleColorChange('accent', e.target.value)} className="h-10 w-10 rounded cursor-pointer border-0" />
                <input type="text" value={colors.accent} onChange={e => handleColorChange('accent', e.target.value)} className="flex-1 px-3 py-2 border rounded-lg dark:bg-zinc-800 dark:border-zinc-700 dark:text-white uppercase" />
              </div>
            </div>
            <div className="pt-2">
              <button 
                onClick={handleResetColors}
                className="text-sm text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 font-medium flex items-center gap-2 transition-colors"
              >
                <RefreshCw size={14} /> 
                Restaurar Cores Padrão
              </button>
            </div>
          </div>
        </div>

        {/* Seção de Logo */}
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Logo da Empresa</h3>
          <div className="flex flex-col items-center justify-center gap-4 border-2 border-dashed border-gray-200 dark:border-zinc-700 rounded-xl p-8 relative">
            {logoUrl ? (
              <div className="relative group">
                <img src={logoUrl} alt="Logo Preview" className="h-24 object-contain" />
                <button 
                  onClick={handleRemoveLogo}
                  className="absolute -top-3 -right-3 bg-rose-500 text-white p-1.5 rounded-full shadow-md hover:bg-rose-600 transition-colors"
                  title="Remover Logo"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ) : (
              <div className="h-24 w-24 bg-gray-100 dark:bg-zinc-800 rounded-full flex items-center justify-center text-gray-400">Sem Logo</div>
            )}
            <label className="cursor-pointer bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
              <Upload size={18} />
              <span>Carregar Imagem</span>
              <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
            </label>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={handleSave} disabled={isSaving} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-lg shadow-blue-600/20">
          {isSaving ? <RefreshCw className="animate-spin" size={20} /> : <Save size={20} />}
          Salvar Alterações
        </button>
      </div>
    </div>
  );
}