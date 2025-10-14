import React, { useState, useEffect, useCallback } from 'react';
import { Building2, LogOut, Clock, UserCheck, CheckCircle } from 'lucide-react';

export default function PainelDepartamento({ usuario, onLogout }) {
  const [visitasAguardando, setVisitasAguardando] = useState([]);
  const [visitasChamados, setVisitasChamados] = useState([]);
  const [visitasFinalizadas, setVisitasFinalizadas] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState('aguardando');
  const [ultimaQuantidade, setUltimaQuantidade] = useState(0);

  // Buscar visitantes aguardando
  const buscarAguardando = useCallback(async () => {
    try {
      const response = await fetch(
        `http://192.167.2.41:3001/api/visitas/aguardando/${usuario.departamento_id}`
      );
      const data = await response.json();
      
      if (data.length > ultimaQuantidade && ultimaQuantidade > 0) {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUKXh8LJnHgU5k9n0zHgsBS');
        audio.volume = 0.3;
        audio.play().catch(e => console.log('Áudio bloqueado:', e));
      }
      
      setUltimaQuantidade(data.length);
      setVisitasAguardando(data);
    } catch (error) {
      console.error('Erro ao buscar aguardando:', error);
    }
  }, [usuario.departamento_id, ultimaQuantidade]);

  // Buscar visitantes em atendimento (chamados)
  const buscarChamados = useCallback(async () => {
    try {
      const response = await fetch(
        `http://192.167.2.41:3001/api/visitas/chamados/${usuario.departamento_id}`
      );
      const data = await response.json();
      setVisitasChamados(data);
    } catch (error) {
      console.error('Erro ao buscar chamados:', error);
    }
  }, [usuario.departamento_id]);

  // Buscar visitantes finalizados (do dia)
  const buscarFinalizados = useCallback(async () => {
    try {
      const hoje = new Date().toISOString().split('T')[0];
      const response = await fetch(
        `http://192.167.2.41:3001/api/visitas?departamento_id=${usuario.departamento_id}&status=atendido`
      );
      const data = await response.json();
      
      const visitasHoje = data
        .filter(v => {
          const dataVisita = new Date(v.hora_chegada).toISOString().split('T')[0];
          return dataVisita === hoje;
        })
        .sort((a, b) => new Date(b.hora_saida) - new Date(a.hora_saida));
      
      setVisitasFinalizadas(visitasHoje);
    } catch (error) {
      console.error('Erro ao buscar finalizados:', error);
    }
  }, [usuario.departamento_id]);

  // Atualização automática
  useEffect(() => {
    if (usuario.departamento_id) {
      buscarAguardando();
      buscarChamados();
      buscarFinalizados();
      
      const interval = setInterval(() => {
        buscarAguardando();
        buscarChamados();
        buscarFinalizados();
      }, 3000);
      
      return () => clearInterval(interval);
    }
  }, [usuario.departamento_id, buscarAguardando, buscarChamados, buscarFinalizados]);

  // Chamar visitante (aguardando → chamado)
  const chamarVisitante = async (visitaId, nomeVisitante) => {
    const confirmar = window.confirm(`Deseja chamar ${nomeVisitante}?`);
    if (!confirmar) return;

    setCarregando(true);
    try {
      const response = await fetch(
        `http://192.167.2.41:3001/api/visitas/${visitaId}/chamar`,
        { method: 'PUT' }
      );

      if (response.ok) {
        await buscarAguardando();
        await buscarChamados();
        setAbaAtiva('chamados');
      } else {
        alert('Erro ao chamar visitante.');
      }
    } catch (error) {
      console.error('Erro:', error);
      alert('Erro de conexão.');
    } finally {
      setCarregando(false);
    }
  };

  // Finalizar atendimento (chamado → finalizado)
  const finalizarAtendimento = async (visitaId, nomeVisitante) => {
    const confirmar = window.confirm(`Finalizar atendimento de ${nomeVisitante}?`);
    if (!confirmar) return;

    setCarregando(true);
    try {
      const response = await fetch(
        `http://192.167.2.41:3001/api/visitas/${visitaId}/finalizar`,
        { method: 'PUT' }
      );

      if (response.ok) {
        await buscarChamados();
        await buscarFinalizados();
        setAbaAtiva('finalizados');
      } else {
        alert('Erro ao finalizar atendimento.');
      }
    } catch (error) {
      console.error('Erro:', error);
      alert('Erro de conexão.');
    } finally {
      setCarregando(false);
    }
  };

  // Calcular tempo de espera
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

  // Calcular tempo total de atendimento
  const calcularTempoAtendimento = (horaChegada, horaSaida) => {
    if (!horaSaida) return '-';
    const chegada = new Date(horaChegada);
    const saida = new Date(horaSaida);
    const diffMs = saida - chegada;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return '< 1 min';
    if (diffMins < 60) return `${diffMins} mins`;
    
    const horas = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${horas}h ${mins}m`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* Header */}
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
              className="flex items-center px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
            >
              <LogOut size={18} className="mr-2" />
              Sair
            </button>
          </div>

          {/* Abas */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setAbaAtiva('aguardando')}
              className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 ${
                abaAtiva === 'aguardando'
                  ? 'bg-orange-600 text-white shadow-lg' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Clock size={20} />
              Aguardando ({visitasAguardando.length})
            </button>
            
            <button
              onClick={() => setAbaAtiva('chamados')}
              className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 ${
                abaAtiva === 'chamados'
                  ? 'bg-blue-600 text-white shadow-lg' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <UserCheck size={20} />
              Em Atendimento ({visitasChamados.length})
            </button>
            
            <button
              onClick={() => setAbaAtiva('finalizados')}
              className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 ${
                abaAtiva === 'finalizados'
                  ? 'bg-green-600 text-white shadow-lg' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <CheckCircle size={20} />
              Finalizados ({visitasFinalizadas.length})
            </button>
          </div>

          {/* Conteúdo das Abas */}
          <div className="min-h-[400px]">
            {/* ABA: AGUARDANDO */}
            {abaAtiva === 'aguardando' && (
              <div>
                <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Clock size={24} className="text-orange-600" />
                  Visitantes Aguardando
                </h2>

                {visitasAguardando.length === 0 ? (
                  <div className="text-center py-16 text-gray-500">
                    <Clock size={64} className="mx-auto mb-4 opacity-30" />
                    <p className="text-lg">Nenhum visitante aguardando</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {visitasAguardando.map((visita) => (
                      <div 
                        key={visita.visita_id} 
                        className="flex items-center justify-between p-5 bg-orange-50 rounded-xl hover:bg-orange-100 transition-colors border-l-4 border-orange-500 shadow-sm"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="font-bold text-gray-900 text-lg">
                              {visita.visitante_nome}
                            </div>
                            <span className="px-3 py-1 bg-orange-200 text-orange-800 text-xs rounded-full font-bold">
                              ⏱ {calcularTempoEspera(visita.hora_chegada)}
                            </span>
                          </div>
                          {visita.motivo && (
                            <div className="text-sm text-gray-700 mt-1 flex items-center gap-1">
                              <span>📋</span>
                              <span>{visita.motivo}</span>
                            </div>
                          )}
                          {visita.observacao && (
                            <div className="text-sm text-blue-700 mt-1 flex items-center gap-1">
                              <span>ℹ️</span>
                              <span className="font-semibold">{visita.observacao}</span>
                            </div>
                          )}
                          <div className="text-xs text-gray-600 mt-2">
                            🕐 Chegou às {new Date(visita.hora_chegada).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}
                          </div>
                        </div>
                        <button
                          onClick={() => chamarVisitante(visita.visita_id, visita.visitante_nome)}
                          disabled={carregando}
                          className="px-8 py-4 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-700 hover:to-green-800 transition-all font-bold text-lg disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-105"
                        >
                          📢 Chamar
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ABA: CHAMADOS (EM ATENDIMENTO) */}
            {abaAtiva === 'chamados' && (
              <div>
                <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <UserCheck size={24} className="text-blue-600" />
                  Em Atendimento
                </h2>

                {visitasChamados.length === 0 ? (
                  <div className="text-center py-16 text-gray-500">
                    <UserCheck size={64} className="mx-auto mb-4 opacity-30" />
                    <p className="text-lg">Nenhum visitante em atendimento</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {visitasChamados.map((visita) => (
                      <div 
                        key={visita.visita_id} 
                        className="flex items-center justify-between p-5 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors border-l-4 border-blue-500 shadow-sm"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="font-bold text-gray-900 text-lg">
                              {visita.visitante_nome}
                            </div>
                            <span className="px-3 py-1 bg-blue-200 text-blue-800 text-xs rounded-full font-bold animate-pulse">
                              🔵 Em atendimento
                            </span>
                          </div>
                          {visita.motivo && (
                            <div className="text-sm text-gray-700 mt-1">
                              📋 {visita.motivo}
                            </div>
                          )}
                          {visita.observacao && (
                            <div className="text-sm text-blue-700 mt-1 font-semibold">
                              ℹ️ {visita.observacao}
                            </div>
                          )}
                          <div className="text-xs text-gray-600 mt-2 flex gap-4">
                            <span>🕐 Chegada: {new Date(visita.hora_chegada).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}</span>
                            <span>📢 Chamado: {new Date(visita.hora_chamada).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => finalizarAtendimento(visita.visita_id, visita.visitante_nome)}
                          disabled={carregando}
                          className="px-8 py-4 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-700 hover:to-green-800 transition-all font-bold text-lg disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-105"
                        >
                          ✅ Finalizar
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ABA: FINALIZADOS */}
            {abaAtiva === 'finalizados' && (
              <div>
                <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <CheckCircle size={24} className="text-green-600" />
                  Atendimentos Finalizados Hoje
                </h2>

                {visitasFinalizadas.length === 0 ? (
                  <div className="text-center py-16 text-gray-500">
                    <CheckCircle size={64} className="mx-auto mb-4 opacity-30" />
                    <p className="text-lg">Nenhum atendimento finalizado hoje</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {visitasFinalizadas.map((visita) => (
                      <div 
                        key={visita.visita_id} 
                        className="p-5 bg-green-50 rounded-xl border-l-4 border-green-500 shadow-sm hover:bg-green-100 transition-colors"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="font-bold text-gray-900 text-lg">
                                {visita.visitante_nome}
                              </div>
                              <span className="px-3 py-1 bg-green-200 text-green-800 text-xs rounded-full font-bold">
                                ✓ Finalizado
                              </span>
                            </div>
                            {visita.motivo && (
                              <div className="text-sm text-gray-700 mb-2">
                                📋 {visita.motivo}
                              </div>
                            )}
                            <div className="text-xs text-gray-600 space-y-1 bg-white p-3 rounded-lg">
                              <div className="flex justify-between">
                                <span className="font-semibold">🕐 Chegada:</span>
                                <span>{new Date(visita.hora_chegada).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="font-semibold">📢 Chamado:</span>
                                <span>{visita.hora_chamada ? new Date(visita.hora_chamada).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'}) : '-'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="font-semibold">✅ Finalizado:</span>
                                <span>{visita.hora_saida ? new Date(visita.hora_saida).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'}) : '-'}</span>
                              </div>
                              <div className="flex justify-between border-t pt-1 mt-1">
                                <span className="font-bold">⏱ Tempo Total:</span>
                                <span className="font-bold text-green-700">{calcularTempoAtendimento(visita.hora_chegada, visita.hora_saida)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer com Resumo */}
          <div className="mt-8 pt-6 border-t-2 border-gray-100">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-orange-50 rounded-lg p-4 text-center border-2 border-orange-200">
                <div className="text-3xl font-bold text-orange-700">{visitasAguardando.length}</div>
                <div className="text-sm text-orange-600 font-semibold mt-1">Aguardando</div>
              </div>
              <div className="bg-blue-50 rounded-lg p-4 text-center border-2 border-blue-200">
                <div className="text-3xl font-bold text-blue-700">{visitasChamados.length}</div>
                <div className="text-sm text-blue-600 font-semibold mt-1">Em Atendimento</div>
              </div>
              <div className="bg-green-50 rounded-lg p-4 text-center border-2 border-green-200">
                <div className="text-3xl font-bold text-green-700">{visitasFinalizadas.length}</div>
                <div className="text-sm text-green-600 font-semibold mt-1">Finalizados Hoje</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}