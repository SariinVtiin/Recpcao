import React, { useState, useEffect, useCallback } from 'react';
import { Building2, LogOut, Clock, UserCheck, CheckCircle } from 'lucide-react';
import './PainelDepartamento.css';

export default function PainelDepartamento({ usuario, onLogout }) {
  const [visitasAguardando, setVisitasAguardando] = useState([]);
  const [visitasChamados, setVisitasChamados] = useState([]);
  const [visitasFinalizadas, setVisitasFinalizadas] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState('aguardando');
  const [ultimaQuantidade, setUltimaQuantidade] = useState(0);

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
      console.error('Erro:', error);
    }
  }, [usuario.departamento_id, ultimaQuantidade]);

  const buscarChamados = useCallback(async () => {
    try {
      const response = await fetch(
        `http://192.167.2.41:3001/api/visitas/chamados/${usuario.departamento_id}`
      );
      const data = await response.json();
      setVisitasChamados(data);
    } catch (error) {
      console.error('Erro:', error);
    }
  }, [usuario.departamento_id]);

  const buscarFinalizados = useCallback(async () => {
    try {
      const response = await fetch(
        `http://192.167.2.41:3001/api/visitas?departamento_id=${usuario.departamento_id}&status=finalizado`
      );
      const data = await response.json();
      
      console.log('Visitas finalizadas recebidas:', data); // Debug
      
      // Pegar data de hoje no formato YYYY-MM-DD
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      
      const visitasHoje = data
        .filter(v => {
          if (!v.hora_chegada) return false;
          const dataVisita = new Date(v.hora_chegada);
          dataVisita.setHours(0, 0, 0, 0);
          return dataVisita.getTime() === hoje.getTime();
        })
        .sort((a, b) => {
          if (!a.hora_saida || !b.hora_saida) return 0;
          return new Date(b.hora_saida) - new Date(a.hora_saida);
        });
      
      console.log('Visitas hoje filtradas:', visitasHoje); // Debug
      setVisitasFinalizadas(visitasHoje);
    } catch (error) {
      console.error('Erro:', error);
      setVisitasFinalizadas([]);
    }
  }, [usuario.departamento_id]);

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

  const chamarVisitante = async (visitaId, nomeVisitante) => {
    if (!window.confirm(`Deseja chamar ${nomeVisitante}?`)) return;

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

  const finalizarAtendimento = async (visitaId, nomeVisitante) => {
    if (!window.confirm(`Finalizar atendimento de ${nomeVisitante}?`)) return;

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
        alert('Erro ao finalizar.');
      }
    } catch (error) {
      console.error('Erro:', error);
      alert('Erro de conexão.');
    } finally {
      setCarregando(false);
    }
  };

  const rechamarVisitante = async (visitaId, nomeVisitante) => {
    if (!window.confirm(`${nomeVisitante} não compareceu?\n\nDeseja devolver para a fila?`)) return;

    setCarregando(true);
    try {
      const response = await fetch(
        `http://192.167.2.41:3001/api/visitas/${visitaId}/rechamar`,
        { method: 'PUT' }
      );

      if (response.ok) {
        await buscarChamados();
        await buscarAguardando();
        setAbaAtiva('aguardando');
      } else {
        alert('Erro ao rechamar.');
      }
    } catch (error) {
      console.error('Erro:', error);
      alert('Erro de conexão.');
    } finally {
      setCarregando(false);
    }
  };

  const calcularTempoEspera = (horaChegada) => {
    const diffMins = Math.floor((new Date() - new Date(horaChegada)) / 60000);
    if (diffMins < 1) return 'Agora';
    if (diffMins === 1) return '1 min';
    if (diffMins < 60) return `${diffMins} mins`;
    const horas = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${horas}h ${mins}m`;
  };

  const calcularTempoAtendimento = (horaChegada, horaSaida) => {
    if (!horaSaida) return '-';
    const diffMins = Math.floor((new Date(horaSaida) - new Date(horaChegada)) / 60000);
    if (diffMins < 1) return '< 1 min';
    if (diffMins < 60) return `${diffMins} mins`;
    const horas = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${horas}h ${mins}m`;
  };

  return (
    <div className="painel-dept-container">
      <div className="painel-dept-background"></div>
      <div className="painel-dept-overlay"></div>

      <div className="painel-dept-content">
        <div className="painel-dept-card">
          {/* Header */}
          <div className="painel-dept-header">
            <div className="painel-dept-header-left">
              <div className="painel-dept-icon">
                <Building2 className="text-white" size={24} />
              </div>
              <div>
                <h1 className="painel-dept-title">Painel Departamento</h1>
                <p className="painel-dept-subtitle">{usuario.nome} • {usuario.departamento_nome}</p>
              </div>
            </div>
            <button onClick={onLogout} className="painel-dept-btn-logout">
              <LogOut size={18} className="mr-2" />
              Sair
            </button>
          </div>

          {/* Abas */}
          <div className="painel-dept-tabs">
            <button
              onClick={() => setAbaAtiva('aguardando')}
              className={`painel-dept-tab aguardando ${abaAtiva === 'aguardando' ? 'active' : ''}`}
            >
              <Clock size={20} />
              Aguardando ({visitasAguardando.length})
            </button>
            
            <button
              onClick={() => setAbaAtiva('chamados')}
              className={`painel-dept-tab chamados ${abaAtiva === 'chamados' ? 'active' : ''}`}
            >
              <UserCheck size={20} />
              Em Atendimento ({visitasChamados.length})
            </button>
            
            <button
              onClick={() => setAbaAtiva('finalizados')}
              className={`painel-dept-tab finalizados ${abaAtiva === 'finalizados' ? 'active' : ''}`}
            >
              <CheckCircle size={20} />
              Finalizados ({visitasFinalizadas.length})
            </button>
          </div>

          {/* Conteúdo */}
          <div className="painel-dept-tab-content">
            {/* ABA AGUARDANDO */}
            {abaAtiva === 'aguardando' && (
              <div>
                <h2 className="painel-dept-section-title">
                  <Clock size={24} className="text-orange-600" />
                  Visitantes Aguardando
                </h2>

                {visitasAguardando.length === 0 ? (
                  <div className="painel-dept-empty">
                    <Clock size={64} className="painel-dept-empty-icon" />
                    <p className="painel-dept-empty-text">Nenhum visitante aguardando</p>
                  </div>
                ) : (
                  <div className="painel-dept-visitas-list">
                    {visitasAguardando.map((visita) => (
                      <div key={visita.visita_id} className="painel-dept-visita-card aguardando">
                        <div className="painel-dept-visita-info">
                          <div className="painel-dept-visita-header">
                            <div className="painel-dept-visita-nome">{visita.visitante_nome}</div>
                            <span className="painel-dept-badge aguardando">
                              ⏱ {calcularTempoEspera(visita.hora_chegada)}
                            </span>
                          </div>
                          {visita.motivo && (
                            <div className="painel-dept-visita-motivo">
                              <span>📋</span>
                              <span>{visita.motivo}</span>
                            </div>
                          )}
                          {visita.observacao && (
                            <div className="painel-dept-visita-obs">
                              <span>ℹ️</span>
                              <span>{visita.observacao}</span>
                            </div>
                          )}
                          <div className="painel-dept-visita-horarios">
                            <span>🕐 Chegou às {new Date(visita.hora_chegada).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => chamarVisitante(visita.visita_id, visita.visitante_nome)}
                          disabled={carregando}
                          className="painel-dept-btn chamar"
                        >
                          📢 Chamar
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ABA CHAMADOS */}
            {abaAtiva === 'chamados' && (
              <div>
                <h2 className="painel-dept-section-title">
                  <UserCheck size={24} className="text-blue-600" />
                  Em Atendimento
                </h2>

                {visitasChamados.length === 0 ? (
                  <div className="painel-dept-empty">
                    <UserCheck size={64} className="painel-dept-empty-icon" />
                    <p className="painel-dept-empty-text">Nenhum visitante em atendimento</p>
                  </div>
                ) : (
                  <div className="painel-dept-visitas-list">
                    {visitasChamados.map((visita) => (
                      <div key={visita.visita_id} className="painel-dept-visita-card chamado">
                        <div className="painel-dept-visita-info">
                          <div className="painel-dept-visita-header">
                            <div className="painel-dept-visita-nome">{visita.visitante_nome}</div>
                            <span className="painel-dept-badge chamado">
                              🔵 Em atendimento
                            </span>
                          </div>
                          {visita.motivo && (
                            <div className="painel-dept-visita-motivo">
                              📋 {visita.motivo}
                            </div>
                          )}
                          {visita.observacao && (
                            <div className="painel-dept-visita-obs">
                              ℹ️ {visita.observacao}
                            </div>
                          )}
                          <div className="painel-dept-visita-horarios">
                            <span>🕐 Chegada: {new Date(visita.hora_chegada).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}</span>
                            <span>📢 Chamado: {new Date(visita.hora_chamada).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}</span>
                          </div>
                        </div>
                        <div className="painel-dept-actions">
                          <button
                            onClick={() => rechamarVisitante(visita.visita_id, visita.visitante_nome)}
                            disabled={carregando}
                            className="painel-dept-btn rechamar"
                            title="Devolver para fila"
                          >
                            🔄 Rechamar
                          </button>
                          <button
                            onClick={() => finalizarAtendimento(visita.visita_id, visita.visitante_nome)}
                            disabled={carregando}
                            className="painel-dept-btn finalizar"
                          >
                            ✅ Finalizar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ABA FINALIZADOS */}
            {abaAtiva === 'finalizados' && (
              <div>
                <h2 className="painel-dept-section-title">
                  <CheckCircle size={24} className="text-green-600" />
                  Atendimentos Finalizados Hoje
                </h2>

                {visitasFinalizadas.length === 0 ? (
                  <div className="painel-dept-empty">
                    <CheckCircle size={64} className="painel-dept-empty-icon" />
                    <p className="painel-dept-empty-text">Nenhum atendimento finalizado hoje</p>
                  </div>
                ) : (
                  <div className="painel-dept-visitas-list">
                    {visitasFinalizadas.map((visita) => (
                      <div key={visita.visita_id} className="painel-dept-visita-card finalizado">
                        <div className="painel-dept-visita-info">
                          <div className="painel-dept-visita-header">
                            <div className="painel-dept-visita-nome">{visita.visitante_nome}</div>
                            <span className="painel-dept-badge finalizado">
                              ✓ Finalizado
                            </span>
                          </div>
                          {visita.motivo && (
                            <div className="painel-dept-visita-motivo">
                              📋 {visita.motivo}
                            </div>
                          )}
                          <div className="painel-dept-detalhes">
                            <div className="painel-dept-detalhe-linha">
                              <span className="painel-dept-detalhe-label">🕐 Chegada:</span>
                              <span>{new Date(visita.hora_chegada).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}</span>
                            </div>
                            <div className="painel-dept-detalhe-linha">
                              <span className="painel-dept-detalhe-label">📢 Chamado:</span>
                              <span>{visita.hora_chamada ? new Date(visita.hora_chamada).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'}) : '-'}</span>
                            </div>
                            <div className="painel-dept-detalhe-linha">
                              <span className="painel-dept-detalhe-label">✅ Finalizado:</span>
                              <span>{visita.hora_saida ? new Date(visita.hora_saida).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'}) : '-'}</span>
                            </div>
                            <div className="painel-dept-detalhe-linha total">
                              <span className="painel-dept-detalhe-label">⏱ Tempo Total:</span>
                              <span className="painel-dept-tempo-total">{calcularTempoAtendimento(visita.hora_chegada, visita.hora_saida)}</span>
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

          {/* Footer */}
          <div className="painel-dept-footer">
            <div className="painel-dept-stats">
              <div className="painel-dept-stat-card aguardando">
                <div className="painel-dept-stat-number aguardando">{visitasAguardando.length}</div>
                <div className="painel-dept-stat-label aguardando">Aguardando</div>
              </div>
              <div className="painel-dept-stat-card chamados">
                <div className="painel-dept-stat-number chamados">{visitasChamados.length}</div>
                <div className="painel-dept-stat-label chamados">Em Atendimento</div>
              </div>
              <div className="painel-dept-stat-card finalizados">
                <div className="painel-dept-stat-number finalizados">{visitasFinalizadas.length}</div>
                <div className="painel-dept-stat-label finalizados">Finalizados Hoje</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}