import React, { useState, useEffect, useRef } from 'react';
import { Clock, Volume2 } from 'lucide-react';
import './PainelTV.css';

export default function PainelTV() {
  const [chamadaAtual, setChamadaAtual] = useState(null);
  const [hora, setHora] = useState(new Date());
  const [contadorChamadas, setContadorChamadas] = useState(0);
  const [statusChamada, setStatusChamada] = useState('');
  
  const filaChamadasRef = useRef([]);
  const chamadasProcessadasRef = useRef(new Set());
  const chamadasNaFilaRef = useRef(new Set()); // NOVO: Controla quais estão na fila
  const processandoRef = useRef(false);

  useEffect(() => {
    const timer = setInterval(() => setHora(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Função para realizar as 2 chamadas
  const realizarChamadas = async (visita) => {
    console.log('🔊 Iniciando 2 chamadas para:', visita.visitante_nome);
    
    // Determinar o destino na fala
    const destinoFala = visita.departamento_nome === 'Departamento Operacional' 
      ? 'Recepção Operacional' 
      : 'Recepção';
    
    const texto = `${visita.visitante_nome}, dirija-se à ${destinoFala}`;
    
    // Função auxiliar para falar
    const falar = (numero) => {
      return new Promise((resolve) => {
        console.log(`📢 Chamada ${numero}/2:`, texto);
        
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          const fala = new SpeechSynthesisUtterance(texto);
          fala.lang = 'pt-BR';
          fala.rate = 0.9;
          fala.volume = 1.0;
          
          fala.onend = () => {
            console.log(`✅ Chamada ${numero}/2 concluída`);
            resolve();
          };
          
          fala.onerror = (error) => {
            console.error(`❌ Erro na chamada ${numero}/2:`, error);
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
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Segunda chamada
      setContadorChamadas(2);
      await falar(2);
      await new Promise(resolve => setTimeout(resolve, 2000));

      console.log('✅ 2 chamadas concluídas para:', visita.visitante_nome);
      setStatusChamada('');
      setContadorChamadas(0);
      
      // Marca como processada
      chamadasProcessadasRef.current.add(visita.visita_id);
      chamadasNaFilaRef.current.delete(visita.visita_id); // Remove da fila
    } catch (error) {
      console.error('❌ Erro ao realizar chamadas:', error);
    }
  };

  // Processar fila de chamadas
  const processarFila = async () => {
    if (processandoRef.current || filaChamadasRef.current.length === 0) {
      return;
    }

    processandoRef.current = true;
    console.log(`📋 Processando fila com ${filaChamadasRef.current.length} chamada(s)`);

    while (filaChamadasRef.current.length > 0) {
      const proximaChamada = filaChamadasRef.current.shift();
      
      console.log('▶️ Processando:', proximaChamada.visitante_nome);
      setChamadaAtual(proximaChamada);
      
      await realizarChamadas(proximaChamada);
      
      // Pausa de 1 segundo entre chamadas diferentes
      if (filaChamadasRef.current.length > 0) {
        console.log('⏸️ Pausa de 1s antes da próxima pessoa');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log('✅ Fila processada completamente');
    setChamadaAtual(null);
    processandoRef.current = false;
  };

  // Buscar chamadas recentes
  useEffect(() => {
    const buscarChamadas = async () => {
      try {
        const response = await fetch('https://192.167.0.116:3001/api/visitas/chamadas-recentes');
        
        if (!response.ok) {
          console.error('❌ Erro na resposta:', response.status);
          return;
        }
        
        const chamadas = await response.json();
        
        if (Array.isArray(chamadas) && chamadas.length > 0) {
          console.log(`📞 ${chamadas.length} chamada(s) detectada(s)`);
          
          // Filtrar chamadas que NÃO foram processadas E NÃO estão na fila
          const novasChamadas = chamadas.filter(chamada => 
            !chamadasProcessadasRef.current.has(chamada.visita_id) &&
            !chamadasNaFilaRef.current.has(chamada.visita_id) // NOVO: Evita duplicatas na fila
          );

          if (novasChamadas.length > 0) {
            console.log(`🆕 ${novasChamadas.length} nova(s) chamada(s) adicionada(s) à fila`);
            
            novasChamadas.forEach(chamada => {
              console.log('  ➕', chamada.visitante_nome, '-', chamada.departamento_nome);
              
              // Adiciona à fila
              filaChamadasRef.current.push(chamada);
              
              // Marca como estando na fila
              chamadasNaFilaRef.current.add(chamada.visita_id);
            });

            // Iniciar processamento da fila se não estiver processando
            if (!processandoRef.current) {
              processarFila();
            }
          }
        } else {
          // Sem chamadas ativas
          if (!processandoRef.current && chamadaAtual) {
            console.log('🔇 Sem chamadas ativas');
            setChamadaAtual(null);
          }
        }
      } catch (error) {
        console.error('❌ Erro ao buscar chamadas:', error);
      }
    };

    console.log('🔄 Buscando chamadas...');
    buscarChamadas();
    const interval = setInterval(buscarChamadas, 2000);
    return () => clearInterval(interval);
  }, []); // MUDANÇA: Removido chamadaAtual da dependência

  // Limpar histórico de chamadas processadas a cada 5 minutos
  useEffect(() => {
    const limparHistorico = setInterval(() => {
      console.log('🧹 Limpando histórico de chamadas processadas');
      chamadasProcessadasRef.current.clear();
      chamadasNaFilaRef.current.clear(); // Limpa também o controle da fila
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
                      <div className="painel-tv-visitante-nome">
                        {chamadaAtual.visitante_nome}
                      </div>
                    </div>
                  </div>

                  {/* Box do Departamento */}
                  <div className={`painel-tv-dept-box ${isDeptOperacional ? 'operacional' : 'pessoal'}`}>
                    <div className="painel-tv-dept-label">Dirija-se a:</div>
                    <div className="painel-tv-dept-name-wrapper">
                      <span className="painel-tv-dept-arrow">→</span>
                      <span className="painel-tv-dept-name">
                        {isDeptOperacional ? 'RECEPÇÃO OPERACIONAL' : 'RECEPÇÃO'}
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