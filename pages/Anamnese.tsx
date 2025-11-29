
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import Loading from '../components/Loading';
import { gerarPlanoNutricional } from '../services/aiService';
import { AnamneseData } from '../types';
import { 
  User, Ruler, Weight, Activity, UtensilsCrossed, Target, Calendar, ChevronRight, TrendingDown, TrendingUp, BrainCircuit
} from 'lucide-react';

const Anamnese: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<AnamneseData>({
    nome: user?.displayName || '',
    idade: '',
    peso: '',
    altura: '',
    genero: 'Masculino',
    objetivo: 'Perder peso',
    metaPesoKg: '',
    tempoObjetivo: '',
    nivelAtividade: 'Sedentário',
    restricoes: '',
    preferencias: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!formData.objetivo || !formData.tempoObjetivo) {
      alert("Por favor, preencha objetivo e prazo.");
      return;
    }

    if ((formData.objetivo === 'Perder peso' || formData.objetivo === 'Ganhar massa muscular') && !formData.metaPesoKg) {
      alert("Por favor, informe a meta de peso (KG).");
      return;
    }

    setLoading(true);
    try {
      const anamneseParaSalvar = {
        nome: formData.nome || "",
        idade: formData.idade || "",
        peso: formData.peso || "",
        altura: formData.altura || "",
        genero: formData.genero || "Masculino",
        objetivo: formData.objetivo || "",
        metaPesoKg: formData.metaPesoKg || "",
        tempoObjetivo: formData.tempoObjetivo || "",
        nivelAtividade: formData.nivelAtividade || "",
        restricoes: formData.restricoes || "",
        preferencias: formData.preferencias || ""
      };

      await db.collection('users').doc(user.uid).set({ 
        anamnese: anamneseParaSalvar,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      const planoGerado = await gerarPlanoNutricional(formData);

      if (!planoGerado) throw new Error("Plano incompleto.");

      await db.collection('users').doc(user.uid).collection('plano').doc('gerado').set({
        ...planoGerado,
        uid: user.uid,
        updatedAt: new Date().toISOString()
      });

      navigate('/lista-compras');

    } catch (error) {
      console.error("Erro anamnese:", error);
      alert("Ocorreu um erro ao gerar seu plano.");
    } finally {
      setLoading(false);
    }
  };

  const showWeightGoalInput = formData.objetivo === 'Perder peso' || formData.objetivo === 'Ganhar massa muscular';

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Navbar />
      {loading && <Loading message="A IA está analisando seu perfil e montando a dieta perfeita..." />}
      
      <div className="max-w-4xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight sm:text-4xl">Novo Plano Nutricional</h1>
          <p className="mt-3 text-lg text-gray-500">Inteligência Artificial calculando seus macros.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 bg-emerald-50 border-b border-emerald-100 flex items-center gap-2">
              <User className="w-5 h-5 text-emerald-700" />
              <h3 className="text-lg font-bold text-emerald-900">Seus Dados Corporais</h3>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="relative group">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Idade</label>
                <input required type="number" name="idade" value={formData.idade} onChange={handleChange} className="block w-full px-3 py-3 border border-gray-200 rounded-xl focus:ring-emerald-500" placeholder="Anos" />
              </div>
              <div className="relative group">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Gênero</label>
                <select name="genero" value={formData.genero} onChange={handleChange} className="block w-full px-3 py-3 border border-gray-200 rounded-xl focus:ring-emerald-500 bg-white">
                  <option>Masculino</option>
                  <option>Feminino</option>
                  <option>Outro</option>
                </select>
              </div>
              <div className="relative group">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Peso (kg)</label>
                <input required type="number" step="0.1" name="peso" value={formData.peso} onChange={handleChange} className="block w-full px-3 py-3 border border-gray-200 rounded-xl focus:ring-emerald-500" placeholder="00.0" />
              </div>
              <div className="relative group">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Altura (cm)</label>
                <input required type="number" name="altura" value={formData.altura} onChange={handleChange} className="block w-full px-3 py-3 border border-gray-200 rounded-xl focus:ring-emerald-500" placeholder="170" />
              </div>
              <div className="md:col-span-2 lg:col-span-4 relative group">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nível de Atividade</label>
                <select name="nivelAtividade" value={formData.nivelAtividade} onChange={handleChange} className="block w-full px-3 py-3 border border-gray-200 rounded-xl focus:ring-emerald-500 bg-white">
                  <option>Sedentário (Pouco ou nenhum exercício)</option>
                  <option>Levemente Ativo (Exercício 1-3 dias/semana)</option>
                  <option>Moderadamente Ativo (Exercício 3-5 dias/semana)</option>
                  <option>Muito Ativo (Exercício 6-7 dias/semana)</option>
                  <option>Atleta Profissional</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-emerald-100 overflow-hidden ring-1 ring-emerald-100">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-white">
                <Target className="w-6 h-6" /><h3 className="text-xl font-bold">Objetivo</h3>
              </div>
              <BrainCircuit className="w-6 h-6 text-emerald-200 opacity-50" />
            </div>
            
            <div className="p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Objetivo Principal</label>
                  <select required name="objetivo" value={formData.objetivo} onChange={handleChange} className="block w-full py-3 px-4 border border-gray-300 rounded-xl shadow-sm text-lg">
                    <option value="Perder peso">Perder peso</option>
                    <option value="Ganhar massa muscular">Ganhar massa muscular</option>
                    <option value="Manter peso">Manter peso</option>
                    <option value="Definição corporal">Definição</option>
                    <option value="Reeducação alimentar">Reeducação alimentar</option>
                    <option value="Aumentar energia">Mais energia</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Prazo</label>
                  <input required type="text" name="tempoObjetivo" placeholder="Ex: 3 meses" value={formData.tempoObjetivo} onChange={handleChange} className="block w-full px-3 py-3 border border-gray-300 rounded-xl shadow-sm" />
                </div>
              </div>

              {showWeightGoalInput && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6">
                  <label className="block text-base font-bold text-emerald-900 mb-3">
                    {formData.objetivo === 'Perder peso' ? 'Quantos KG deseja perder?' : 'Quantos KG deseja ganhar?'}
                  </label>
                  <div className="relative max-w-xs">
                    <input required type="number" step="0.1" name="metaPesoKg" value={formData.metaPesoKg || ''} onChange={handleChange} className="block w-full pl-10 pr-12 py-3 border border-emerald-300 rounded-xl shadow-sm text-lg font-semibold text-emerald-700" placeholder="0.0" />
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      {formData.objetivo === 'Perder peso' ? <TrendingDown className="w-5 h-5 text-emerald-500" /> : <TrendingUp className="w-5 h-5 text-emerald-500" />}
                    </div>
                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none"><span className="text-emerald-600 font-bold">KG</span></div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
              <UtensilsCrossed className="w-5 h-5 text-gray-600" /><h3 className="text-lg font-bold text-gray-800">Preferências</h3>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Restrições</label>
                <textarea name="restricoes" rows={3} value={formData.restricoes} onChange={handleChange} className="block w-full p-3 border border-gray-300 rounded-xl shadow-sm" placeholder="Glúten, Lactose..." />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Preferências</label>
                <textarea name="preferencias" rows={3} value={formData.preferencias} onChange={handleChange} className="block w-full p-3 border border-gray-300 rounded-xl shadow-sm" placeholder="Frango, Café..." />
              </div>
            </div>
          </div>

          <div className="pt-4">
            <button type="submit" className="group w-full flex items-center justify-center py-4 px-6 border border-transparent rounded-2xl shadow-lg text-lg font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 transform transition-all hover:scale-[1.01]">
              <BrainCircuit className="w-6 h-6 mr-3 text-emerald-200" /> Gerar Plano Inteligente <ChevronRight className="w-5 h-5 ml-2" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Anamnese;
