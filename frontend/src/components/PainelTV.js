import React, { useState, useEffect, useRef } from 'react';
import { Clock, Volume2 } from 'lucide-react';
import './PainelTV.css';

export default function PainelTV() {
  const [chamadaAtual, setChamadaAtual] = useState(null);
  const [hora, setHora] = useState(new Date());
  const [contadorChamadas, setContadorChamadas] = useState(0);
  const [statusChamada, setStatusChamada] = useState('');
  const visitaProcessadaRef = useRef(null);
  const chamadasFeitasRef = useRef(new Set());
  const processandoRef = useRef(false);

  useEffect(() => {
    const timer = setInterval(() => setHora(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Função para realizar as 3 chamadas
  const realizarChamadas = async (visita) => {
    if (processandoRef.current) {
      console.log('⚠️ Já está processando uma chamada');
      return;
    }

    processandoRef.current = true;
    console.log('🔊 Iniciando 3 chamadas para:', visita.visitante_nome);
    
    const texto = `${visita.visitante_nome}, dirija-se ao ${visita.departamento_nome}`;
    
    // Função auxiliar para falar
    const falar = (numero) => {
      return new Promise((resolve) => {
        console.log(`📢 Chamada ${numero}/3:`, texto);
        
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          const fala = new SpeechSynthesisUtterance(texto);
          fala.lang = 'pt-BR';
          fala.rate = 0.9;
          fala.volume = 1.0;
          
          fala.onstart = () => {
            console.log(`🎤 Falando chamada ${numero}/3`);
            setStatusChamada(`Chamando (${numero}/3)...`);
          };
          
          fala.onend = () => {
            console.log(`✅ Chamada ${numero}/3 concluída`);
            resolve();
          };
          
          fala.onerror = (error) => {
            console.error(`❌ Erro na chamada ${numero}/3:`, error);
            resolve();
          };
          
          window.speechSynthesis.speak(fala);
        } else {
          console.warn('⚠️ SpeechSynthesis não disponível');
          resolve();
        }
      });
    };

    try {
      // Primeira chamada
      setContadorChamadas(1);
      await falar(1);
      await new Promise(resolve => setTimeout(resolve, 3000)); // Pausa de 3 segundos

      // Segunda chamada
      setContadorChamadas(2);
      await falar(2);
      await new Promise(resolve => setTimeout(resolve, 3000)); // Pausa de 3 segundos

      // Terceira chamada
      setContadorChamadas(3);
      await falar(3);
      await new Promise(resolve => setTimeout(resolve, 2000)); // Pausa de 2 segundos

      // Marca como processada
      chamadasFeitasRef.current.add(visita.visita_id);
      console.log('✅ 3 chamadas concluídas!');
      setStatusChamada('');
      setContadorChamadas(0);
    } catch (error) {
      console.error('❌ Erro ao realizar chamadas:', error);
    } finally {
      processandoRef.current = false;
    }
  };

  useEffect(() => {
    const buscarChamada = async () => {
      try {
        const response = await fetch('http://192.167.2.41:3001/api/visitas/ultima');
        
        if (!response.ok) {
          console.error('❌ Erro na resposta:', response.status);
          return;
        }
        
        const data = await response.json();
        
        if (data && data.hora_chamada) {
          const horaChamada = new Date(data.hora_chamada);
          const agora = new Date();
          const diferencaMinutos = (agora - horaChamada) / 1000 / 60;
          
          console.log('📊 Chamada detectada:', {
            visita_id: data.visita_id,
            nome: data.visitante_nome,
            departamento: data.departamento_nome,
            hora_chamada: horaChamada.toLocaleString(),
            diferenca_minutos: diferencaMinutos.toFixed(2),
            ja_processada: chamadasFeitasRef.current.has(data.visita_id)
          });
          
          // Mostrar chamada por até 2 minutos
          if (diferencaMinutos <= 2) {
            // Nova chamada detectada
            if (data.visita_id !== visitaProcessadaRef.current && 
                !chamadasFeitasRef.current.has(data.visita_id)) {
              
              console.log('🆕 Nova chamada! Iniciando processo...');
              visitaProcessadaRef.current = data.visita_id;
              setChamadaAtual(data);
              
              // Realizar as 3 chamadas
              realizarChamadas(data);
            } else if (data.visita_id === visitaProcessadaRef.current) {
              // Manter visível se ainda está dentro do tempo
              setChamadaAtual(data);
            }
          } else {
            // Limpar após 2 minutos
            if (chamadaAtual?.visita_id === data.visita_id) {
              console.log('⏰ Tempo expirado, limpando chamada');
              setChamadaAtual(null);
              visitaProcessadaRef.current = null;
            }
          }
        } else {
          // Sem chamadas
          if (chamadaAtual) {
            console.log('🔇 Sem chamadas ativas');
            setChamadaAtual(null);
            visitaProcessadaRef.current = null;
          }
        }
      } catch (error) {
        console.error('❌ Erro ao buscar chamada:', error);
      }
    };

    console.log('🔄 Buscando chamadas...');
    buscarChamada();
    const interval = setInterval(buscarChamada, 2000);
    return () => clearInterval(interval);
  }, [chamadaAtual]);

  // Limpar chamadas antigas do Set a cada 5 minutos
  useEffect(() => {
    const limparHistorico = setInterval(() => {
      console.log('🧹 Limpando histórico de chamadas processadas');
      chamadasFeitasRef.current.clear();
    }, 300000); // 5 minutos

    return () => clearInterval(limparHistorico);
  }, []);

  // Determinar qual departamento
  const isDeptOperacional = chamadaAtual?.departamento_nome === 'Departamento Operacional';

  return (
    <div className="painel-tv-container">
      {/* Fundo com Imagem */}
      <div className="painel-tv-background"></div>
      
      {/* Overlay Azul/Cinza */}
      <div className="painel-tv-overlay"></div>

      {/* Conteúdo */}
      <div className="painel-tv-content">
        {/* Header com Relógio */}
        <div className="painel-tv-header">
          <div className="painel-tv-header-content">
            <div>
              <h1 className="painel-tv-title">Aguarde sua chamada</h1>
              {statusChamada && (
                <p style={{color: '#f59e0b', fontSize: '0.9rem', marginTop: '5px'}}>
                  {statusChamada}
                </p>
              )}
            </div>
            <div className="painel-tv-clock-wrapper">
              <div className="painel-tv-clock">
                <Clock size={24} className="painel-tv-clock-icon" />
                {hora.toLocaleTimeString('pt-BR')}
              </div>
              <div className="painel-tv-date">
                {hora.toLocaleDateString('pt-BR', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Conteúdo Principal */}
        <div className="painel-tv-main">
          {chamadaAtual ? (
            <div className="painel-tv-chamada-wrapper">
              <div className="painel-tv-chamada-card">
                {/* Indicador de Departamento */}
                <div className={`painel-tv-dept-indicator ${isDeptOperacional ? 'operacional' : 'pessoal'}`}></div>
                
                <div className="painel-tv-chamada-content">
                  {/* Header da Chamada */}
                  <div className="painel-tv-chamada-header">
                    <Volume2 size={48} className={`painel-tv-volume-icon ${contadorChamadas > 0 ? 'pulsando' : ''}`} />
                    <div className="painel-tv-chamada-info">
                      <div className="painel-tv-chamada-label">
                        Chamando agora
                        {contadorChamadas > 0 && (
                          <span className="painel-tv-contador-chamadas">
                            {' '}({contadorChamadas}ª de 3)
                          </span>
                        )}
                      </div>
                      <div className="painel-tv-visitante-nome">
                        {chamadaAtual.visitante_nome}
                      </div>
                    </div>
                  </div>

                  {/* Box do Departamento */}
                  <div className={`painel-tv-dept-box ${isDeptOperacional ? 'operacional' : 'pessoal'}`}>
                    <div className="painel-tv-dept-label">Dirija-se ao:</div>
                    <div className="painel-tv-dept-name-wrapper">
                      <span className="painel-tv-dept-arrow">→</span>
                      <span className="painel-tv-dept-name">
                        {chamadaAtual.departamento_nome}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="painel-tv-waiting">
              <div className="painel-tv-waiting-icon-wrapper">
                <Volume2 size={80} className="painel-tv-waiting-icon" />
              </div>
              <h2 className="painel-tv-waiting-title">Aguardando Chamadas</h2>
              <p className="painel-tv-waiting-subtitle">Fique atento ao painel</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}