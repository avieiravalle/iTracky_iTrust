import React, { useState, useEffect, useRef } from 'react';
import { Save, Upload, RefreshCw, Palette, Trash2, Sun, Moon, Monitor, Loader2, QrCode, Image as ImageIcon, X, CheckCircle2, Wifi, WifiOff } from 'lucide-react';
import { User } from '../types';
import { Html5QrcodeScanner } from 'html5-qrcode';

interface StoreSettingsProps {
  user: User | null;
  onUpdateUser: () => void;
  setDarkMode: (mode: boolean) => void;
}

const PREDEFINED_THEMES = [
  { name: 'iTrust (Padrão)', colors: { primary: '#1A3A5F', secondary: '#4CAF50', accent: '#00D4FF' } },
  { name: 'Midnight', colors: { primary: '#0f172a', secondary: '#3b82f6', accent: '#6366f1' } },
  { name: 'Ocean', colors: { primary: '#155e75', secondary: '#06b6d4', accent: '#67e8f9' } },
  { name: 'Forest', colors: { primary: '#14532d', secondary: '#22c55e', accent: '#4ade80' } },
  { name: 'Royal', colors: { primary: '#581c87', secondary: '#a855f7', accent: '#e9d5ff' } },
  { name: 'Sunset', colors: { primary: '#7c2d12', secondary: '#f97316', accent: '#fdba74' } },
];

export function StoreSettings({ user, onUpdateUser, setDarkMode }: StoreSettingsProps) {
  // Inicializa o estado apenas uma vez com os dados do usuário ou padrão
  const [colors, setColors] = useState(() => {
    const userColors = (user as any)?.custom_colors;
    return { primary: userColors?.primary || '#1A3A5F', secondary: userColors?.secondary || '#4CAF50', accent: userColors?.accent || '#00D4FF' };
  });
  const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'system'>((user as any)?.theme_preference || 'system');
  const [pixKey, setPixKey] = useState((user as any)?.pix_key || '');
  const [zapiInstance, setZapiInstance] = useState((user as any)?.zapi_instance || '');
  const [zapiToken, setZapiToken] = useState((user as any)?.zapi_token || '');
  const [logoUrl, setLogoUrl] = useState((user as any)?.logo_url || '');
  const [loginBgUrl, setLoginBgUrl] = useState((user as any)?.login_background_url || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);
  const [showScanner, setShowScanner] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const [showReconnectModal, setShowReconnectModal] = useState(false);
  const [reconnectQrCode, setReconnectQrCode] = useState<string | null>(null);

  // Referência para manter o usuário atualizado sem disparar re-renders do efeito de cor
  const userRef = useRef(user);
  useEffect(() => {
    userRef.current = user;
    // Atualiza o logo se o usuário for atualizado externamente
    if ((user as any)?.logo_url !== logoUrl) {
      setLogoUrl((user as any)?.logo_url || '');
    }
    if ((user as any)?.pix_key !== pixKey) {
      setPixKey((user as any)?.pix_key || '');
    }
    if ((user as any)?.login_background_url !== loginBgUrl) {
      setLoginBgUrl((user as any)?.login_background_url || '');
    }
    if ((user as any)?.zapi_instance !== zapiInstance) {
      setZapiInstance((user as any)?.zapi_instance || '');
    }
    if ((user as any)?.zapi_token !== zapiToken) {
      setZapiToken((user as any)?.zapi_token || '');
    }
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

  // Efeito de Preview do Tema em Tempo Real
  useEffect(() => {
    if (themeMode === 'dark') {
      setDarkMode(true);
    } else if (themeMode === 'light') {
      setDarkMode(false);
    } else {
      setDarkMode(window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
  }, [themeMode, setDarkMode]);

  // Efeito para controlar o Scanner de QR Code
  useEffect(() => {
    if (showScanner && !scannerRef.current) {
      const scanner = new Html5QrcodeScanner(
        "zapi-qr-reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        false
      );
      scannerRef.current = scanner;

      const onScanSuccess = (decodedText: string) => {
        try {
          const qrData = JSON.parse(decodedText);
          if (qrData.instanceId && qrData.token) {
            setZapiInstance(qrData.instanceId);
            setZapiToken(qrData.token);
            setShowScanner(false);
            alert('Credenciais do WhatsApp lidas com sucesso! Clique em "Salvar Alterações" para confirmar.');
          } else {
            alert('QR Code inválido. O código deve conter "instanceId" e "token".');
          }
        } catch (e) {
          alert('Falha ao ler o QR Code. O conteúdo não é um formato JSON válido.');
        }
      };

      scanner.render(onScanSuccess, () => {});
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
        scannerRef.current = null;
      }
    };
  }, [showScanner]);

  const handleReconnect = async () => {
    setShowReconnectModal(true);
    setReconnectQrCode(null);
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch('/api/whatsapp/reconnect-qrcode', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        if (data.qrCode) {
          setReconnectQrCode(data.qrCode);
        } else if (data.status === 'CONNECTED') {
          alert('Sua conexão com o WhatsApp já está ativa!');
          setShowReconnectModal(false);
        }
      } else {
        throw new Error(data.error || 'Falha ao buscar QR Code.');
      }
    } catch (error: any) {
      alert(error.message);
    }
  };

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

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('logo', file);

    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch('/api/store-settings/logo', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setLogoUrl(data.logo_url);
        onUpdateUser(); // Refresh user data in App.tsx
        alert('Logo atualizado com sucesso!');
      } else {
        throw new Error(data.error || 'Falha no upload');
      }
    } catch (error: any) {
      alert(`Erro ao enviar logo: ${error.message}`);
    } finally {
      setIsUploading(false);
      // Reset file input
      if (logoInputRef.current) {
        logoInputRef.current.value = '';
      }
    }
  };

  const handleBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('background', file);

    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch('/api/store-settings/login-background', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setLoginBgUrl(data.login_background_url);
        onUpdateUser();
        alert('Imagem de fundo atualizada!');
      } else {
        throw new Error(data.error || 'Falha no upload');
      }
    } catch (error: any) {
      alert(`Erro: ${error.message}`);
    } finally {
      setIsUploading(false);
      if (bgInputRef.current) {
        bgInputRef.current.value = '';
      }
    }
  };

  const handleRemoveLogo = async () => {
    if (window.confirm('Tem certeza que deseja remover o logo da empresa?')) {
      setIsSaving(true);
      try {
        const token = localStorage.getItem('authToken');
        const res = await fetch('/api/store-settings/logo', {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (res.ok) {
          setLogoUrl('');
          onUpdateUser();
          alert('Logo removido com sucesso.');
        } else {
          const data = await res.json();
          throw new Error(data.error || 'Falha ao remover logo.');
        }
      } catch (error: any) {
        alert(`Erro: ${error.message}`);
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleRemoveBg = async () => {
    if (window.confirm('Remover imagem de fundo personalizada?')) {
      setIsSaving(true);
      try {
        const token = localStorage.getItem('authToken');
        const res = await fetch('/api/store-settings/login-background', {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (res.ok) {
          setLoginBgUrl('');
          onUpdateUser();
          alert('Imagem removida.');
        } else {
          throw new Error('Falha ao remover imagem.');
        }
      } catch (error: any) {
        alert(`Erro: ${error.message}`);
      } finally {
        setIsSaving(false);
      }
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
          theme_preference: themeMode,
          pix_key: pixKey,
          zapi_instance: zapiInstance,
          zapi_token: zapiToken,
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

      {/* Modal do Scanner */}
      {showScanner && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-800 w-full max-w-md rounded-2xl p-6 shadow-xl relative">
            <h3 className="text-lg font-bold text-center mb-4 dark:text-white">Aponte para o QR Code</h3>
            <div id="zapi-qr-reader" className="w-full rounded-lg overflow-hidden"></div>
            <button 
              onClick={() => setShowScanner(false)}
              className="absolute top-4 right-4 p-2 bg-gray-100 dark:bg-zinc-700 rounded-full text-gray-500 hover:text-gray-800"
            >
              <X size={20} />
            </button>
            <p className="text-xs text-center text-gray-500 mt-4">
              No painel da sua API de WhatsApp, gere um QR Code com as credenciais (instanceId e token) para configurar automaticamente.
            </p>
          </div>
        </div>
      )}

      {/* Modal de Reconexão */}
      {showReconnectModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-800 w-full max-w-sm rounded-2xl p-6 shadow-xl relative">
            <h3 className="text-lg font-bold text-center mb-4 dark:text-white">Reconectar WhatsApp</h3>
            <button onClick={() => setShowReconnectModal(false)} className="absolute top-4 right-4 p-2 bg-gray-100 dark:bg-zinc-700 rounded-full text-gray-500 hover:text-gray-800"><X size={20} /></button>
            <div className="flex flex-col items-center justify-center min-h-[250px]">
              {reconnectQrCode ? (
                <img src={reconnectQrCode} alt="QR Code de Reconexão" className="w-56 h-56 rounded-lg border border-gray-200" />
              ) : (
                <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
              )}
              <p className="text-sm text-center text-gray-500 mt-4">
                Abra seu WhatsApp, vá em "Aparelhos Conectados" e escaneie o código acima.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Seção de Cores e Tema */}
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

        {/* Seção de Integrações */}
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm">
          <div className="space-y-8">
            {/* Sub-seção PIX */}
            <div>
              <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                <QrCode size={20} className="text-emerald-500" />
                Recebimento via PIX
              </h3>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Chave PIX da Loja</label>
                <input
                  type="text"
                  value={pixKey}
                  onChange={e => setPixKey(e.target.value)}
                  placeholder="CPF, CNPJ, Email, Celular ou Chave Aleatória"
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-zinc-800 rounded-xl border border-gray-200 dark:border-zinc-700 focus:ring-2 focus:ring-emerald-500/20 outline-none dark:text-white"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Esta chave será usada para gerar o QR Code automaticamente na tela de vendas (PDV).
                </p>
              </div>
            </div>

            <div className="border-t border-gray-100 dark:border-zinc-800"></div>

            {/* Sub-seção WhatsApp */}
            <div>
              <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Integração WhatsApp</h3>
              {user && (user as any).zapi_instance && (user as any).zapi_token ? (
                // Estado: Configurado
                <div className="p-4 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl border border-emerald-200 dark:border-emerald-500/20 flex flex-col items-center text-center gap-3">
                  <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                    <Wifi size={20} />
                    <p className="font-bold">WhatsApp Conectado</p>
                  </div>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">O sistema está pronto para enviar recibos.</p>
                  <button 
                    onClick={handleReconnect}
                    className="mt-2 text-xs font-bold text-blue-600 hover:underline"
                  >
                    Precisa reconectar? Clique aqui.
                  </button>
                </div>
              ) : (
                // Estado: Não Configurado
                <div className="space-y-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Para habilitar o envio de recibos, insira as credenciais da sua API de WhatsApp (ex: Z-API) abaixo.
                  </p>
                  <div>
                    <label htmlFor="zapi_instance" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Instance ID
                    </label>
                    <input
                      type="text"
                      id="zapi_instance"
                      value={zapiInstance}
                      onChange={(e) => setZapiInstance(e.target.value)}
                      className="w-full p-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-gray-50 dark:bg-zinc-700"
                      placeholder="Sua Instance ID"
                    />
                  </div>
                  <div>
                    <label htmlFor="zapi_token" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Token
                    </label>
                    <input
                      type="password"
                      id="zapi_token"
                      value={zapiToken}
                      onChange={(e) => setZapiToken(e.target.value)}
                      className="w-full p-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-gray-50 dark:bg-zinc-700"
                      placeholder="Seu Token"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Seção de Background de Login */}
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Imagem de Fundo (Login)</h3>
          <input 
            type="file" 
            ref={bgInputRef} 
            onChange={handleBgUpload} 
            accept="image/*"
            className="hidden" 
          />
          <div className="flex flex-col items-center justify-center gap-4 border-2 border-dashed border-gray-200 dark:border-zinc-700 rounded-xl p-8 relative overflow-hidden">
            {loginBgUrl && (
              <img src={loginBgUrl} alt="Background Preview" className="absolute inset-0 w-full h-full object-cover opacity-30" />
            )}
            <div className="relative z-10 flex flex-col items-center gap-3">
              <button onClick={() => bgInputRef.current?.click()} disabled={isUploading} className="cursor-pointer bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 shadow-sm">
                <ImageIcon size={18} />
                <span>{loginBgUrl ? 'Trocar Imagem' : 'Carregar Imagem'}</span>
              </button>
              {loginBgUrl && (
                <button onClick={handleRemoveBg} className="text-rose-500 text-xs font-bold hover:underline">Remover Imagem</button>
              )}
            </div>
          </div>
        </div>

        {/* Seção de Logo */}
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Logo da Empresa</h3>
          <input 
            type="file" 
            ref={logoInputRef} 
            onChange={handleLogoUpload} 
            accept="image/png, image/jpeg, image/webp, image/svg+xml"
            className="hidden" 
          />
          <div className="flex flex-col items-center justify-center gap-4 border-2 border-dashed border-gray-200 dark:border-zinc-700 rounded-xl p-8 relative">
            {isUploading ? (
              <div className="h-24 w-24 flex items-center justify-center"><Loader2 className="animate-spin text-blue-500" size={32} /></div>
            ) : logoUrl ? (
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
            <button onClick={() => logoInputRef.current?.click()} disabled={isUploading} className="cursor-pointer bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50">
              <Upload size={18} />
              <span>{logoUrl ? 'Alterar Imagem' : 'Carregar Imagem'}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={handleSave} disabled={isSaving} className="mt-4 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-lg shadow-blue-600/20">
          {isSaving ? <RefreshCw className="animate-spin" size={20} /> : <Save size={20} />}
          Salvar Alterações
        </button>
      </div>
    </div>
  );
}