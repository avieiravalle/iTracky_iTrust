import React, { useState, useEffect } from 'react';
import { X, Copy, MessageCircle, Clock } from 'lucide-react';

interface PixPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  email: string;
}

// Helper para gerar o payload do PIX (BR Code) para QR Code funcional
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

export const PixPaymentModal: React.FC<PixPaymentModalProps> = ({ isOpen, onClose, email }) => {
  const [timeLeft, setTimeLeft] = useState(15 * 60); // 15 minutos em segundos

  useEffect(() => {
    if (!isOpen) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  if (!isOpen) return null;

  const pixKey = "29556537805";
  const amount = "100.00";
  const amountDisplay = "100,00";
  const whatsappNumber = "5511930051475";
  const pixPayload = generatePixPayload(pixKey, "Estoque App", "Sao Paulo", amount);
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(pixPayload)}`;
  const message = encodeURIComponent(`Olá, realizei o cadastro com o email ${email} e fiz o pagamento de R$ ${amountDisplay} via PIX para o plano Gestor. Segue o comprovante para liberação do acesso.`);

  const handleCopy = () => {
    navigator.clipboard.writeText(pixKey);
    alert("Chave PIX copiada!");
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 relative animate-in fade-in zoom-in duration-200">
        <button type="button" onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <X size={24} />
        </button>
        
        <div className="text-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">Pagamento Necessário</h2>
          <p className="text-gray-600 mt-1 text-sm">
            Liberação imediata: <strong>1 Gestor + 4 Colaboradores</strong>
          </p>
        </div>

        <div className="flex justify-center items-center gap-2 text-amber-600 bg-amber-50 py-2 px-4 rounded-lg mb-4 mx-auto w-fit animate-pulse">
          <Clock size={16} />
          <span className="text-sm font-bold">Oferta expira em: {formattedTime}</span>
        </div>

        <div className="flex justify-center mb-6">
          <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
            <img src={qrCodeUrl} alt="QR Code PIX" className="w-40 h-40 object-contain" />
            <p className="text-[10px] text-center text-gray-400 mt-1">Escaneie com seu app do banco</p>
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-xl mb-6 border border-gray-100">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-500">Valor Único:</span>
            <span className="text-xl font-bold text-green-600">R$ {amountDisplay}</span>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase">Chave PIX (CPF/Celular)</label>
            <div className="flex items-center gap-2 bg-white border border-gray-200 p-3 rounded-lg">
              <span className="font-mono text-gray-800 flex-1 text-lg">{pixKey}</span>
              <button type="button" onClick={handleCopy} className="text-blue-600 hover:text-blue-700 p-2 hover:bg-blue-50 rounded-lg transition-colors" title="Copiar">
                <Copy size={20} />
              </button>
            </div>
          </div>
        </div>

        <a 
          href={`https://wa.me/${whatsappNumber}?text=${message}`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg shadow-green-200"
        >
          <MessageCircle size={20} />
          Enviar Comprovante no WhatsApp
        </a>

        <button 
          type="button"
          onClick={onClose}
          className="w-full mt-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 px-4 rounded-xl transition-colors"
        >
          Já realizei o pagamento
        </button>
        
        <p className="text-xs text-center text-gray-400 mt-4">
          Seu acesso será liberado após a confirmação do pagamento.
        </p>
      </div>
    </div>
  );
};