
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import Loading from '../components/Loading';
import { 
  Clock, ChefHat, X, Loader2, Flame, ShoppingBasket, Sparkles, Zap, Filter, Search, Heart, SlidersHorizontal, Dumbbell
} from 'lucide-react';
import { DietPlan, Receita } from '../types';
import { chamarGroqReceita } from '../services/groqRecipeService';

// --- TIPOS LOCAIS ---
interface ReceitaComSource extends Receita {
  source: 'plano' | 'gerada';
  originalIndex?: number;
}

// --- HELPERS (Fora do componente para performance) ---
const normalizarCategoria = (tipo: string): string => {
  if (!tipo) return "Outros";
  const t = tipo.toLowerCase();
  if (t.includes("café") || t.includes("manhã")) return "Café da Manhã";
  if (t.includes("almoço")) return "Almoço";
  if (t.includes("jantar")) return "Jantar";
  if (t.includes("lanche") || t.includes("tarde") || t.includes("snack")) return "Lanche";
  return "Outros";
};

const extrairNumero = (str?: string): number => {
  if (!str) return 0;
  const num = parseInt(str.replace(/\D/g, ''));
  return isNaN(num) ? 0 : num;
};

const checkIngredientesDisponiveis = (receitaIngredientes: string[], ingredientesBase: string[]): boolean => {
  if (ingredientesBase.length === 0) return false;
  let matchCount = 0;
  const total = receitaIngredientes.length;
  
  receitaIngredientes.forEach(ri => {
      const riClean = ri.toLowerCase();
      // Verifica correspondência parcial bidirecional
      const match = ingredientesBase.some(base => riClean.includes(base) || base.includes(riClean.split(" ")[0] || "xyz"));
      if (match) matchCount++;
  });
  
  return (matchCount / total) >= 0.3; // 30% de match
};

const Receitas: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  
  // Dados
  const [todasReceitas, setTodasReceitas] = useState<ReceitaComSource[]>([]);
  const [ingredientesBase, setIngredientesBase] = useState<string[]>([]);
  
  // UI States
  const [modalGerarAberto, setModalGerarAberto] = useState(false);
  const [modalDetalhesAberto, setModalDetalhesAberto] = useState(false);
  const [receitaSelecionada, setReceitaSelecionada] = useState<ReceitaComSource | null>(null);
  
  // Loading States
  const [loadingGen, setLoadingGen] = useState(false);
  const [statusGen, setStatusGen] = useState("");

  // Filtros
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRefeicao, setFilterRefeicao] = useState<string[]>([]);
  const [filterCalorias, setFilterCalorias] = useState(""); 
  const [filterTempo, setFilterTempo] = useState("");
  const [filterDificuldade, setFilterDificuldade] = useState<string[]>([]);
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [onlyNew, setOnlyNew] = useState(false);
  const [onlyAvailableIngredients, setOnlyAvailableIngredients] = useState(false);

  // --- CARREGAMENTO DE DADOS ---
  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      try {
        let listaFinal: ReceitaComSource[] = [];

        // 1. Receitas do Plano (Firestore)
        const docRef = db.collection('users').doc(user.uid).collection('plano').doc('gerado');
        const docSnap = await docRef.get();

        if (docSnap.exists) {
          const data = docSnap.data() as DietPlan;
          
          if (data.receitas_semana) {
            const receitasPlano = data.receitas_semana.map((r, index) => ({
               ...r,
               source: 'plano' as const,
               originalIndex: index,
               isNew: r.isNew !== false,
               tipo_refeicao: normalizarCategoria(r.tipo_refeicao || "Outros"),
               calorias: r.calorias || "---",
               dificuldade: r.dificuldade || "Médio",
               favorito: r.favorito || false
            }));
            listaFinal = [...listaFinal, ...receitasPlano];
          }
          
          if (data.lista_compras_semana) {
            setIngredientesBase(data.lista_compras_semana.map(i => i.item.toLowerCase()));
          }
        }

        // 2. Receitas Geradas Manualmente (Subcoleção)
        const extrasRef = db.collection('users').doc(user.uid).collection('receitas-geradas').orderBy('criadoEm', 'desc');
        const extrasSnap = await extrasRef.get();
        const extras = extrasSnap.docs.map(doc => {
            const r = doc.data() as Receita;
            return { 
                ...r, 
                id: doc.id, 
                source: 'gerada' as const,
                isNew: r.isNew === true,
                tipo_refeicao: normalizarCategoria(r.tipo_refeicao || "Outros"),
                favorito: r.favorito || false
            };
        });
        
        listaFinal = [...listaFinal, ...extras];
        setTodasReceitas(listaFinal);

      } catch (error) {
        console.error("Erro ao buscar receitas:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  // --- LÓGICA DE UPDATE NO FIRESTORE (Refatorada para reutilização) ---
  const atualizarStatusReceita = useCallback(async (receita: ReceitaComSource, updates: Partial<Receita>) => {
    if (!user) return;

    try {
      if (receita.source === 'gerada' && receita.id) {
        // Atualização simples em documento
        await db.collection('users').doc(user.uid).collection('receitas-geradas').doc(receita.id).update(updates);
      } else if (receita.source === 'plano' && typeof receita.originalIndex === 'number') {
        // Atualização dentro de array (Transaction necessária para segurança)
        const planoRef = db.collection('users').doc(user.uid).collection('plano').doc('gerado');
        await db.runTransaction(async (transaction) => {
          const doc = await transaction.get(planoRef);
          if (!doc.exists) return;
          
          const data = doc.data() as DietPlan;
          const receitasAtualizadas = [...(data.receitas_semana || [])];
          
          if (receitasAtualizadas[receita.originalIndex!]) {
            receitasAtualizadas[receita.originalIndex!] = {
              ...receitasAtualizadas[receita.originalIndex!],
              ...updates
            };
            transaction.update(planoRef, { receitas_semana: receitasAtualizadas });
          }
        });
      }
    } catch (error) {
      console.error("Erro ao atualizar receita:", error);
      throw error; // Propaga erro para reverter UI se necessário
    }
  }, [user]);

  // --- HANDLERS ---
  const toggleFilterArray = (item: string, state: string[], setState: React.Dispatch<React.SetStateAction<string[]>>) => {
      setState(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]);
  };

  const toggleFavorite = async (e: React.MouseEvent, receita: ReceitaComSource) => {
      e.stopPropagation();
      const novoStatus = !receita.favorito;

      // Optimistic UI Update
      setTodasReceitas(prev => prev.map(r => r === receita ? { ...r, favorito: novoStatus } : r));

      try {
          await atualizarStatusReceita(receita, { favorito: novoStatus });
      } catch (error) {
          // Revert em caso de erro
          setTodasReceitas(prev => prev.map(r => r === receita ? { ...r, favorito: !novoStatus } : r));
      }
  };

  const abrirDetalhes = async (receita: ReceitaComSource) => {
      setReceitaSelecionada(receita);
      setModalDetalhesAberto(true);

      // Marca como lida se for nova
      if (receita.isNew) {
          try {
              await atualizarStatusReceita(receita, { isNew: false });
              setTodasReceitas(prev => prev.map(r => r === receita ? { ...r, isNew: false } : r));
          } catch (error) {
              console.error("Falha ao marcar como lida", error);
          }
      }
  };

  const gerarNovaReceita = async (tipo: string) => {
    if (!user) return;
    if (ingredientesBase.length === 0) {
        alert("Lista de compras vazia. Gere um plano primeiro.");
        return;
    }
    setLoadingGen(true);
    setStatusGen(`Criando ${tipo}...`);
    
    try {
        const novaReceita = await chamarGroqReceita(ingredientesBase, tipo);
        
        const docRef = await db.collection('users').doc(user.uid).collection('receitas-geradas').add({
            ...novaReceita,
            isNew: true,
            criadoEm: new Date().toISOString()
        });

        const novaReceitaLocal: ReceitaComSource = { 
            ...novaReceita, 
            id: docRef.id, 
            isNew: true,
            source: 'gerada',
            tipo_refeicao: normalizarCategoria(novaReceita.tipo_refeicao || tipo)
        };

        setTodasReceitas(prev => [novaReceitaLocal, ...prev]);
        if (tipo !== 'Todas') setModalGerarAberto(false);
    } catch (error) {
        console.error(error);
        alert("Erro ao gerar receita. Tente novamente.");
    } finally {
        setLoadingGen(false);
        setStatusGen("");
    }
  };

  const handleGerarTodas = async () => {
    setLoadingGen(true);
    try {
      const tipos = ["Café da Manhã", "Almoço", "Lanche", "Jantar"];
      for (const tipo of tipos) {
        setStatusGen(`Criando ${tipo}...`);
        await gerarNovaReceita(tipo);
      }
      setModalGerarAberto(false);
    } catch (e) { console.error(e); } finally { setLoadingGen(false); }
  };

  // --- FILTRAGEM (Memoized) ---
  const receitasFiltradas = useMemo(() => {
    return todasReceitas.filter(receita => {
        // 1. Pesquisa Texto
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            const inTitle = receita.titulo.toLowerCase().includes(term);
            const inIngred = receita.ingredientes.some(i => i.toLowerCase().includes(term));
            if (!inTitle && !inIngred) return false;
        }

        // 2. Filtros Simples
        if (filterRefeicao.length > 0 && !filterRefeicao.includes(receita.tipo_refeicao || "")) return false;
        if (onlyFavorites && !receita.favorito) return false;
        if (onlyNew && !receita.isNew) return false;

        // 3. Calorias
        if (filterCalorias) {
            const cals = extrairNumero(receita.calorias);
            if (filterCalorias === "<200" && cals >= 200) return false;
            if (filterCalorias === "200-400" && (cals < 200 || cals > 400)) return false;
            if (filterCalorias === ">400" && cals <= 400) return false;
        }

        // 4. Tempo
        if (filterTempo) {
            const tempo = parseInt(receita.tempo_minutos);
            if (filterTempo === "<15" && tempo >= 15) return false;
            if (filterTempo === "15-30" && (tempo < 15 || tempo > 30)) return false;
            if (filterTempo === ">30" && tempo <= 30) return false;
        }

        // 5. Dificuldade
        if (filterDificuldade.length > 0 && !filterDificuldade.includes(receita.dificuldade || "Médio")) return false;

        // 6. Ingredientes Disponíveis (Heavy Check - Último)
        if (onlyAvailableIngredients && !checkIngredientesDisponiveis(receita.ingredientes, ingredientesBase)) return false;

        return true;
    });
  }, [
      todasReceitas, searchTerm, filterRefeicao, filterCalorias, filterTempo, 
      filterDificuldade, onlyFavorites, onlyNew, onlyAvailableIngredients, ingredientesBase
  ]);

  const limparFiltros = () => {
    setSearchTerm("");
    setFilterRefeicao([]);
    setFilterCalorias("");
    setFilterTempo("");
    setFilterDificuldade([]);
    setOnlyFavorites(false);
    setOnlyNew(false);
    setOnlyAvailableIngredients(false);
  };

  if (loading) return <Loading />;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            Receitas
            <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2 py-0.5 rounded-full">
              {receitasFiltradas.length}
            </span>
          </h1>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-grow md:w-80">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input 
                    type="text" 
                    placeholder="Buscar..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                />
            </div>
            <button 
                onClick={() => setModalGerarAberto(true)}
                className="bg-gray-900 text-white p-2 md:px-4 md:py-2 rounded-lg hover:bg-emerald-600 transition flex items-center gap-2 shrink-0 shadow-sm"
            >
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span className="hidden md:inline font-semibold text-sm">Gerar Receita</span>
            </button>
            <button 
                onClick={() => setShowFilters(!showFilters)}
                className={`md:hidden p-2 rounded-lg border ${showFilters ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-white border-gray-300 text-gray-700'}`}
            >
                <Filter className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-6">
            
            {/* SIDEBAR FILTROS */}
            <div className={`
                ${showFilters ? 'block' : 'hidden'} md:block 
                w-full md:w-64 flex-shrink-0 bg-white md:bg-transparent rounded-xl shadow-lg md:shadow-none p-5 md:p-0 z-10
            `}>
                <div className="space-y-6">
                    <div className="flex items-center gap-2 text-gray-800 font-bold border-b pb-2">
                        <SlidersHorizontal className="w-4 h-4" /> Filtros
                    </div>

                    <div className="space-y-2">
                        <label className="flex items-center space-x-2 cursor-pointer">
                            <input type="checkbox" checked={onlyFavorites} onChange={() => setOnlyFavorites(!onlyFavorites)} className="rounded text-emerald-600 focus:ring-emerald-500" />
                            <span className="text-sm text-gray-700 flex items-center gap-1"><Heart className="w-3 h-3 fill-current text-red-500" /> Favoritas</span>
                        </label>
                        <label className="flex items-center space-x-2 cursor-pointer">
                            <input type="checkbox" checked={onlyNew} onChange={() => setOnlyNew(!onlyNew)} className="rounded text-emerald-600 focus:ring-emerald-500" />
                            <span className="text-sm text-gray-700 flex items-center gap-1"><Zap className="w-3 h-3 fill-current text-yellow-500" /> Novas</span>
                        </label>
                        <label className="flex items-center space-x-2 cursor-pointer">
                            <input type="checkbox" checked={onlyAvailableIngredients} onChange={() => setOnlyAvailableIngredients(!onlyAvailableIngredients)} className="rounded text-emerald-600 focus:ring-emerald-500" />
                            <span className="text-sm text-gray-700">Ingredientes da Lista</span>
                        </label>
                    </div>

                    <div>
                        <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Refeição</h4>
                        <div className="space-y-1.5">
                            {["Café da Manhã", "Almoço", "Jantar", "Lanche"].map(tipo => (
                                <label key={tipo} className="flex items-center space-x-2 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={filterRefeicao.includes(tipo)}
                                        onChange={() => toggleFilterArray(tipo, filterRefeicao, setFilterRefeicao)}
                                        className="rounded text-emerald-600 focus:ring-emerald-500" 
                                    />
                                    <span className="text-sm text-gray-600">{tipo}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div>
                        <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Dificuldade</h4>
                        <div className="flex flex-wrap gap-2">
                            {["Fácil", "Médio", "Difícil"].map(nivel => (
                                <button 
                                    key={nivel}
                                    onClick={() => toggleFilterArray(nivel, filterDificuldade, setFilterDificuldade)}
                                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                                        filterDificuldade.includes(nivel) 
                                        ? 'bg-emerald-100 border-emerald-200 text-emerald-800' 
                                        : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                                    }`}
                                >
                                    {nivel}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Calorias</h4>
                        <select value={filterCalorias} onChange={(e) => setFilterCalorias(e.target.value)} className="w-full text-sm border-gray-300 rounded-md shadow-sm">
                            <option value="">Todas</option>
                            <option value="<200">Até 200 kcal</option>
                            <option value="200-400">200 - 400 kcal</option>
                            <option value=">400">Mais de 400 kcal</option>
                        </select>
                    </div>

                    <div>
                        <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Tempo</h4>
                        <select value={filterTempo} onChange={(e) => setFilterTempo(e.target.value)} className="w-full text-sm border-gray-300 rounded-md shadow-sm">
                            <option value="">Qualquer</option>
                            <option value="<15">Rápido (até 15 min)</option>
                            <option value="15-30">Médio (15-30 min)</option>
                            <option value=">30">Longo (+30 min)</option>
                        </select>
                    </div>

                    <button onClick={limparFiltros} className="text-xs text-emerald-600 font-semibold hover:underline w-full text-left">
                        Limpar filtros
                    </button>
                </div>
            </div>

            {/* GRID RECEITAS */}
            <div className="flex-grow">
                {receitasFiltradas.length === 0 ? (
                    <div className="bg-white rounded-xl p-12 text-center border border-dashed border-gray-300 h-64 flex flex-col items-center justify-center">
                        <Filter className="h-10 w-10 text-gray-300 mb-3" />
                        <h3 className="text-lg font-bold text-gray-900">Nenhuma receita encontrada</h3>
                        <p className="text-gray-500 text-sm">Ajuste os filtros ou gere novas receitas.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {receitasFiltradas.map((receita, idx) => (
                            <div 
                                key={idx} 
                                onClick={() => abrirDetalhes(receita)}
                                className="group bg-white rounded-xl shadow-sm border border-gray-200 hover:border-emerald-500 hover:shadow-md transition-all cursor-pointer relative overflow-hidden flex flex-col h-full"
                            >
                                <div className="absolute top-0 right-0 z-10 flex flex-col items-end">
                                    {receita.isNew && (
                                        <div className="bg-emerald-500 text-white text-[10px] font-extrabold px-3 py-1 rounded-bl-xl shadow-sm tracking-wide flex items-center gap-1 mb-1">
                                            <Zap className="w-3 h-3 fill-current" /> NOVA
                                        </div>
                                    )}
                                </div>

                                <div className="p-5 flex-grow">
                                    <div className="flex justify-between items-start mb-3">
                                        <span className="inline-block py-1 px-2 rounded-md bg-gray-100 text-gray-600 text-xs font-bold uppercase">
                                            {receita.tipo_refeicao}
                                        </span>
                                        <button 
                                            onClick={(e) => toggleFavorite(e, receita)}
                                            className="p-1.5 rounded-full hover:bg-gray-100 transition-colors z-20"
                                        >
                                            <Heart className={`w-5 h-5 ${receita.favorito ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
                                        </button>
                                    </div>

                                    <h4 className="font-bold text-gray-900 text-lg leading-tight mb-2 line-clamp-2">
                                        {receita.titulo}
                                    </h4>
                                    
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="flex items-center gap-1 text-xs font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded-md">
                                            <Flame className="w-3 h-3 fill-current" />
                                            {extrairNumero(receita.calorias)} kcal
                                        </div>
                                        {receita.dificuldade && (
                                            <div className="flex items-center gap-1 text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-md">
                                                <Dumbbell className="w-3 h-3" />
                                                {receita.dificuldade}
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div className="flex items-center justify-between text-xs text-gray-500 mt-auto pt-3 border-t border-gray-50">
                                        <span className="flex items-center gap-1">
                                            <Clock className="w-3.5 h-3.5" /> 
                                            {receita.tempo_minutos} min
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <ShoppingBasket className="w-3.5 h-3.5" /> 
                                            {receita.ingredientes?.length || 0} ing.
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>

        {/* MODAL GERAR */}
        {modalGerarAberto && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
              <div className="bg-gray-900 p-5 flex justify-between items-center">
                <h3 className="text-white font-bold text-lg flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-emerald-400" /> Gerador de Receitas
                </h3>
                <button onClick={() => !loadingGen && setModalGerarAberto(false)} disabled={loadingGen} className="text-gray-400 hover:text-white transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-8">
                {loadingGen ? (
                  <div className="flex flex-col items-center justify-center py-6 text-center">
                    <Loader2 className="w-12 h-12 text-emerald-600 animate-spin mb-4" />
                    <p className="text-gray-900 font-bold text-lg mb-1">{statusGen}</p>
                    <p className="text-gray-500 text-sm">Calculando macros e dificuldade...</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600 mb-6 text-center">
                        Gerar receitas baseadas na sua <strong>Lista de Compras</strong>.
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                        {["Café da Manhã", "Almoço", "Lanche", "Jantar"].map((tipo) => (
                            <button key={tipo} onClick={() => gerarNovaReceita(tipo)} className="px-4 py-3 rounded-xl border border-gray-200 hover:border-emerald-500 hover:bg-emerald-50 text-gray-700 font-medium text-sm transition-all">{tipo}</button>
                        ))}
                    </div>
                    <button onClick={handleGerarTodas} className="w-full mt-4 bg-emerald-600 text-white font-bold py-3.5 rounded-xl hover:bg-emerald-700 shadow-md transition-all">
                        Gerar Menu Completo (4 Receitas)
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* MODAL DETALHES */}
        {modalDetalhesAberto && receitaSelecionada && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/70 backdrop-blur-sm p-4 overflow-y-auto">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden relative my-8 flex flex-col max-h-[90vh]">
                    <div className="bg-gray-900 text-white p-6 flex justify-between items-start shrink-0">
                        <div>
                            <span className="inline-block py-1 px-2 rounded bg-emerald-500/20 text-emerald-300 text-xs font-bold uppercase mb-2 border border-emerald-500/30">
                                {receitaSelecionada.tipo_refeicao}
                            </span>
                            <h3 className="text-2xl font-bold leading-tight pr-4">{receitaSelecionada.titulo}</h3>
                        </div>
                        <button onClick={() => setModalDetalhesAberto(false)} className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors">
                            <X className="w-5 h-5 text-white" />
                        </button>
                    </div>

                    <div className="p-6 overflow-y-auto bg-white">
                         <div className="grid grid-cols-3 gap-4 mb-6">
                            <div className="bg-orange-50 p-3 rounded-xl text-center border border-orange-100">
                                <span className="block text-xs text-orange-700 font-bold uppercase mb-1">Calorias</span>
                                <span className="block text-lg font-extrabold text-orange-900">{receitaSelecionada.calorias}</span>
                            </div>
                            <div className="bg-blue-50 p-3 rounded-xl text-center border border-blue-100">
                                <span className="block text-xs text-blue-700 font-bold uppercase mb-1">Tempo</span>
                                <span className="block text-lg font-extrabold text-blue-900">{receitaSelecionada.tempo_minutos} min</span>
                            </div>
                            <div className="bg-purple-50 p-3 rounded-xl text-center border border-purple-100">
                                <span className="block text-xs text-purple-700 font-bold uppercase mb-1">Dificuldade</span>
                                <span className="block text-lg font-extrabold text-purple-900">{receitaSelecionada.dificuldade || "Médio"}</span>
                            </div>
                         </div>

                         {receitaSelecionada.macros && (
                             <div className="flex justify-between bg-gray-50 p-4 rounded-xl mb-8 border border-gray-100">
                                 <div className="text-center">
                                     <span className="text-xs text-gray-500 uppercase font-bold">Proteína</span>
                                     <p className="font-bold text-gray-800">{receitaSelecionada.macros.proteinas || "-"}</p>
                                 </div>
                                 <div className="text-center border-l border-gray-200 pl-4 ml-4">
                                     <span className="text-xs text-gray-500 uppercase font-bold">Carbo</span>
                                     <p className="font-bold text-gray-800">{receitaSelecionada.macros.carboidratos || "-"}</p>
                                 </div>
                                 <div className="text-center border-l border-gray-200 pl-4 ml-4">
                                     <span className="text-xs text-gray-500 uppercase font-bold">Gordura</span>
                                     <p className="font-bold text-gray-800">{receitaSelecionada.macros.gorduras || "-"}</p>
                                 </div>
                             </div>
                         )}

                         <div className="space-y-8">
                            <div>
                                <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2 border-b pb-2">
                                    <ShoppingBasket className="w-5 h-5 text-emerald-600" /> Ingredientes
                                </h4>
                                <ul className="space-y-3">
                                    {receitaSelecionada.ingredientes?.map((ing, i) => (
                                        <li key={i} className="flex items-start text-gray-700 text-sm">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 mr-3 shrink-0"></span>
                                            {ing}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2 border-b pb-2">
                                    <ChefHat className="w-5 h-5 text-emerald-600" /> Modo de Preparo
                                </h4>
                                <ol className="space-y-4">
                                    {receitaSelecionada.modo_preparo?.map((passo, i) => (
                                        <li key={i} className="flex gap-4 text-sm text-gray-700">
                                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-900 text-white font-bold text-xs flex items-center justify-center">{i + 1}</span>
                                            <p className="pt-0.5 leading-relaxed">{passo}</p>
                                        </li>
                                    ))}
                                </ol>
                            </div>
                         </div>
                    </div>

                    <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end shrink-0">
                        <button onClick={() => setModalDetalhesAberto(false)} className="px-6 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 font-bold text-sm hover:bg-gray-100 transition-colors">Fechar</button>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default Receitas;
