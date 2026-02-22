import React, { useState } from 'react';
import { Package, Loader2, CheckCircle2, AlertCircle, Eye, EyeOff, ShieldCheck, UserPlus, Users, ArrowLeft, KeyRound, Copy, QrCode } from 'lucide-react';
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

// Helper para gerar o payload do PIX (BR Code)
const generatePixPayload = (key: string, name: string, city: string, amount: string, txId: string = '***') => {
  const format = (id: string, val: string) => id + val.length.toString().padStart(2, '0') + val;
  
  const payload = 
    '000201' +
    format('26', '0014BR.GOV.BCB.PIX' + format('01', key)) +
    format('52', '0000') +
    format('53', '986') +
    format('54', amount) +
    format('58', 'BR') +
    format('59', name) +
    format('60', city) +
    format('62', format('05', txId)) +
    '6304';

  let crc = 0xFFFF;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
      else crc = (crc << 1) & 0xFFFF;
    }
  }
  return payload + crc.toString(16).toUpperCase().padStart(4, '0');
};

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
  
  // Dados do PIX para Gestor
  const pixKey = "29556537805";
  const pixPayload = generatePixPayload(pixKey, "Estoque App", "Sao Paulo", "100.00");
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(pixPayload)}`;

  const handleCopyPix = () => {
    navigator.clipboard.writeText(pixKey);
    alert("Chave PIX copiada!");
  };

  // Password Recovery State
  const [authMode, setAuthMode] = useState<'default' | 'forgot' | 'reset'>('default');
  const [resetToken, setResetToken] = useState('');

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

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (res.ok) {
        setAuthMode('reset');
        alert('Código enviado para seu e-mail!');
      } else {
        alert(data.error || 'Erro ao enviar e-mail');
      }
    } catch (error) {
      alert('Erro de conexão');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token: resetToken, newPassword: password })
      });
      const data = await res.json();
      if (res.ok) {
        alert('Senha alterada com sucesso! Faça login.');
        setAuthMode('default');
        setPassword('');
      } else {
        alert(data.error || 'Erro ao alterar senha');
      }
    } catch (error) {
      alert('Erro de conexão');
    }
  };

  if (screen === 'login' && authMode !== 'default') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl border border-gray-100"
        >
          <button type="button" onClick={() => setAuthMode('default')} className="flex items-center gap-2 text-gray-400 hover:text-gray-600 mb-6 text-sm font-bold">
            <ArrowLeft size={16} /> Voltar
          </button>
          
          <div className="flex flex-col items-center mb-6">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4">
              <KeyRound size={24} />
            </div>
            <h2 className="text-xl font-bold text-center">Recuperar Senha</h2>
            <p className="text-gray-500 text-sm text-center mt-2">
              {authMode === 'forgot' ? 'Digite seu e-mail para receber o código.' : 'Digite o código recebido e sua nova senha.'}
            </p>
          </div>

          {authMode === 'forgot' ? (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">E-mail Cadastrado</label>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full px-4 py-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-blue-500/20 outline-none" placeholder="seu@email.com" />
              </div>
              <button type="submit" className="w-full px-4 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20">Enviar Código</button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Código de 6 Dígitos</label>
                <input type="text" required value={resetToken} onChange={e => setResetToken(e.target.value)} className="w-full px-4 py-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-blue-500/20 outline-none text-center tracking-widest font-bold text-lg" placeholder="000000" maxLength={6} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Nova Senha</label>
                <div className="relative">
                  <input type={showPassword ? "text" : "password"} required value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-blue-500/20 outline-none pr-12" placeholder="Nova senha" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
              <button type="submit" className="w-full px-4 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/20">Redefinir Senha</button>
            </form>
          )}
        </motion.div>
      </div>
    );
  }

  if (screen === 'login') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl border border-gray-100"
        >
          <div className="flex items-center gap-2 mb-8 justify-center">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <Package className="text-white w-6 h-6" />
            </div>
            <h1 className="font-bold text-2xl tracking-tight">Controle de Estoque</h1>
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
                data-testid="input-email-login"
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
                  data-testid="input-password-login"
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
            <div className="flex justify-end">
              <button 
                type="button" 
                onClick={() => setAuthMode('forgot')}
                className="text-xs font-bold text-gray-400 hover:text-blue-600 transition-colors"
              >
                Esqueci minha senha
              </button>
            </div>
            <button type="submit" data-testid="btn-login-submit" className="w-full px-4 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20">Entrar</button>
          </form>
          <p className="mt-6 text-center text-sm text-gray-500">
            Não tem uma conta? <button type="button" onClick={() => { setScreen('register'); onClearError?.(); }} className="text-blue-600 font-bold hover:underline">Cadastre-se</button>
          </p>
          <div className="mt-4 pt-4 border-t border-gray-100 text-center">
            <button 
              type="button"
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl border border-gray-100"
      >
        <div className="flex items-center gap-2 mb-8 justify-center">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
            <Package className="text-white w-6 h-6" />
          </div>
          <h1 className="font-bold text-2xl tracking-tight">Controle de Estoque</h1>
        </div>
        <h2 className="text-xl font-bold mb-6 text-center">Criar nova conta</h2>
        
        <div className="flex gap-2 mb-6">
          <button 
            type="button"
            onClick={() => { setRole('gestor'); setStoreCode(''); setStoreName(''); setStoreError(''); }}
            className={`flex-1 py-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${role === 'gestor' ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-100 text-gray-400'}`}
            data-testid="btn-role-gestor"
          >
            <UserPlus size={20} />
            <span className="text-[10px] font-bold uppercase">Gestor</span>
          </button>
          <button 
            type="button"
            onClick={() => { setRole('colaborador'); setStoreCode(''); setStoreName(''); setStoreError(''); }}
            className={`flex-1 py-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${role === 'colaborador' ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-100 text-gray-400'}`}
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
            <div className="space-y-4 mb-4">
              <div className="p-4 bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-center">
                <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Seu Código de Loja</p>
                <p className="text-2xl font-black tracking-widest">{storeCode}</p>
                <p className="text-[9px] text-gray-500 mt-1">Compartilhe este código com seus colaboradores (máx 4)</p>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Nome Completo</label>
            <input 
              name="name" 
              required 
              value={name}
              data-testid="input-name"
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
              data-testid="input-email"
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
                data-testid="input-password"
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
                  data-testid="input-cep"
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
                data-testid="input-establishment"
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

          {role === 'gestor' && (
            <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 mb-4">
              <div className="flex flex-col items-center mb-4 text-blue-800">
                <div className="flex items-center gap-2">
                  <QrCode size={16} />
                  <span className="text-xs font-bold uppercase">Investimento para acesso</span>
                </div>
                <p className="text-3xl font-black text-blue-600 mt-1 tracking-tight">R$ 100,00</p>
              </div>
              <div className="flex justify-center mb-3">
                <div className="bg-white p-2 rounded-xl border border-blue-100 shadow-sm">
                    <img src={qrCodeUrl} alt="QR Code PIX" className="w-32 h-32 object-contain" />
                </div>
              </div>
              <div className="flex items-center gap-2 bg-white border border-blue-200 p-2 rounded-lg">
                <span className="font-mono text-xs text-gray-600 flex-1 text-center">{pixKey}</span>
                <button type="button" onClick={handleCopyPix} className="text-blue-600 hover:text-blue-700 p-1" title="Copiar Chave">
                  <Copy size={14} />
                </button>
              </div>
              <p className="text-[9px] text-center text-blue-600 mt-2">
                Realize o pagamento para ativar sua conta de Gestor.
              </p>
            </div>
          )}

          <button 
            type="submit" 
            disabled={cepStatus === 'loading' || (role === 'colaborador' && !storeName)}
            data-testid="btn-register-submit"
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cadastrar como {role === 'gestor' ? 'Gestor' : 'Colaborador'}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-gray-500">
          Já tem uma conta? <button type="button" onClick={() => { setScreen('login'); onClearError?.(); }} className="text-blue-600 font-bold hover:underline">Fazer Login</button>
        </p>
      </motion.div>
    </div>
  );
};
