import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Building2, LogOut, Clock, UserCheck, CheckCircle, DoorOpen, X } from 'lucide-react';
import Hls from 'hls.js';
import './PainelDepartamento.css';
import confederal from '../assets/confederal.png';

// URL do stream HLS da câmera (servida pelo backend)
const CAMERA_STREAM_URL = 'http://192.167.0.9:3001/camera/live.m3u8';

// ============================================
// COMPONENTE: Modal da Câmera
// ============================================
function CameraModal({ aberto, onFechar }) {
  const videoRef = useRef(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (!aberto) return;

    const video = videoRef.current;
    if (!video) return;

    setErro('');
    let hls = null;
    let recoverTimer = null;

    const inicializarHls = () => {
      if (Hls.isSupported()) {
        hls = new Hls({
          liveSyncDurationCount: 2,
          liveMaxLatencyDurationCount: 4,
          liveDurationInfinity: true,    // trata como stream infinito ao vivo
          liveBackBufferLength: 0,       // descarta tudo que já foi exibido
          maxBufferLength: 6,            // limita o buffer (mantém perto do live)
          manifestLoadingMaxRetry: 6,
          manifestLoadingRetryDelay: 1000,
        });

        hls.loadSource(`${CAMERA_STREAM_URL}?t=${Date.now()}`);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          video.play().catch(e => console.log('Autoplay bloqueado:', e));
        });

        hls.on(Hls.Events.ERROR, (event, data) => {
          if (data.fatal) {
            console.warn('⚠️ Erro fatal no HLS, tentando recuperar...', data.type);
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                // tenta recarregar o manifesto
                setTimeout(() => hls?.startLoad(), 1000);
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                hls?.recoverMediaError();
                break;
              default:
                // último recurso: destrói e reinicia
                if (hls) hls.destroy();
                recoverTimer = setTimeout(inicializarHls, 2000);
            }
          }
        });

        // Se o vídeo travar (não avança), força volta ao live
        video.addEventListener('stalled', () => {
          console.log('🔄 Stream travou, voltando ao live...');
          if (hls) {
            hls.currentLevel = -1;
            hls.startLoad(-1);
          }
        });

      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = `${CAMERA_STREAM_URL}?t=${Date.now()}`;
        video.addEventListener('loadedmetadata', () => {
          video.play().catch(e => console.log('Autoplay bloqueado:', e));
        });
      } else {
        setErro('Seu navegador não suporta reprodução de HLS.');
      }
    };

    inicializarHls();

    return () => {
      if (recoverTimer) clearTimeout(recoverTimer);
      if (hls) hls.destroy();
      if (video) {
        video.pause();
        video.removeAttribute('src');
        video.load();
      }
    };
  }, [aberto]);

  if (!aberto) return null;

  return (
    <div className="painel-dept-modal-overlay" onClick={onFechar}>
      <div className="painel-dept-modal-content" onClick={e => e.stopPropagation()}>
        <div className="painel-dept-modal-header">
          <h2>📹 Câmera da Sala</h2>
          <button onClick={onFechar} className="painel-dept-modal-close" aria-label="Fechar">
            <X size={24} />
          </button>
        </div>
        <div className="painel-dept-modal-body">
          {erro ? (
            <div className="painel-dept-camera-erro">
              <p>⚠️ {erro}</p>
            </div>
          ) : (
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              disablePictureInPicture
              controlsList="nodownload nofullscreen noremoteplayback"
              className="painel-dept-camera-video"
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================
export default function PainelDepartamento({ usuario, onLogout }) {
  const [visitasAguardando, setVisitasAguardando] = useState([]);
  const [visitasChamados, setVisitasChamados] = useState([]);
  const [visitasFinalizadas, setVisitasFinalizadas] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState('aguardando');
  const [debugNotificacao, setDebugNotificacao] = useState('');
  const [temporizadores, setTemporizadores] = useState({});
  const [modalCameraAberto, setModalCameraAberto] = useState(false);
  
  const ultimaQuantidadeRef = useRef(0);
  const primeiraCarregaRef = useRef(true);

  const TEMPO_MINIMO_ATENDIMENTO = 30 * 1000;

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

  const calcularTempoRestante = (horaChamada) => {
    const tempoDecorrido = Date.now() - new Date(horaChamada).getTime();
    const tempoRestante = TEMPO_MINIMO_ATENDIMENTO - tempoDecorrido;
    if (tempoRestante <= 0) return 0;
    return Math.ceil(tempoRestante / 1000);
  };

  const podeFinalizarAtendimento = (horaChamada) => {
    return calcularTempoRestante(horaChamada) <= 0;
  };

  const formatarTempoRestante = (segundos) => {
    if (segundos <= 0) return '0s';
    const mins = Math.floor(segundos / 60);
    const secs = segundos % 60;
    if (mins > 0) return `${mins}min ${secs}s`;
    return `${secs}s`;
  };

  const mostrarNotificacao = useCallback((quantidade) => {
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    try {
      const titulo = quantidade === 1 
        ? '🔔 Nova pessoa aguardando!' 
        : `🔔 ${quantidade} pessoas aguardando!`;
      
      const mensagem = quantidade === 1
        ? 'Um visitante está esperando atendimento'
        : `${quantidade} visitantes estão esperando atendimento`;

      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuFzvLYiTcIGWi77eefTRAMUKfj8LZjHAY4ktfzzHosBSh+zPLaizsKGGS56+mjUxELTKXh8bllHgU2jdXzzHkrBSh+zPLaizsKF2W56+mjUxELTKXh8bllHgU2jdXzzHkrBSh+zPLaizsKF2W56+mjUxELTKXh8bllHgU2jdXzzHkrBQ==');
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

      notificacao.onclick = () => {
        window.focus();
        setAbaAtiva('aguardando');
        notificacao.close();
      };

      setTimeout(() => notificacao.close(), 8000);

    } catch (error) {
      console.error('❌ Erro ao criar notificação:', error);
      setDebugNotificacao(`Erro: ${error.message}`);
    }
  }, []);

  const buscarAguardando = useCallback(async () => {
    try {
      const response = await fetch(
        `http://192.167.0.9:3001/api/visitas/aguardando/${usuario.departamento_id}`
      );
      const data = await response.json();

      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      
      const visitasHoje = data.filter(v => {
        if (!v.hora_chegada) return false;
        const dataVisita = new Date(v.hora_chegada);
        dataVisita.setHours(0, 0, 0, 0);
        return dataVisita.getTime() === hoje.getTime();
      });

      const TEMPO_DESLOCAMENTO_MS = 1 * 60 * 1000;
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

      if (!primeiraCarregaRef.current && quantidadeAtual > quantidadeAnterior && quantidadeAtual > 0) {
        mostrarNotificacao(quantidadeAtual);
      } else if (primeiraCarregaRef.current) {
        primeiraCarregaRef.current = false;
      }

      ultimaQuantidadeRef.current = quantidadeAtual;
      setVisitasAguardando(visitasOrdenadas);

    } catch (error) {
      console.error('❌ Erro ao buscar aguardando:', error);
    }
  }, [usuario.departamento_id, mostrarNotificacao]);

  const buscarChamados = useCallback(async () => {
    try {
      const response = await fetch(
        `http://192.167.0.9:3001/api/visitas/chamados/${usuario.departamento_id}`
      );
      const data = await response.json();

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
        `http://192.167.0.9:3001/api/visitas?departamento_id=${usuario.departamento_id}&status=finalizado`
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
        `http://192.167.0.9:3001/api/visitas/${visitaId}/chamar`,
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
        `http://192.167.0.9:3001/api/visitas/${visitaId}/finalizado`,
        { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ usuario_id: usuario.id }) }
      );

      if (response.ok) {
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

  // Abre o modal da câmera
  const handleSala = () => {
    setModalCameraAberto(true);
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
      <div className="painel-dept-background"
        style={{ backgroundImage: `url(${confederal})` }}
      ></div>
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
            <div className="painel-dept-header-actions">
              <button onClick={handleSala} className="painel-dept-btn-sala">
                <DoorOpen size={18} className="mr-2" />
                Sala
              </button>
              <button onClick={onLogout} className="painel-dept-btn-logout">
                <LogOut size={18} className="mr-2" />
                Sair
              </button>
            </div>
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
        <div className="painel-admin-footer">
          <p>Sistema de Recepção - Máxima Facility | Confederal</p>
          <p>© 2026 • Desenvolvido por Jonathan Almeida Vieira • TI</p>
        </div>
      </div>

      {/* Modal da Câmera */}
      <CameraModal
        aberto={modalCameraAberto}
        onFechar={() => setModalCameraAberto(false)}
      />
    </div>
  );
}