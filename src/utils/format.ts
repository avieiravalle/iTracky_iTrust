/**
 * Formata um número para o padrão de moeda brasileiro (BRL).
 * Exemplo: 1259.19 -> "1.259,19"
 */
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

/**
 * Formata um número para o padrão de moeda brasileiro com o prefixo R$.
 * Exemplo: 1259.19 -> "R$ 1.259,19"
 */
export const formatBRL = (value: number): string => {
  return `R$ ${formatCurrency(value)}`;
};
