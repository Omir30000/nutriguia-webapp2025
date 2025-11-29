import React from 'react';
import { Clock, ChefHat, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Receita } from '../../types';

interface ReceitasMiniListaProps {
  receitas: Receita[];
}

const ReceitasMiniLista: React.FC<ReceitasMiniListaProps> = ({ receitas }) => {
  if (!receitas || receitas.length === 0) {
    return <p className="text-gray-500 text-sm italic">Nenhuma receita encontrada no plano atual.</p>;
  }

  // Pegar apenas as 3 primeiras para exibir na dashboard
  const previewReceitas = receitas.slice(0, 3);

  return (
    <div className="space-y-3">
      {previewReceitas.map((receita, index) => (
        <div key={index} className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-lg hover:border-emerald-200 transition-colors shadow-sm">
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="bg-orange-100 p-2 rounded-full flex-shrink-0">
              <ChefHat className="w-4 h-4 text-orange-600" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{receita.titulo}</p>
              <div className="flex items-center text-xs text-gray-500">
                <Clock className="w-3 h-3 mr-1" />
                {receita.tempo_minutos} min • {receita.tipo_refeicao || 'Refeição'}
              </div>
            </div>
          </div>
        </div>
      ))}
      
      <div className="pt-2 text-center">
        <Link to="/receitas" className="inline-flex items-center text-sm text-emerald-600 hover:text-emerald-700 font-medium">
          Ver todas as receitas <ArrowRight className="w-4 h-4 ml-1" />
        </Link>
      </div>
    </div>
  );
};

export default ReceitasMiniLista;