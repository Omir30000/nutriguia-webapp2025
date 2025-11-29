import React from 'react';
import { Target, Activity, Calendar } from 'lucide-react';

interface PlanoResumoProps {
  resumo?: string;
  macros?: string;
  objetivo?: string;
  dataGeracao?: string;
}

const PlanoResumo: React.FC<PlanoResumoProps> = ({ resumo, macros, objetivo, dataGeracao }) => {
  const dataFormatada = dataGeracao 
    ? new Date(dataGeracao).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
    : 'Data não disponível';

  return (
    <div className="space-y-4">
      {objetivo && (
        <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
          <Target className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs font-bold text-blue-800 uppercase tracking-wide">Objetivo Atual</p>
            <p className="text-blue-900 font-medium">{objetivo}</p>
          </div>
        </div>
      )}

      <div>
        <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Estratégia Nutricional</h4>
        <p className="text-gray-700 leading-relaxed text-sm bg-gray-50 p-3 rounded-md border border-gray-100">
          {resumo || "Nenhum resumo disponível."}
        </p>
      </div>

      {macros && (
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <Activity className="w-4 h-4 text-emerald-500" />
          <span className="font-medium">Meta Diária:</span>
          <span>{macros}</span>
        </div>
      )}

      <div className="pt-2 border-t border-gray-100 flex items-center text-xs text-gray-400">
        <Calendar className="w-3 h-3 mr-1" />
        Última atualização: {dataFormatada}
      </div>
    </div>
  );
};

export default PlanoResumo;