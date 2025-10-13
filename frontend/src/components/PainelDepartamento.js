import React, { useState, useEffect } from 'react';
import { Building2, LogOut, Clock } from 'lucide-react';

export default function PainelDepartamento({ usuario, onLogout }) {
  const [visitasAguardando, setVisitasAguardando] = useState([]);
  const [historico, setHistorico] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [mostrarHistorico, setMostrarHistorico] = useState(false);
  const [ultimaQuantidade, setUltimaQuantidade] = useState(0);

  useEffect(() => {
    if (usuario.departamento_id) {
      buscarVisitas();
      buscarHistorico();
      const interval = setInterval(buscarVisitas, 3000);
      return () => clearInterval(interval);
    }
  }, [usuario.departamento_id]);

  const buscarVisitas = async () => {
    try {
      const response = await fetch(`http://192.167.2.41:3001/api/visitas/aguardando/${usuario.departamento_id}`);
      const data = await response.json();
      
      // Notificação sonora quando novo visitante chega
      if (data.length > ultimaQuantidade && ultimaQuantidade > 0) {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUKXh8LJnHgU5k9n0zHgsBS');
        audio.volume = 0.3;
        audio.play().catch(e => console.log('Áudio bloqueado:', e));
      }
      
      setUltimaQuantidade(data.length);
      setVisitasAguardando(data);
    } catch (error) {
      console.error('Erro ao buscar visitas:', error);
    }
  };

  const buscarHistorico = async () => {
    try {
      const response = await fetch(`http://192.167.2.41:3001/api/visitas?departamento_id=${usuario.departamento_id}&status=atendido`);
      const data = await response.json();
      setHistorico(data.slice(0, 10));
    } catch (error) {
      console.error('Erro ao buscar histórico:', error);
    }
  };

  const chamarVisitante = async (visitaId, nomeVisitante) => {
    const confirmar = window.confirm(`Deseja chamar ${nomeVisitante}?`);
    if (!confirmar) return;

    setCarregando(true);
    try {
      await fetch(`http://192.167.2.41:3001/api/visitas/${visitaId}/chamar`, {
        method: 'PUT',
      });
      buscarVisitas();
    } catch (error) {
      console.error('Erro ao chamar visitante:', error);
      alert('Erro ao chamar visitante. Tente novamente.');
    } finally {
      setCarregando(false);
    }
  };

  const calcularTempoEspera = (horaChegada) => {
    const agora = new Date();
    const chegada = new Date(horaChegada);
    const diffMs = agora - chegada;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Agora';
    if (diffMins === 1) return '1 min';
    if (diffMins < 60) return `${diffMins} mins`;
    
    const horas = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${horas}h ${mins}m`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="flex justify-between items-center mb-8 pb-6 border-b-2 border-gray-100">
            <div className="flex items-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-green-600 rounded-full mr-3">
                <Building2 className="text-white" size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Painel Departamento</h1>
                <p className="text-sm text-gray-600">{usuario.nome} • {usuario.departamento_nome}</p>
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

          {/* Abas */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setMostrarHistorico(false)}
              className={`flex-1 py-3 rounded-lg font-semibold transition-colors ${
                !mostrarHistorico 
                  ? 'bg-green-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Aguardando ({visitasAguardando.length})
            </button>
            <button
              onClick={() => {
                setMostrarHistorico(true);
                buscarHistorico();
              }}
              className={`flex-1 py-3 rounded-lg font-semibold transition-colors ${
                mostrarHistorico 
                  ? 'bg-green-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Histórico
            </button>
          </div>

          {!mostrarHistorico ? (
            <>
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                Visitantes Aguardando
              </h2>

              {visitasAguardando.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Clock size={48} className="mx-auto mb-4 opacity-50" />
                  <p>Nenhum visitante aguardando</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {visitasAguardando.map((visita) => (
                    <div key={visita.visita_id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border-l-4 border-green-500">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div className="font-semibold text-gray-800 text-lg">
                            {visita.visitante_nome}
                          </div>
                          <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full font-semibold">
                            {calcularTempoEspera(visita.hora_chegada)}
                          </span>
                        </div>
                        {visita.motivo && (
                          <div className="text-sm text-gray-600 mt-1">
                            📋 {visita.motivo}
                          </div>
                        )}
                        {visita.observacao && (
                          <div className="text-sm text-blue-600 mt-1">
                            ℹ️ {visita.observacao}
                          </div>
                        )}
                        <div className="text-xs text-gray-500 mt-1">
                          🕐 Chegou às {new Date(visita.hora_chegada).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}
                        </div>
                      </div>
                      <button
                        onClick={() => chamarVisitante(visita.visita_id, visita.visitante_nome)}
                        disabled={carregando}
                        className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed"
                      >
                        Chamar
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                Últimos Atendimentos
              </h2>

              {historico.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p>Nenhum atendimento registrado</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {historico.map((visita) => (
                    <div key={visita.visita_id} className="p-4 bg-gray-50 rounded-lg border-l-4 border-blue-500">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="font-semibold text-gray-800">
                            {visita.visitante_nome}
                          </div>
                          {visita.motivo && (
                            <div className="text-sm text-gray-600 mt-1">
                              {visita.motivo}
                            </div>
                          )}
                          <div className="text-xs text-gray-500 mt-2 space-y-1">
                            <div>Chegada: {new Date(visita.hora_chegada).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}</div>
                            <div>Chamado: {visita.hora_chamada ? new Date(visita.hora_chamada).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'}) : '-'}</div>
                            <div>Atendido: {visita.hora_saida ? new Date(visita.hora_saida).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'}) : '-'}</div>
                          </div>
                        </div>
                        <span className="px-3 py-1 bg-green-100 text-green-700 text-xs rounded-full font-semibold">
                          Atendido
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}