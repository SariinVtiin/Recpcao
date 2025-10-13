import React, { useState, useEffect } from 'react';
import { User, Building2, LogOut, Send } from 'lucide-react';

export default function PainelRecepcao({ usuario, onLogout }) {
  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [motivo, setMotivo] = useState('');
  const [observacao, setObservacao] = useState('');
  const [departamentoId, setDepartamentoId] = useState(1);
  const [mensagem, setMensagem] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [estatisticas, setEstatisticas] = useState(null);

  useEffect(() => {
    buscarEstatisticas();
    const interval = setInterval(buscarEstatisticas, 5000);
    return () => clearInterval(interval);
  }, []);

  const buscarEstatisticas = async () => {
    try {
      const response = await fetch('http://192.167.2.41:3001/api/relatorios/dia');
      const data = await response.json();
      setEstatisticas(data);
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
    }
  };

  const registrarVisita = async () => {
    if (!nome.trim() || !cpf.trim()) {
      setMensagem('❌ Nome e CPF são obrigatórios');
      setTimeout(() => setMensagem(''), 3000);
      return;
    }

    setCarregando(true);

    try {
      const response = await fetch('http://192.167.2.41:3001/api/visitas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: nome.trim(),
          cpf: cpf.replace(/\D/g, ''),
          departamento_id: departamentoId,
          motivo: motivo.trim(),
          observacao: observacao.trim(),
          usuario_id: usuario.id
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setMensagem(`✅ ${data.visitante_nome} registrado com sucesso!`);
        setNome('');
        setCpf('');
        setMotivo('');
        setObservacao('');
        buscarEstatisticas();
        setTimeout(() => setMensagem(''), 3000);
      } else {
        const error = await response.json();
        setMensagem(`❌ ${error.error}`);
        setTimeout(() => setMensagem(''), 3000);
      }
    } catch (error) {
      console.error('Erro:', error);
      setMensagem('❌ Erro de conexão');
      setTimeout(() => setMensagem(''), 3000);
    } finally {
      setCarregando(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') registrarVisita();
  };

  const formatarCPF = (valor) => {
    let cpfLimpo = valor.replace(/\D/g, '');
    if (cpfLimpo.length <= 11) {
      if (cpfLimpo.length >= 9) {
        cpfLimpo = cpfLimpo.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4');
      } else if (cpfLimpo.length >= 6) {
        cpfLimpo = cpfLimpo.replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3');
      } else if (cpfLimpo.length >= 3) {
        cpfLimpo = cpfLimpo.replace(/(\d{3})(\d{1,3})/, '$1.$2');
      }
      setCpf(cpfLimpo);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-2xl mx-auto">
        {/* Estatísticas do Dia */}
        {estatisticas && estatisticas.length > 0 && (
          <div className="grid grid-cols-2 gap-4 mb-6">
            {estatisticas.map((stat) => (
              <div key={stat.departamento_nome} className="bg-white rounded-xl shadow-lg p-4">
                <div className="text-sm text-gray-600 mb-1">
                  {stat.departamento_nome.replace('Departamento ', '')}
                </div>
                <div className="flex items-end justify-between">
                  <div className="text-3xl font-bold text-gray-800">
                    {stat.total_visitas}
                  </div>
                  <div className="text-xs text-gray-500 space-y-1">
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                      {stat.atendidos} atendidos
                    </div>
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full mr-1"></div>
                      {stat.aguardando} aguardando
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="flex justify-between items-center mb-8 pb-6 border-b-2 border-gray-100">
            <div className="flex items-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-600 rounded-full mr-3">
                <Send className="text-white" size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Painel Recepção</h1>
                <p className="text-sm text-gray-600">{usuario.nome}</p>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="flex items-center px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
            >
              <LogOut size={18} className="mr-2" />
              Sair
            </button>
          </div>

          <div className="space-y-6">
            <div>
              <label className="flex items-center text-sm font-semibold text-gray-700 mb-2">
                <User size={18} className="mr-2 text-blue-600" />
                Nome Completo
              </label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Digite o nome completo"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="flex items-center text-sm font-semibold text-gray-700 mb-2">
                CPF
              </label>
              <input
                type="text"
                value={cpf}
                onChange={(e) => formatarCPF(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="000.000.000-00"
                maxLength="14"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
              />
              <p className="text-xs text-gray-500 mt-1">Formato: 000.000.000-00</p>
            </div>

            <div>
              <label className="flex items-center text-sm font-semibold text-gray-700 mb-2">
                Motivo da Visita
              </label>
              <input
                type="text"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ex: Entrega de documentos"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="flex items-center text-sm font-semibold text-gray-700 mb-2">
                Observação (opcional)
              </label>
              <input
                type="text"
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ex: Levar pasta azul"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="flex items-center text-sm font-semibold text-gray-700 mb-2">
                <Building2 size={18} className="mr-2 text-blue-600" />
                Departamento de Destino
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setDepartamentoId(1)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    departamentoId === 1
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                  }`}
                >
                  <div className="font-semibold">Operacional</div>
                  <div className="text-sm opacity-80">Sala 1</div>
                </button>
                
                <button
                  onClick={() => setDepartamentoId(2)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    departamentoId === 2
                      ? 'bg-green-600 text-white border-green-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-green-400'
                  }`}
                >
                  <div className="font-semibold">Pessoal</div>
                  <div className="text-sm opacity-80">Sala 2</div>
                </button>
              </div>
            </div>

            <button
              onClick={registrarVisita}
              disabled={carregando}
              className={`w-full py-4 rounded-lg font-bold text-lg text-white transition-all ${
                carregando
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg'
              }`}
            >
              {carregando ? 'Registrando...' : 'Registrar Visitante'}
            </button>
          </div>

          {mensagem && (
            <div className={`mt-6 p-4 rounded-lg text-center font-semibold ${
              mensagem.includes('✅') 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {mensagem}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}