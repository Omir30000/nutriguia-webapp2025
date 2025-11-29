
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import Loading from '../components/Loading';
import DashboardCard from '../components/dashboard/DashboardCard';
import PlanoResumo from '../components/dashboard/PlanoResumo';
import ReceitasMiniLista from '../components/dashboard/ReceitasMiniLista';
import ComprasMiniLista from '../components/dashboard/ComprasMiniLista';
import { 
  LayoutDashboard, PlusCircle, History, Utensils, ShoppingCart, FileText, User as UserIcon 
} from 'lucide-react';
import { DietPlan, AnamneseData } from '../types';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [plano, setPlano] = useState<DietPlan | null>(null);
  const [anamnese, setAnamnese] = useState<AnamneseData | null>(null);
  const [temPlano, setTemPlano] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      try {
        const [userDoc, planoDoc] = await Promise.all([
          db.collection('users').doc(user.uid).get(),
          db.collection('users').doc(user.uid).collection('plano').doc('gerado').get()
        ]);

        if (userDoc.exists) {
          const userData = userDoc.data();
          if (userData?.anamnese) setAnamnese(userData.anamnese as AnamneseData);
        }

        if (planoDoc.exists) {
          setPlano(planoDoc.data() as DietPlan);
          setTemPlano(true);
        }
      } catch (error) {
        console.error("Erro ao carregar dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  if (loading) return <Loading message="Carregando sua central de saúde..." />;

  if (!temPlano) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="bg-emerald-600 px-8 py-12 text-center text-white">
              <h1 className="text-3xl font-extrabold mb-4">Bem-vindo ao NutriGuia!</h1>
              <p className="text-lg text-emerald-100 max-w-2xl mx-auto">
                Vamos criar seu plano nutricional personalizado agora mesmo usando Inteligência Artificial.
              </p>
            </div>
            <div className="p-10 text-center">
              <Link to="/anamnese" className="inline-flex items-center justify-center px-8 py-4 border border-transparent text-lg font-medium rounded-md text-white bg-emerald-600 hover:bg-emerald-700 transition-all shadow-lg transform hover:-translate-y-1">
                <PlusCircle className="w-6 h-6 mr-2" /> Criar Meu Primeiro Plano
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div className="flex items-center space-x-4">
            <div className="bg-emerald-100 p-3 rounded-full">
              <UserIcon className="w-8 h-8 text-emerald-700" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Olá, {user?.displayName || 'Visitante'}</h1>
              <p className="text-gray-500 text-sm">Bem-vindo de volta ao seu painel.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <button className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
              <History className="w-4 h-4 mr-2 text-gray-500" /> Histórico
            </button>
            <Link to="/anamnese" className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-emerald-600 hover:bg-emerald-700">
              <PlusCircle className="w-4 h-4 mr-2" /> Novo Plano
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <DashboardCard title="Seu Plano Atual" icon={FileText} className="md:col-span-2" action={
            <Link to="/lista-compras" className="text-sm font-medium text-emerald-600 hover:text-emerald-800">Ver Detalhes &rarr;</Link>
          }>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <PlanoResumo resumo={plano?.resumo_nutricional} macros={plano?.macros_totais} objetivo={anamnese?.objetivo} dataGeracao={plano?.geradoEm} />
              <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-100 flex flex-col justify-center items-center text-center">
                 <p className="text-emerald-800 font-medium mb-2">Foco da Semana</p>
                 <p className="text-3xl font-bold text-emerald-600 mb-1">{anamnese?.tempoObjetivo || "Indefinido"}</p>
              </div>
            </div>
          </DashboardCard>

          <DashboardCard title="Status" icon={LayoutDashboard}>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">Peso Atual</span>
                <span className="font-bold text-gray-900">{anamnese?.peso} kg</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">Nível Ativ.</span>
                <span className="font-bold text-gray-900 truncate max-w-[120px]" title={anamnese?.nivelAtividade}>{anamnese?.nivelAtividade}</span>
              </div>
              <Link to="/lista-compras" className="block w-full text-center py-2 px-4 border border-emerald-600 text-emerald-600 rounded-md hover:bg-emerald-50 font-medium transition-colors mt-4">Ver Plano Completo</Link>
            </div>
          </DashboardCard>

          <DashboardCard title="Sugestões de Receitas" icon={Utensils}>
             <ReceitasMiniLista receitas={plano?.receitas_semana || []} />
          </DashboardCard>

          <DashboardCard title="Lista de Compras" icon={ShoppingCart} className="md:col-span-2 lg:col-span-2">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1">
                <p className="text-sm text-gray-500 mb-4">Itens essenciais para seguir sua dieta:</p>
                <ComprasMiniLista itens={plano?.lista_compras_semana || []} />
              </div>
              <div className="w-full md:w-1/3 bg-gray-50 p-4 rounded-lg border border-gray-100 flex flex-col justify-center">
                 <h4 className="font-bold text-gray-800 mb-2">Dica Nutricional</h4>
                 <p className="text-sm text-gray-600 italic">"{plano?.observacoes || "Hidrate-se!"}"</p>
              </div>
            </div>
          </DashboardCard>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
