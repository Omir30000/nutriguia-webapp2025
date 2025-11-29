
import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import Loading from '../components/Loading';
import { 
  ShoppingCart, FileText, Printer, AlertCircle, CheckCircle, Circle, BrainCircuit, Leaf, Target, Calendar
} from 'lucide-react';
import { DietPlan, AnamneseData, IngredienteItem } from '../types';

// Helper puro para formatação (não precisa estar dentro do componente)
const formatarQuantidade = (item: IngredienteItem): string => {
  const qtd = item.quantidade_kg;
  const unid = item.quantidade_unidade;

  if (qtd && qtd > 0 && unid) {
    if (/^\d/.test(unid)) return unid; // Se unidade já começa com número
    return `${qtd} ${unid}`;
  }
  if (unid) return unid;
  if (qtd && qtd > 0) return `${qtd}`;
  return "";
};

const ListaCompras: React.FC = () => {
  const { user } = useAuth();
  const [dietPlan, setDietPlan] = useState<DietPlan | null>(null);
  const [anamnese, setAnamnese] = useState<AnamneseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({});

  useEffect(() => {
    const fetchDados = async () => {
      if (!user) return;
      try {
        const [planSnap, userSnap] = await Promise.all([
          db.collection('users').doc(user.uid).collection('plano').doc('gerado').get(),
          db.collection('users').doc(user.uid).get()
        ]);

        if (planSnap.exists) setDietPlan(planSnap.data() as DietPlan);
        if (userSnap.exists) {
          const userData = userSnap.data();
          if (userData?.anamnese) setAnamnese(userData.anamnese as AnamneseData);
        }
      } catch (error) {
        console.error("Erro ao buscar dados:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDados();
  }, [user]);

  const toggleCheck = (index: number) => {
    setCheckedItems(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const handleExportCSV = () => {
    if (!dietPlan?.lista_compras_semana) return;
    const headers = "Item,Quantidade,Unidade\n";
    const rows = dietPlan.lista_compras_semana.map(item => 
      `"${item.item}",${item.quantidade_kg || 0},"${item.quantidade_unidade || ''}"`
    ).join("\n");

    const link = document.createElement("a");
    link.href = encodeURI("data:text/csv;charset=utf-8," + headers + rows);
    link.download = "lista_compras_nutriguia.csv";
    link.click();
  };

  if (loading) return <Loading message="Organizando sua lista e estratégia..." />;

  const gerarResumoHumanizado = () => {
    if (!anamnese || !dietPlan) return "Estratégia personalizada carregada.";
    const { objetivo, tempoObjetivo, nome } = anamnese;
    
    return (
      <div className="space-y-3 text-gray-700 leading-relaxed">
        <p>Olá, <strong>{nome.split(' ')[0]}</strong>! Vamos focar em <strong className="text-emerald-700">{objetivo}</strong>.</p>
        <p>Ao longo de <strong>{tempoObjetivo}</strong>, aplicaremos o protocolo <strong>{dietPlan.modelo_dieta?.nome || "Dieta Personalizada"}</strong>.</p>
        <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100 font-medium text-emerald-800 text-center">
          {dietPlan.macros_totais || "Balanço energético ideal"}
        </div>
        <p>Nutrição inteligente para resultados saudáveis e sustentáveis.</p>
        {dietPlan.resumo_nutricional && (
          <div className="mt-4 pt-4 border-t border-gray-100 italic text-sm text-gray-600">
            "{dietPlan.resumo_nutricional}"
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <Navbar />
      <div className="max-w-4xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        
        {dietPlan ? (
          <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Planejamento & Compras</h1>
                <p className="text-gray-500 mt-1">Sua semana organizada.</p>
              </div>
              <div className="flex space-x-3 no-print">
                <button onClick={handleExportCSV} className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 shadow-sm">
                  <FileText className="w-4 h-4 mr-2 text-emerald-600" /> CSV
                </button>
                <button onClick={() => window.print()} className="inline-flex items-center px-4 py-2 bg-gray-900 border border-transparent rounded-lg text-sm font-medium text-white hover:bg-gray-800 shadow-md">
                  <Printer className="w-4 h-4 mr-2" /> Imprimir
                </button>
              </div>
            </div>

            {/* CARD ESTRATÉGIA */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-4 flex items-center gap-3">
                <BrainCircuit className="w-6 h-6 text-emerald-100" />
                <h2 className="text-xl font-bold text-white">Resumo da Estratégia</h2>
              </div>
              <div className="p-6 md:p-8">
                {gerarResumoHumanizado()}
                <div className="flex flex-wrap gap-3 mt-6">
                  {anamnese?.objetivo && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                      <Target className="w-3 h-3 mr-1" /> {anamnese.objetivo}
                    </span>
                  )}
                  {anamnese?.tempoObjetivo && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-100">
                      <Calendar className="w-3 h-3 mr-1" /> {anamnese.tempoObjetivo}
                    </span>
                  )}
                  {dietPlan.modelo_dieta?.nome && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-orange-50 text-orange-700 border border-orange-100">
                      <Leaf className="w-3 h-3 mr-1" /> {dietPlan.modelo_dieta.nome}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* LISTA DE COMPRAS */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600"><ShoppingCart className="w-5 h-5" /></div>
                  <h2 className="text-xl font-bold text-gray-900">Lista de Compras</h2>
                </div>
                <span className="text-sm text-gray-500 font-medium">{dietPlan.lista_compras_semana?.length || 0} itens</span>
              </div>

              {dietPlan.lista_compras_semana?.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {dietPlan.lista_compras_semana.map((item, index) => {
                    const isChecked = checkedItems[index] || false;
                    const qtd = formatarQuantidade(item);
                    return (
                      <div key={index} onClick={() => toggleCheck(index)} className={`group flex items-center justify-between p-4 md:px-6 hover:bg-gray-50 cursor-pointer transition-colors ${isChecked ? 'bg-gray-50' : 'bg-white'}`}>
                        <div className="flex items-center gap-4">
                          <button className="focus:outline-none">
                            {isChecked ? <CheckCircle className="w-6 h-6 text-emerald-500 fill-emerald-50" /> : <Circle className="w-6 h-6 text-gray-300 group-hover:text-emerald-400" />}
                          </button>
                          <span className={`text-base font-medium transition-all ${isChecked ? 'text-gray-400 line-through' : 'text-gray-800'}`}>{item.item}</span>
                        </div>
                        {qtd && (
                          <div className={`px-3 py-1 rounded-full text-sm font-bold whitespace-nowrap ${isChecked ? 'bg-gray-200 text-gray-500' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>
                            {qtd}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-10 text-center text-gray-500">Lista vazia.</div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-100">
            <AlertCircle className="w-16 h-16 text-emerald-200 mb-4" />
            <h2 className="text-xl font-bold text-gray-800 mb-2">Plano não encontrado</h2>
            <a href="#/anamnese" className="px-6 py-3 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 transition">Criar Novo Plano</a>
          </div>
        )}
      </div>
    </div>
  );
};

export default ListaCompras;
