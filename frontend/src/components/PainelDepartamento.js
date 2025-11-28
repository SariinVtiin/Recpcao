import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Building2, LogOut, Clock, UserCheck, CheckCircle } from 'lucide-react';
import './PainelDepartamento.css';

export default function PainelDepartamento({ usuario, onLogout }) {
  const [visitasAguardando, setVisitasAguardando] = useState([]);
  const [visitasChamados, setVisitasChamados] = useState([]);
  const [visitasFinalizadas, setVisitasFinalizadas] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState('aguardando');
  const [debugNotificacao, setDebugNotificacao] = useState('');
  const [temporizadores, setTemporizadores] = useState({});
  
  // Usar useRef para manter o valor entre renders
  const ultimaQuantidadeRef = useRef(0);
  const primeiraCarregaRef = useRef(true);

  // Constante de tempo mínimo de atendimento (1min = 60 segundos)
  const TEMPO_MINIMO_ATENDIMENTO = 60 * 1000; // 60 segundos em milissegundos

  // Solicitar permissão de notificações
  useEffect(() => {
    const solicitarPermissao = async () => {
      console.log('🔔 Solicitando permissão de notificações...');
      
      if (!('Notification' in window)) {
        console.error('❌ Navegador não suporta notificações');
        setDebugNotificacao('Não suportado');
        return;
      }

      try {
        const permission = await Notification.requestPermission();
        console.log('✅ Permissão:', permission);
        setDebugNotificacao(`Permissão: ${permission}`);

        if (permission === 'granted') {
          // Notificação de teste
          new Notification('✅ Notificações Ativadas!', {
            body: 'Você receberá alertas de novos visitantes',
            icon: '/confederal2.png',
            tag: 'teste'
          });
        } else if (permission === 'denied') {
          alert('⚠️ Notificações bloqueadas!\n\nPara habilitar:\n' +
                '1. Clique no ícone 🔒 na barra de endereços\n' +
                '2. Vá em "Configurações do site"\n' +
                '3. Altere "Notificações" para "Permitir"\n' +
                '4. Recarregue a página');
        }
      } catch (error) {
        console.error('❌ Erro ao solicitar permissão:', error);
        setDebugNotificacao(`Erro: ${error.message}`);
      }
    };

    solicitarPermissao();
  }, []);

  // Atualizar temporizadores a cada segundo
  useEffect(() => {
    const interval = setInterval(() => {
      setTemporizadores(prev => {
        const novo = { ...prev };
        Object.keys(novo).forEach(key => {
          novo[key] = Date.now();
        });
        return novo;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Função para calcular tempo restante até poder finalizar
  const calcularTempoRestante = (horaChamada) => {
    const tempoDecorrido = Date.now() - new Date(horaChamada).getTime();
    const tempoRestante = TEMPO_MINIMO_ATENDIMENTO - tempoDecorrido;
    
    if (tempoRestante <= 0) return 0;
    
    return Math.ceil(tempoRestante / 1000); // Retorna em segundos
  };

  // Função para verificar se pode finalizar
  const podeFinalizarAtendimento = (horaChamada) => {
    return calcularTempoRestante(horaChamada) <= 0;
  };

  // Função para formatar tempo restante
  const formatarTempoRestante = (segundos) => {
    if (segundos <= 0) return '0s';
    const mins = Math.floor(segundos / 60);
    const secs = segundos % 60;
    if (mins > 0) {
      return `${mins}min ${secs}s`;
    }
    return `${secs}s`;
  };

  // Função para mostrar notificação
  const mostrarNotificacao = useCallback((quantidade) => {
    console.log('🔔 Tentando mostrar notificação...');
    console.log('   Quantidade:', quantidade);
    console.log('   Permissão:', Notification?.permission);
    
    if (!('Notification' in window)) {
      console.error('❌ Notification API não disponível');
      return;
    }
    
    if (Notification.permission !== 'granted') {
      console.warn('⚠️ Permissão negada:', Notification.permission);
      return;
    }

    try {
      const titulo = quantidade === 1 
        ? '🔔 Nova pessoa aguardando!' 
        : `🔔 ${quantidade} pessoas aguardando!`;
      
      const mensagem = quantidade === 1
        ? 'Um visitante está esperando atendimento'
        : `${quantidade} visitantes estão esperando atendimento`;

      console.log('✅ Criando notificação:', titulo);

      // Tocar som (opcional)
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuFzvLYiTcIGWi77eefTRAMUKfj8LZjHAY4ktfzzHosBSh+zPLaizsKGGS56+mjUxELTKXh8bllHgU2jdXzzHkrBSh+zPLaizsKF2W56+mjUxELTKXh8bllHgU2jdXzzHkrBSh+zPLaizsKF2W56+mjUxELTKXh8bllHgU2jdXzzHkrBSh+zPLaizsKF2W56+mjUxELTKXh8bllHgU2jdXzzHkrBSh+zPLaizsKF2W56+mjUxELTKXh8bllHgU2jdXzzHkrBSh+zPLaizsKF2W56+mjUxELTKXh8bllHgU2jdXzzHkrBSh+zPLaizsKF2W56+mjUxELTKXh8bllHgU2jdXzzHkrBSh+zPLaizsKF2W56+mjUxELTKXh8bllHgU2jdXzzHkrBSh+zPLaizsKF2W56+mjUxELTKXh8bllHgU2jdXzzHkrBSh+zPLaizsKF2W56+mjUxELTKXh8bllHgU2jdXzzHkrBSh+zPLaizsKF2W56+mjUxELTKXh8bllHgU2jdXzzHkrBSh+zPLaizsKF2W56+mjUxELTKXh8bllHgU2jdXzzHkrBSh+zPLaizsKF2W56+mjUxELTKXh8bllHgU2jdXzzHkrBQ==');
      audio.play().catch(e => console.log('Som não pode ser tocado:', e));

      const notificacao = new Notification(titulo, {
        body: mensagem,
        icon: '/confederal2.png',
        badge: '/confederal2.png',
        tag: 'fila-atendimento',
        requireInteraction: false,
        silent: false,
        vibrate: [200, 100, 200]
      });

      console.log('✅ Notificação criada!');

      notificacao.onclick = () => {
        console.log('👆 Notificação clicada');
        window.focus();
        setAbaAtiva('aguardando');
        notificacao.close();
      };

      // Auto-fechar após 8 segundos
      setTimeout(() => notificacao.close(), 8000);

    } catch (error) {
      console.error('❌ Erro ao criar notificação:', error);
      setDebugNotificacao(`Erro: ${error.message}`);
    }
  }, []);

  const buscarAguardando = useCallback(async () => {
    try {
      const response = await fetch(
        `https://192.167.2.41:3001/api/visitas/aguardando/${usuario.departamento_id}`
      );
      const data = await response.json();

      // ✅ Filtrar apenas visitas do dia atual
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      
      const visitasHoje = data.filter(v => {
        if (!v.hora_chegada) return false;
        const dataVisita = new Date(v.hora_chegada);
        dataVisita.setHours(0, 0, 0, 0);
        return dataVisita.getTime() === hoje.getTime();
      });

      // ⏱️ TIMER: Filtrar visitas que já passaram do tempo de deslocamento (1 minuto)
      const TEMPO_DESLOCAMENTO_MS = 1 * 60 * 1000; // 1 minuto em milissegundos
      const agora = new Date().getTime();
      
      const visitasComDelay = visitasHoje.filter(v => {
        const horaRegistro = new Date(v.hora_chegada).getTime();
        const tempoDecorrido = agora - horaRegistro;
        return tempoDecorrido >= TEMPO_DESLOCAMENTO_MS;
      });

      const visitasOrdenadas = visitasComDelay.sort(
        (a, b) => new Date(b.hora_chegada) - new Date(a.hora_chegada)
      );

      const quantidadeAtual = visitasOrdenadas.length;
      const quantidadeAnterior = ultimaQuantidadeRef.current;

      console.log(`📊 Fila: Anterior=${quantidadeAnterior}, Atual=${quantidadeAtual}, Primeira=${primeiraCarregaRef.current}`);

      // Notificar apenas se:
      // 1. NÃO é a primeira carga
      // 2. A quantidade atual é MAIOR que a anterior
      // 3. Há pelo menos 1 visitante
      if (!primeiraCarregaRef.current && quantidadeAtual > quantidadeAnterior && quantidadeAtual > 0) {
        console.log('🚨 NOVA PESSOA NA FILA! Disparando notificação...');
        mostrarNotificacao(quantidadeAtual);
      } else if (primeiraCarregaRef.current) {
        console.log('ℹ️ Primeira carga - não notifica');
        primeiraCarregaRef.current = false;
      }

      // Atualizar a referência
      ultimaQuantidadeRef.current = quantidadeAtual;
      setVisitasAguardando(visitasOrdenadas);

    } catch (error) {
      console.error('❌ Erro ao buscar aguardando:', error);
    }
  }, [usuario.departamento_id, mostrarNotificacao]);

  const buscarChamados = useCallback(async () => {
    try {
      const response = await fetch(
        `https://192.167.2.41:3001/api/visitas/chamados/${usuario.departamento_id}`
      );
      const data = await response.json();

      // ✅ Filtrar apenas visitas do dia atual
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      
      const visitasHoje = data.filter(v => {
        if (!v.hora_chamada) return false;
        const dataVisita = new Date(v.hora_chamada);
        dataVisita.setHours(0, 0, 0, 0);
        return dataVisita.getTime() === hoje.getTime();
      });

      const visitasOrdenadas = visitasHoje.sort(
        (a, b) => new Date(b.hora_chamada) - new Date(a.hora_chamada)
      );

      setVisitasChamados(visitasOrdenadas);
      
      // Inicializar temporizadores para visitas chamadas
      const novosTemp = {};
      visitasOrdenadas.forEach(v => {
        novosTemp[v.visita_id] = Date.now();
      });
      setTemporizadores(novosTemp);

    } catch (error) {
      console.error('❌ Erro ao buscar chamados:', error);
    }
  }, [usuario.departamento_id]);

  const buscarFinalizados = useCallback(async () => {
    try {
      const response = await fetch(
        `https://192.167.2.41:3001/api/visitas?departamento_id=${usuario.departamento_id}&status=finalizado`
      );
      const data = await response.json();
      
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
      
      setVisitasFinalizadas(visitasHoje);
    } catch (error) {
      console.error('❌ Erro ao buscar finalizados:', error);
      setVisitasFinalizadas([]);
    }
  }, [usuario.departamento_id]);

  useEffect(() => {
    if (usuario.departamento_id) {
      buscarAguardando();
      buscarChamados();
      buscarFinalizados();
      
      // Atualizar a cada 5 segundos
      const interval = setInterval(() => {
        buscarAguardando();
        buscarChamados();
        buscarFinalizados();
      }, 5000);
      
      return () => clearInterval(interval);
    }
  }, [usuario.departamento_id, buscarAguardando, buscarChamados, buscarFinalizados]);

  const chamarVisitante = async (visitaId, nomeVisitante) => {
    if (!window.confirm(`Deseja chamar ${nomeVisitante}?`)) return;

    setCarregando(true);
    try {
      const response = await fetch(
        `https://192.167.2.41:3001/api/visitas/${visitaId}/chamar`,
        { 
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ usuario_id: usuario.id })
        }
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

  const finalizarAtendimento = async (visitaId, nomeVisitante, horaChamada) => {
    // Verificar se passou o tempo mínimo
    if (!podeFinalizarAtendimento(horaChamada)) {
      const tempoRestante = calcularTempoRestante(horaChamada);
      const mins = Math.floor(tempoRestante / 60);
      const secs = tempoRestante % 60;
      
      let mensagemTempo = '';
      if (mins > 0) {
        mensagemTempo = `${mins} minuto${mins > 1 ? 's' : ''} e ${secs} segundo${secs > 1 ? 's' : ''}`;
      } else {
        mensagemTempo = `${secs} segundo${secs > 1 ? 's' : ''}`;
      }
      
      alert(
        '⏱️ TEMPO MÍNIMO DE ATENDIMENTO NÃO ATINGIDO\n\n' +
        `Por favor, aguarde mais ${mensagemTempo} para finalizar este atendimento.`
      );
      return;
    }

    if (!window.confirm(`Finalizar atendimento de ${nomeVisitante}?`)) return;

    setCarregando(true);
    try {
      const response = await fetch(
        `https://192.167.2.41:3001/api/visitas/${visitaId}/finalizado`,
        { method: 'PUT' }
      );

      if (response.ok) {
        // Remover do temporizador
        setTemporizadores(prev => {
          const novo = { ...prev };
          delete novo[visitaId];
          return novo;
        });
        
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

  const calcularTempoEspera = (horaChegada) => {
    const diffMins = Math.floor((new Date() - new Date(horaChegada)) / 60000);
    if (diffMins < 1) return '< 1min';
    if (diffMins === 1) return '1min';
    if (diffMins < 60) return `${diffMins}min`;
    const horas = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    if (mins === 0) return `${horas}h`;
    return `${horas}h ${mins}min`;
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

  const calcularTempoEmAtendimento = (horaChamada) => {
    const diffMins = Math.floor((new Date() - new Date(horaChamada)) / 60000);
    if (diffMins < 1) return '< 1min';
    if (diffMins === 1) return '1min';
    return `${diffMins}min`;
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
                <h1 className="painel-dept-title">{usuario.departamento_nome || 'Painel Departamento'}</h1>
                <p className="painel-dept-subtitle">
                  {usuario.nome}
                  {debugNotificacao && (
                    <span style={{fontSize: '11px', marginLeft: '10px', opacity: 0.7}}>
                      🔔 {debugNotificacao}
                    </span>
                  )}
                </p>
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
              className={`painel-dept-tab ${abaAtiva === 'aguardando' ? 'active' : ''}`}
            >
              <Clock size={20} />
              Aguardando
              {visitasAguardando.length > 0 && (
                <span className="painel-dept-badge-count">{visitasAguardando.length}</span>
              )}
            </button>
            <button
              onClick={() => setAbaAtiva('chamados')}
              className={`painel-dept-tab ${abaAtiva === 'chamados' ? 'active' : ''}`}
            >
              <UserCheck size={20} />
              Em Atendimento
              {visitasChamados.length > 0 && (
                <span className="painel-dept-badge-count">{visitasChamados.length}</span>
              )}
            </button>
            <button
              onClick={() => setAbaAtiva('finalizados')}
              className={`painel-dept-tab ${abaAtiva === 'finalizados' ? 'active' : ''}`}
            >
              <CheckCircle size={20} />
              Finalizados
              {visitasFinalizadas.length > 0 && (
                <span className="painel-dept-badge-count">{visitasFinalizadas.length}</span>
              )}
            </button>
          </div>

          {/* Conteúdo das Abas */}
          <div className="painel-dept-content-area">
            {/* ABA AGUARDANDO */}
            {abaAtiva === 'aguardando' && (
              <div>
                <h2 className="painel-dept-section-title">
                  <Clock size={24} className="text-orange-600" />
                  Fila de Espera
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
                          {visita.visitante_matricula && (
                            <div className="painel-dept-visita-obs">
                              <span>🎫</span>
                              <span>Matrícula: {visita.visitante_matricula}</span>
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
                    {visitasChamados.map((visita) => {
                      return (
                        <div key={visita.visita_id} className="painel-dept-visita-card chamado">
                          <div className="painel-dept-visita-info">
                            <div className="painel-dept-visita-header">
                              <div className="painel-dept-visita-nome">{visita.visitante_nome}</div>
                              <span className="painel-dept-badge chamado">
                                🔵 {calcularTempoEmAtendimento(visita.hora_chamada)}
                              </span>
                            </div>
                            {visita.motivo && (
                              <div className="painel-dept-visita-motivo">
                                📋 {visita.motivo}
                              </div>
                            )}
                            {visita.visitante_matricula && (
                              <div className="painel-dept-visita-obs">
                                🎫 Matrícula: {visita.visitante_matricula}
                              </div>
                            )}
                            <div className="painel-dept-visita-horarios">
                              <span>🕐 Chegada: {new Date(visita.hora_chegada).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}</span>
                              <span>📢 Chamado: {new Date(visita.hora_chamada).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}</span>
                            </div>
                          </div>
                          <div className="painel-dept-actions">
                            <button
                              onClick={() => finalizarAtendimento(visita.visita_id, visita.visitante_nome, visita.hora_chamada)}
                              disabled={carregando}
                              className="painel-dept-btn finalizar"
                            >
                              ✅ Finalizar Atendimento
                            </button>
                          </div>
                        </div>
                      );
                    })}
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
                          {visita.visitante_matricula && (
                            <div className="painel-dept-visita-obs">
                              🎫 Matrícula: {visita.visitante_matricula}
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