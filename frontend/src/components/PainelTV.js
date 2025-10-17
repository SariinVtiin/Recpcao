import React, { useState, useEffect } from 'react';
import { Clock, Volume2 } from 'lucide-react';
import './PainelTV.css';

export default function PainelTV() {
  const [chamadaAtual, setChamadaAtual] = useState(null);
  const [hora, setHora] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setHora(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const buscarChamada = async () => {
      try {
        const response = await fetch('http://192.167.2.41:3001/api/visitas/ultima');
        const data = await response.json();
        
        if (data && data.hora_chamada) {
          const horaChamada = new Date(data.hora_chamada);
          const agora = new Date();
          const diferencaMinutos = (agora - horaChamada) / 1000 / 60;
          
          if (diferencaMinutos <= 2) {
            if (data.visita_id !== chamadaAtual?.visita_id) {
              setChamadaAtual(data);
              if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel();
                const texto = `${data.visitante_nome}, dirija-se ao ${data.departamento_nome}`;
                const fala = new SpeechSynthesisUtterance(texto);
                fala.lang = 'pt-BR';
                fala.rate = 0.9;
                window.speechSynthesis.speak(fala);
              }
            }
          } else {
            setChamadaAtual(null);
          }
        } else {
          setChamadaAtual(null);
        }
      } catch (error) {
        console.error('Erro:', error);
      }
    };

    buscarChamada();
    const interval = setInterval(buscarChamada, 2000);
    return () => clearInterval(interval);
  }, [chamadaAtual]);

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
                    <Volume2 size={48} className="painel-tv-volume-icon" />
                    <div className="painel-tv-chamada-info">
                      <div className="painel-tv-chamada-label">Chamando agora:</div>
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