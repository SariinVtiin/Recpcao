import React, { useState, useEffect } from 'react';
import { Clock, Volume2 } from 'lucide-react';

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
        
        // Só mostra se foi chamado nos últimos 2 minutos
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
            // Limpa se passou mais de 2 minutos
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex flex-col">
      <div className="bg-blue-800 bg-opacity-50 backdrop-blur-sm p-6 shadow-2xl">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">Sistema de Chamadas</h1>
            <p className="text-blue-200 mt-1">Aguarde sua chamada</p>
          </div>
          <div className="text-right">
            <div className="flex items-center text-white text-2xl font-mono mb-1">
              <Clock size={24} className="mr-2" />
              {hora.toLocaleTimeString('pt-BR')}
            </div>
            <div className="text-blue-200 text-sm capitalize">
              {hora.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        {chamadaAtual ? (
          <div className="w-full max-w-5xl">
            <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
              <div className={`h-3 ${chamadaAtual.departamento_nome === 'Departamento Operacional' ? 'bg-blue-600' : 'bg-green-600'}`}></div>
              
              <div className="p-12">
                <div className="flex items-start mb-8">
                  <Volume2 size={48} className="text-blue-600 mr-4 mt-2 animate-pulse" />
                  <div className="flex-1">
                    <div className="text-gray-600 text-2xl mb-2">Chamando agora:</div>
                    <div className="text-6xl font-bold text-gray-900 mb-4 break-words">
                      {chamadaAtual.visitante_nome}
                    </div>
                  </div>
                </div>

                <div className={`text-3xl font-semibold p-6 rounded-2xl ${
                  chamadaAtual.departamento_nome === 'Departamento Operacional'
                    ? 'bg-blue-100 text-blue-900'
                    : 'bg-green-100 text-green-900'
                }`}>
                  <div className="mb-2 text-xl opacity-75">Dirija-se ao:</div>
                  <div className="flex items-center">
                    <span className="text-5xl mr-3">→</span>
                    {chamadaAtual.departamento_nome}
                  </div>
                </div>

                {chamadaAtual.observacao && (
                  <div className="mt-6 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded">
                    <div className="text-yellow-800 text-xl">
                      <strong>Observação:</strong> {chamadaAtual.observacao}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <div className="inline-block animate-pulse">
              <Volume2 size={80} className="text-blue-400 mb-4" />
            </div>
            <h2 className="text-4xl font-bold text-white mb-4">Aguardando Chamadas</h2>
            <p className="text-blue-300 text-xl">Fique atento ao painel</p>
          </div>
        )}
      </div>
    </div>
  );
}