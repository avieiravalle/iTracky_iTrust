import { useState } from 'react';

interface ProductData {
  name: string;
  image: string;
  brand: string;
}

export function useProductLookup() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lookupProduct = async (ean: string, token: string): Promise<ProductData | null> => {
    if (!ean || ean.length < 8) return null;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/lookup-external/${ean}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Produto não encontrado');
      }

      const data = await response.json();
      return data;
    } catch (err) {
      setError('Produto não encontrado na base global.');
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { lookupProduct, loading, error };
}