// tela de espera
import React, { useState, useEffect, useRef } from 'react';
import { Volume2, Clock } from 'lucide-react';

export default function DisplayEspera() {
  const [chamadaAtual, setChamadaAtual] = useState(null);
  const [hora, setHora] = useState(new Date());
  const [animacao, setAnimacao] = useState(false);
  const ultimaChamadaRef = useRef(null);

  // Atualizar relógio
  useEffect(() => {
    const timer = setInterval(() => {
      setHora(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Buscar última chamada a cada 2 segundos
  useEffect(() => {
    const buscarChamada = async () => {
      try {
        const response = await fetch('http://192.167.2.41:3001/api/chamadas/ultima');
        const data = await response.json();
        
        if (data && data.id !== ultimaChamadaRef.current) {
          setChamadaAtual(data);
          ultimaChamadaRef.current = data.id;
          setAnimacao(true);
          
          // Reproduzir áudio
          reproduzirChamada(data);
          
          setTimeout(() => setAnimacao(false), 1000);
        }
      } catch (error) {
        console.error('Erro ao buscar chamada:', error);
      }
    };

    buscarChamada();
    const interval = setInterval(buscarChamada, 2000);
    
    return () => clearInterval(interval);
  }, []);

  const reproduzirChamada = (chamada) => {
    if ('speechSynthesis' in window) {
      // Cancelar qualquer fala anterior
      window.speechSynthesis.cancel();
      
      const texto = `${chamada.nome}, dirija-se ao ${chamada.setor}`;
      const fala = new SpeechSynthesisUtterance(texto);
      fala.lang = 'pt-BR';
      fala.rate = 0.9;
      fala.pitch = 1;
      fala.volume = 1;
      
      window.speechSynthesis.speak(fala);
    }
  };

  const formatarHora = () => {
    return hora.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatarData = () => {
    return hora.toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex flex-col">
      {/* Header */}
      <div className="bg-blue-800 bg-opacity-50 backdrop-blur-sm p-6 shadow-2xl">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">Sistema de Chamadas</h1>
            <p className="text-blue-200 mt-1">Aguarde sua chamada</p>
          </div>
          <div className="text-right">
            <div className="flex items-center text-white text-2xl font-mono mb-1">
              <Clock size={24} className="mr-2" />
              {formatarHora()}
            </div>
            <div className="text-blue-200 text-sm capitalize">
              {formatarData()}
            </div>
          </div>
        </div>
      </div>

      {/* Área Principal */}
      <div className="flex-1 flex items-center justify-center p-8">
        {chamadaAtual ? (
          <div className={`w-full max-w-5xl transition-all duration-500 ${
            animacao ? 'scale-105' : 'scale-100'
          }`}>
            {/* Card de Chamada */}
            <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
              {/* Indicador Visual */}
              <div className={`h-3 ${
                chamadaAtual.setor === 'Departamento Operacional' 
                  ? 'bg-blue-600' 
                  : 'bg-green-600'
              }`}></div>
              
              {/* Conteúdo */}
              <div className="p-12">
                <div className="flex items-start mb-8">
                  <Volume2 size={48} className="text-blue-600 mr-4 mt-2 animate-pulse" />
                  <div className="flex-1">
                    <div className="text-gray-600 text-2xl mb-2">
                      Chamando agora:
                    </div>
                    <div className="text-6xl font-bold text-gray-900 mb-4 break-words">
                      {chamadaAtual.nome}
                    </div>
                  </div>
                </div>

                <div className={`text-3xl font-semibold p-6 rounded-2xl ${
                  chamadaAtual.setor === 'Departamento Operacional'
                    ? 'bg-blue-100 text-blue-900'
                    : 'bg-green-100 text-green-900'
                }`}>
                  <div className="mb-2 text-xl opacity-75">Dirija-se ao:</div>
                  <div className="flex items-center">
                    <span className="text-5xl mr-3">→</span>
                    {chamadaAtual.setor}
                  </div>
                </div>

                {chamadaAtual.descricao && (
                  <div className="mt-6 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded">
                    <div className="text-yellow-800 text-xl">
                      <strong>Observação:</strong> {chamadaAtual.descricao}
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
            <h2 className="text-4xl font-bold text-white mb-4">
              Aguardando Chamadas
            </h2>
            <p className="text-blue-300 text-xl">
              Fique atento ao painel para sua chamada
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-slate-800 bg-opacity-50 backdrop-blur-sm p-4 text-center">
        <p className="text-blue-200">
          Em caso de dúvidas, dirija-se à recepção
        </p>
      </div>
    </div>
  );
}