import React, { useState } from 'react';
import { Package, Loader2, CheckCircle2, AlertCircle, Eye, EyeOff, ShieldCheck, UserPlus, Users } from 'lucide-react';
import { motion } from 'motion/react';

interface AuthProps {
  screen: 'login' | 'register';
  setScreen: (screen: 'login' | 'register') => void;
  onLogin: (e: React.FormEvent<HTMLFormElement>) => void;
  onRegister: (e: React.FormEvent<HTMLFormElement>) => void;
  onClearError?: () => void;
  onAdminClick?: () => void;
  registeredEmail?: string;
  loginError?: string;
}

export const Auth: React.FC<AuthProps> = ({ 
  screen, 
  setScreen, 
  onLogin, 
  onRegister,
  onClearError,
  onAdminClick,
  registeredEmail = '',
  loginError = ''
}) => {
  const [cep, setCep] = useState('');
  const [cepStatus, setCepStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [addressInfo, setAddressInfo] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState(registeredEmail || '');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [establishmentName, setEstablishmentName] = useState('');
  const [role, setRole] = useState<'gestor' | 'colaborador'>('gestor');
  const [storeCode, setStoreCode] = useState('');
  const [validatingStore, setValidatingStore] = useState(false);
  const [storeName, setStoreName] = useState('');
  const [storeError, setStoreError] = useState('');

  // Generate store code for Gestor
  React.useEffect(() => {
    if (role === 'gestor' && !storeCode) {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      setStoreCode(code);
    }
  }, [role, storeCode]);

  const validateStoreCode = async (code: string) => {
    if (code.length < 6) return;
    setValidatingStore(true);
    setStoreError('');
    try {
      const res = await fetch(`/api/validate-store/${code.toUpperCase()}`);
      const data = await res.json();
      if (res.ok) {
        setStoreName(data.establishment_name);
        if (role === 'colaborador') {
          setEstablishmentName(data.establishment_name);
        }
      } else {
        setStoreError(data.error);
        setStoreName('');
        if (role === 'colaborador') {
          setEstablishmentName('');
        }
      }
    } catch (error) {
      setStoreError('Erro ao validar código');
    } finally {
      setValidatingStore(false);
    }
  };

  // Update email if registeredEmail changes
  React.useEffect(() => {
    if (registeredEmail) {
      setEmail(registeredEmail);
      setPassword(''); // Clear password when a new registration happens
    }
  }, [registeredEmail]);

  // Clear password when switching screens
  React.useEffect(() => {
    setPassword('');
  }, [screen]);

  const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 8) value = value.slice(0, 8);
    
    // Apply mask 00000-000
    const maskedValue = value.length > 5 
      ? `${value.slice(0, 5)}-${value.slice(5)}` 
      : value;
    
    setCep(maskedValue);

    if (value.length === 8) {
      setCepStatus('loading');
      try {
        const res = await fetch(`https://viacep.com.br/ws/${value}/json/`);
        const data = await res.json();
        
        if (data.erro) {
          setCepStatus('error');
          setAddressInfo('CEP não encontrado');
        } else {
          setCepStatus('success');
          setAddressInfo(`${data.logradouro}, ${data.bairro} - ${data.localidade}/${data.uf}`);
        }
      } catch (error) {
        setCepStatus('error');
        setAddressInfo('Erro ao validar CEP');
      }
    } else {
      setCepStatus('idle');
      setAddressInfo('');
    }
  };

  if (screen === 'login') {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl border border-gray-100"
        >
          <div className="flex items-center gap-2 mb-8 justify-center">
            <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center">
              <Package className="text-white w-6 h-6" />
            </div>
            <h1 className="font-bold text-2xl tracking-tight">StockFlow</h1>
          </div>
          <h2 className="text-xl font-bold mb-6 text-center">Entrar na sua conta</h2>
          <form onSubmit={onLogin} className="space-y-4">
            {loginError && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="bg-rose-50 text-rose-600 p-3 rounded-xl text-xs font-bold flex items-center gap-2"
              >
                <AlertCircle size={16} />
                {loginError}
              </motion.div>
            )}
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2">E-mail</label>
              <input 
                name="email" 
                type="email" 
                value={email || ''}
                onChange={(e) => {
                  setEmail(e.target.value);
                  onClearError?.();
                }}
                required 
                className="w-full px-4 py-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-black/5 outline-none" 
                placeholder="seu@email.com" 
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Senha</label>
              <div className="relative">
                <input 
                  name="password" 
                  type={showPassword ? "text" : "password"} 
                  value={password || ''}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    onClearError?.();
                  }}
                  required 
                  className="w-full px-4 py-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-black/5 outline-none pr-12" 
                  placeholder="••••••••" 
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
            <button type="submit" className="w-full px-4 py-3 bg-black text-white rounded-xl font-bold hover:bg-gray-800 transition-colors shadow-lg shadow-black/10">Entrar</button>
          </form>
          <p className="mt-6 text-center text-sm text-gray-500">
            Não tem uma conta? <button onClick={() => { setScreen('register'); onClearError?.(); }} className="text-black font-bold hover:underline">Cadastre-se</button>
          </p>
          <div className="mt-4 pt-4 border-t border-gray-100 text-center">
            <button 
              onClick={onAdminClick}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 uppercase tracking-wider flex items-center gap-2 justify-center mx-auto"
            >
              <ShieldCheck size={14} />
              Entrar como Adm
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl border border-gray-100"
      >
        <div className="flex items-center gap-2 mb-8 justify-center">
          <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center">
            <Package className="text-white w-6 h-6" />
          </div>
          <h1 className="font-bold text-2xl tracking-tight">StockFlow</h1>
        </div>
        <h2 className="text-xl font-bold mb-6 text-center">Criar nova conta</h2>
        
        <div className="flex gap-2 mb-6">
          <button 
            onClick={() => { setRole('gestor'); setStoreCode(''); setStoreName(''); setStoreError(''); }}
            className={`flex-1 py-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${role === 'gestor' ? 'border-black bg-black text-white' : 'border-gray-100 text-gray-400'}`}
          >
            <UserPlus size={20} />
            <span className="text-[10px] font-bold uppercase">Gestor</span>
          </button>
          <button 
            onClick={() => { setRole('colaborador'); setStoreCode(''); setStoreName(''); setStoreError(''); }}
            className={`flex-1 py-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${role === 'colaborador' ? 'border-black bg-black text-white' : 'border-gray-100 text-gray-400'}`}
          >
            <Users size={20} />
            <span className="text-[10px] font-bold uppercase">Colaborador</span>
          </button>
        </div>

        <form onSubmit={onRegister} className="space-y-4">
          <input type="hidden" name="role" value={role} />
          <input type="hidden" name="store_code" value={storeCode} />
          
          {role === 'colaborador' && (
            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-400 uppercase">Código da Loja</label>
              <div className="relative">
                <input 
                  name="store_code" 
                  required 
                  value={storeCode}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase();
                    setStoreCode(val);
                    if (val.length === 6) validateStoreCode(val);
                  }}
                  className="w-full px-4 py-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-black/5 outline-none" 
                  placeholder="ABC123" 
                />
                {validatingStore && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />}
              </div>
              {storeName && (
                <p className="text-[10px] font-bold text-emerald-600 uppercase">Loja: {storeName} (Confirmado)</p>
              )}
              {storeError && (
                <p className="text-[10px] font-bold text-rose-600 uppercase">{storeError}</p>
              )}
            </div>
          )}

          {role === 'gestor' && (
            <div className="p-4 bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-center mb-4">
              <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Seu Código de Loja</p>
              <p className="text-2xl font-black tracking-widest">{storeCode}</p>
              <p className="text-[9px] text-gray-500 mt-1">Compartilhe este código com seus colaboradores (máx 4)</p>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Nome Completo</label>
            <input 
              name="name" 
              required 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-black/5 outline-none" 
              placeholder="Seu nome" 
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">E-mail</label>
            <input 
              name="email" 
              type="email" 
              required 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-black/5 outline-none" 
              placeholder="seu@email.com" 
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Senha</label>
            <div className="relative">
              <input 
                name="password" 
                type={showPassword ? "text" : "password"} 
                value={password || ''}
                onChange={(e) => setPassword(e.target.value)}
                required 
                className="w-full px-4 py-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-black/5 outline-none pr-12" 
                placeholder="••••••••" 
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="relative">
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2">CEP</label>
              <div className="relative">
                <input 
                  name="cep" 
                  value={cep}
                  onChange={handleCepChange}
                  required 
                  className={`w-full px-4 py-3 bg-gray-50 rounded-xl border-none focus:ring-2 outline-none transition-all ${
                    cepStatus === 'success' ? 'focus:ring-emerald-500/20 pr-10' : 
                    cepStatus === 'error' ? 'focus:ring-rose-500/20 pr-10' : 'focus:ring-black/5'
                  }`} 
                  placeholder="00000-000" 
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {cepStatus === 'loading' && <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />}
                  {cepStatus === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                  {cepStatus === 'error' && <AlertCircle className="w-4 h-4 text-rose-500" />}
                </div>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Estabelecimento</label>
              <input 
                name="establishment_name" 
                required={role === 'gestor'} 
                disabled={role === 'colaborador'}
                value={establishmentName}
                onChange={(e) => setEstablishmentName(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-black/5 outline-none disabled:opacity-50" 
                placeholder={role === 'colaborador' ? "Aguardando código..." : "Nome da Loja"} 
              />
            </div>
          </div>
          {addressInfo && (
            <motion.p 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className={`text-[10px] font-bold uppercase tracking-wider ${cepStatus === 'success' ? 'text-emerald-600' : 'text-rose-600'}`}
            >
              {addressInfo}
            </motion.p>
          )}
          <button 
            type="submit" 
            disabled={cepStatus === 'loading' || cepStatus === 'error' || (role === 'colaborador' && !storeName)}
            className="w-full px-4 py-3 bg-black text-white rounded-xl font-bold hover:bg-gray-800 transition-colors shadow-lg shadow-black/10 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cadastrar como {role === 'gestor' ? 'Gestor' : 'Colaborador'}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-gray-500">
          Já tem uma conta? <button onClick={() => { setScreen('login'); onClearError?.(); }} className="text-black font-bold hover:underline">Fazer Login</button>
        </p>
      </motion.div>
    </div>
  );
};
