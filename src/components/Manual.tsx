import React from 'react';
import { 
  BookOpen, 
  LayoutDashboard, 
  Package, 
  TrendingUp, 
  DollarSign, 
  Plus, 
  ArrowDownCircle, 
  ArrowUpCircle,
  HelpCircle,
  CheckCircle2,
  Clock,
  ScanBarcode,
  FileText,
  Users,
  Settings,
  ShieldCheck,
  Printer
} from 'lucide-react';

export const Manual: React.FC = () => {
  const sections = [
    {
      title: 'Dashboard (Visão Geral)',
      icon: <LayoutDashboard className="text-blue-500" size={24} />,
      content: 'O coração do seu negócio. Aqui você vê o valor total do seu patrimônio em estoque, o lucro já realizado (vendas pagas) e o lucro que ainda tem a receber. O gráfico de evolução permite acompanhar o crescimento mensal nos últimos 3 ou 6 meses.'
    },
    {
      title: 'Inventário (Estoque)',
      icon: <Package className="text-orange-500" size={24} />,
      content: 'Gerencie seus produtos. Você pode cadastrar novos itens com SKU e estoque mínimo. O sistema alertará automaticamente quando um produto estiver com estoque baixo (cor vermelha).'
    },
    {
      title: 'Scanner e Leitor de Código',
      icon: <ScanBarcode className="text-purple-500" size={24} />,
      content: 'Agilize suas entradas e saídas usando o leitor. Você pode usar a câmera do seu celular/computador clicando no ícone de câmera, ou usar um leitor USB externo. Ao escanear um produto já cadastrado, ele é selecionado automaticamente. Se for um novo código na entrada, o sistema sugere o cadastro imediato.'
    },
    {
      title: 'Informativo de Lucros',
      icon: <TrendingUp className="text-emerald-500" size={24} />,
      content: 'Análise detalhada por produto. Veja quais itens trazem mais lucro total e qual a margem média por unidade vendida. Ideal para identificar seus "campeões de venda".'
    },
    {
      title: 'Relatório de Fechamento',
      icon: <FileText className="text-blue-500" size={24} />,
      content: 'Gere um relatório completo para qualquer período. Selecione as datas de início e fim para visualizar um resumo detalhado de faturamento, custos, lucro, produtos mais vendidos e mais. Você pode imprimir ou salvar como PDF.'
    },
    {
      title: 'Gestão Financeira',
      icon: <DollarSign className="text-amber-500" size={24} />,
      content: 'Controle de contas a receber. Todas as vendas marcadas como "A Receber" aparecem aqui. Você pode ver o nome do cliente, data e lucro previsto. Quando o cliente pagar, basta clicar em "Receber" para migrar o valor para o lucro realizado.'
    },
    {
      title: 'Registrando Movimentações',
      icon: <Plus className="text-black" size={24} />,
      content: (
        <div className="space-y-3">
          <div className="flex items-start gap-2">
            <ArrowDownCircle className="text-emerald-600 mt-1" size={16} />
            <p><span className="font-bold">Entrada:</span> Use para compras. O sistema recalcula o Custo Médio do produto automaticamente para garantir que seu lucro seja calculado com precisão.</p>
          </div>
          <div className="flex items-start gap-2">
            <ArrowUpCircle className="text-rose-600 mt-1" size={16} />
            <p><span className="font-bold">Saída:</span> Use para vendas. Você pode definir se a venda foi paga na hora ou se é "A Receber", além de identificar o cliente.</p>
          </div>
        </div>
      )
    },
    {
      title: 'Status de Pagamento',
      icon: <CheckCircle2 className="text-emerald-500" size={24} />,
      content: (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="text-emerald-600" size={16} />
            <p><span className="font-bold text-emerald-700">Pago:</span> O lucro entra imediatamente no seu saldo realizado.</p>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="text-amber-500" size={16} />
            <p><span className="font-bold text-amber-700">A Receber:</span> O lucro fica "congelado" no financeiro até que você confirme o recebimento.</p>
          </div>
        </div>
      )
    },
    {
      title: 'Gestão de Equipe',
      icon: <Users className="text-indigo-500" size={24} />,
      content: 'Controle total sobre quem acessa sua loja. Visualize seus colaboradores, bloqueie acessos temporariamente ou remova usuários. Acompanhe também o Log de Auditoria para saber exatamente quem fez o quê no sistema (ex: quem excluiu um produto ou alterou um preço).'
    },
    {
      title: 'Identidade Visual',
      icon: <Settings className="text-gray-600" size={24} />,
      content: 'Deixe o sistema com a cara da sua empresa. No menu Configurações, você pode alterar as cores do sistema, escolher entre modo claro/escuro e fazer upload do seu logotipo, que aparecerá no topo do menu e nos relatórios.'
    },
    {
      title: 'Segurança',
      icon: <ShieldCheck className="text-emerald-600" size={24} />,
      content: 'Proteção contra login duplicado: para garantir a segurança dos seus dados, o sistema permite apenas uma sessão ativa por usuário. Se você entrar em um novo dispositivo, a sessão anterior será desconectada automaticamente.'
    }
  ];

  return (
    <div id="printable-manual" className="max-w-4xl mx-auto space-y-8 pb-12">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #printable-manual, #printable-manual * { visibility: visible; }
          #printable-manual { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 2cm; background: white; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="flex justify-end no-print">
        <button 
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors"
        >
          <Printer size={18} />
          Imprimir Manual
        </button>
      </div>

      <header className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-black rounded-2xl mb-4 shadow-xl shadow-black/10">
          <BookOpen className="text-white" size={32} />
        </div>
        <h2 className="text-3xl font-bold text-gray-900">Manual do Usuário</h2>
        <p className="text-gray-500">Aprenda a extrair o máximo do seu sistema de gestão.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {sections.map((section, idx) => (
          <div key={idx} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-gray-50 rounded-2xl">
                {section.icon}
              </div>
              <h3 className="font-bold text-lg text-gray-800">{section.title}</h3>
            </div>
            <div className="text-gray-600 text-sm leading-relaxed">
              {section.content}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-3xl p-8 flex flex-col md:flex-row items-center gap-6">
        <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white shrink-0">
          <HelpCircle size={32} />
        </div>
        <div>
          <h4 className="font-bold text-blue-900 text-lg mb-1">Precisa de mais ajuda?</h4>
          <p className="text-blue-700 text-sm">
            Nossa equipe está à disposição para tirar dúvidas sobre cálculos de custo médio ou gestão de estoque. Entre em contato pelo suporte: <a href="mailto:avieiravale@gmail.com" className="font-bold underline hover:text-blue-900">avieiravale@gmail.com</a>
          </p>
        </div>
      </div>
    </div>
  );
};
