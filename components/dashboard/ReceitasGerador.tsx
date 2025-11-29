import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { chamarGroqReceita } from '../../services/groqRecipeService';
import { Receita, DietPlan } from '../../types';
import { X, ChefHat, Flame, Users, Clock, Loader2 } from 'lucide-react';

const ReceitasGerador: React.FC = () => {
  const { user } = useAuth();
  const [modalAberto, setModalAberto] = useState(false);
  const [loading, setLoading] = useState(false);
  const [receitasGeradas, setReceitasGeradas] = useState<Receita[]>([]);

  // Carregar receitas salvas ao iniciar
  useEffect(() => {
    if (!user) return;
    const carregarReceitas = async () => {
      try {
        const snapshot = await db.collection('users').doc(user.uid).collection('receitas-geradas').get();
        const lista = snapshot.docs.map(doc => doc.data() as Receita);
        setReceitasGeradas(lista);
      } catch (error) {
        console.error("Erro ao carregar receitas:", error);
      }
    };
    carregarReceitas();
  }, [user]);

  const abrirModalGerarReceitas = () => setModalAberto(true);
  const fecharModalGerarReceitas = () => setModalAberto(false);

  const gerarReceita = async (tipo: string) => {
    if (!user) return;
    setLoading(true);
    
    try {
      // 1. Ler ingredientes do plano atual
      const planoDoc = await db.collection('users').doc(user.uid).collection('plano').doc('gerado').get();
      
      let ingredientes: string[] = [];
      if (planoDoc.exists) {
        const data = planoDoc.data() as DietPlan;
        if (data.lista_compras_semana) {
          ingredientes = data.lista_compras_semana.map(i => i.item);
        }
      }

      if (ingredientes.length === 0) {
        alert("Não encontramos sua lista de compras. Gere um plano primeiro.");
        setLoading(false);
        return;
      }

      // 2. Chamar Groq
      const novaReceita = await chamarGroqReceita(ingredientes, tipo);

      // 3. Salvar no Firebase com ID automático
      await db.collection('users').doc(user.uid).collection('receitas-geradas').add({
        ...novaReceita,
        criadoEm: new Date().toISOString()
      });

      // 4. Atualizar lista visual
      setReceitasGeradas(prev => [novaReceita, ...prev]);
      
      // Fechar modal se não for "Gerar todas" (simplificação)
      if (tipo !== 'Todas') {
        fecharModalGerarReceitas();
      }

    } catch (error) {
      console.error(error);
      alert("Erro ao gerar receita. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-10 border-t border-gray-200 pt-8">
      
      {/* 1. Botão Principal */}
      <div className="flex justify-center">
        <button 
          id="btnGerarReceitas" 
          onClick={abrirModalGerarReceitas}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-full shadow-lg transform transition hover:scale-105 flex items-center gap-2"
        >
          <ChefHat className="w-5 h-5" />
          Gerar Receitas com IA
        </button>
      </div>

      {/* 2. Área de Receitas Geradas */}
      <div id="receitasGeradas" className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        {receitasGeradas.map((receita, idx) => (
          <div key={idx} className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 hover:shadow-xl transition-all">
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-4">
              <h3 className="text-white font-bold text-lg flex items-center justify-between">
                {receita.titulo}
                <span className="text-xs bg-white/20 px-2 py-1 rounded text-white uppercase">{receita.tipo_refeicao}</span>
              </h3>
            </div>
            <div className="p-5">
              <div className="flex gap-4 mb-4 text-sm text-gray-600">
                {receita.calorias && (
                  <div className="flex items-center gap-1 bg-orange-50 px-2 py-1 rounded text-orange-700">
                    <Flame className="w-4 h-4" /> {receita.calorias}
                  </div>
                )}
                {receita.porcoes && (
                  <div className="flex items-center gap-1 bg-blue-50 px-2 py-1 rounded text-blue-700">
                    <Users className="w-4 h-4" /> {receita.porcoes}
                  </div>
                )}
                <div className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded text-gray-700">
                  <Clock className="w-4 h-4" /> {receita.tempo_minutos} min
                </div>
              </div>

              <div className="mb-4">
                <p className="font-semibold text-gray-800 mb-2">Ingredientes:</p>
                <div className="flex flex-wrap gap-2">
                  {receita.ingredientes.map((ing, i) => (
                    <span key={i} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                      {ing}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <p className="font-semibold text-gray-800 mb-2">Preparo:</p>
                <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
                  {receita.modo_preparo.map((passo, p) => (
                    <li key={p}>{passo}</li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 3. Modal */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative animate-fade-in-up">
            
            {/* Header Modal */}
            <div className="bg-indigo-600 p-4 flex justify-between items-center">
              <h3 className="text-white font-bold text-lg">Escolha a Refeição</h3>
              <button onClick={fecharModalGerarReceitas} className="text-white/80 hover:text-white transition">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Body Modal */}
            <div className="p-6">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-3" />
                  <p className="text-gray-600 font-medium">O Chef IA está criando sua receita...</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-gray-500 mb-4 text-center">
                    Usaremos os ingredientes da sua lista de compras atual.
                  </p>
                  
                  {[
                    "Café da manhã",
                    "Almoço",
                    "Jantar",
                    "Lanche rápido"
                  ].map((tipo) => (
                    <button
                      key={tipo}
                      onClick={() => gerarReceita(tipo)}
                      className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 hover:border-indigo-500 hover:bg-indigo-50 transition flex items-center justify-between group"
                    >
                      <span className="font-medium text-gray-700 group-hover:text-indigo-700">{tipo}</span>
                      <ChefHat className="w-4 h-4 text-gray-300 group-hover:text-indigo-500" />
                    </button>
                  ))}
                  
                  <div className="pt-2">
                    <button
                      onClick={() => {
                        gerarReceita("Café da manhã");
                        setTimeout(() => gerarReceita("Almoço"), 2000);
                        setTimeout(() => gerarReceita("Jantar"), 4000);
                        fecharModalGerarReceitas();
                      }}
                      className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold py-3 rounded-lg hover:shadow-lg transition opacity-90 hover:opacity-100"
                    >
                      Gerar Todas as Refeições
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReceitasGerador;
