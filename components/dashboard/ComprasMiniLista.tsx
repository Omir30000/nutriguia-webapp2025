import React from 'react';
import { ShoppingBasket, ArrowRight, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { IngredienteItem } from '../../types';

interface ComprasMiniListaProps {
  itens: IngredienteItem[];
}

const ComprasMiniLista: React.FC<ComprasMiniListaProps> = ({ itens }) => {
  if (!itens || itens.length === 0) {
    return <p className="text-gray-500 text-sm italic">Sua lista de compras está vazia.</p>;
  }

  // Pegar apenas os 5 primeiros itens
  const previewItens = itens.slice(0, 5);

  return (
    <div className="space-y-0">
      <ul className="divide-y divide-gray-100">
        {previewItens.map((item, index) => (
          <li key={index} className="py-3 flex items-center justify-between hover:bg-gray-50 px-2 rounded-md transition-colors">
            <div className="flex items-center">
              <div className="w-5 h-5 rounded-full border-2 border-gray-300 mr-3 flex items-center justify-center">
                 {/* Checkbox simulado apenas visual */}
              </div>
              <span className="text-sm text-gray-700">{item.item}</span>
            </div>
            <span className="text-xs text-gray-400 font-medium bg-gray-100 px-2 py-1 rounded-full">{item.quantidade_unidade}</span>
          </li>
        ))}
      </ul>

      {itens.length > 5 && (
        <p className="text-xs text-gray-400 text-center py-2">
          e mais {itens.length - 5} itens...
        </p>
      )}

      <div className="pt-3 text-center border-t border-gray-50 mt-2">
        <Link to="/lista-compras" className="inline-flex items-center text-sm font-medium text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-4 py-2 rounded-full hover:bg-emerald-100 transition-colors">
          <ShoppingBasket className="w-4 h-4 mr-2" />
          Ver lista completa
        </Link>
      </div>
    </div>
  );
};

export default ComprasMiniLista;