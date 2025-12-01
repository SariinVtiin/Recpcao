import React, { useState, useEffect } from 'react';
import { User, Building2, LogOut, Send, IdCard } from 'lucide-react';
import './PainelRecepcao.css';

export default function PainelRecepcao({ usuario, onLogout }) {
  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [motivo, setMotivo] = useState('');
  const [matricula, setMatricula] = useState('');
  const [departamentoId, setDepartamentoId] = useState(2);
  const [preferencial, setPreferencial] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [estatisticas, setEstatisticas] = useState(null);

  useEffect(() => {
    buscarEstatisticas();
    const interval = setInterval(buscarEstatisticas, 5000);
    return () => clearInterval(interval);
  }, []);

  const buscarEstatisticas = async () => {
    try {
      const response = await fetch('https://192.167.2.41:3001/api/relatorios/dia');
      const data = await response.json();
      setEstatisticas(data);
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
    }
  };

  const buscarVisitantePorCPF = async (cpfDigitado) => {
    const cpfLimpo = cpfDigitado.replace(/\D/g, '');
    
    // Só busca quando o CPF tiver 11 dígitos completos
    if (cpfLimpo.length !== 11) return;

    try {
      const response = await fetch(`https://192.167.2.41:3001/api/visitantes/${cpfLimpo}`);
      
      if (response.ok) {
        const data = await response.json();
        // Preenche automaticamente os campos com os dados encontrados
        setNome(data.nome || '');
        // A matrícula vem do campo 'matricula' do visitante
        setMatricula(data.matricula || '');
        setPreferencial(data.preferencial || false);
        setMensagem('✅ Visitante encontrado no sistema!');
        setTimeout(() => setMensagem(''), 2000);
      }
    } catch (error) {
      // Se não encontrar, não faz nada (visitante novo)
      console.log('Visitante não encontrado - novo cadastro');
    }
  };

  const registrarVisita = async () => {
    if (!nome.trim() || !cpf.trim() || !motivo.trim()) {
      setMensagem('❌ Nome, CPF e Motivo são obrigatórios');
      setTimeout(() => setMensagem(''), 3000);
      return;
    }

    setCarregando(true);

    try {
      const response = await fetch('https://192.167.2.41:3001/api/visitas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: nome.trim(),
          cpf: cpf.replace(/\D/g, ''),
          departamento_id: departamentoId,
          motivo: motivo.trim(),
          observacao: matricula.trim(), // Envia matrícula como observação no backend
          preferencial: preferencial,
          usuario_id: usuario.id
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setMensagem(`✅ ${data.visitante_nome} registrado com sucesso!`);
        setNome('');
        setCpf('');
        setMotivo('');
        setMatricula('');
        setPreferencial(false);
        buscarEstatisticas();
        setTimeout(() => setMensagem(''), 3000);
      } else {
        const error = await response.json();
        setMensagem(`❌ ${error.error}`);
        setTimeout(() => setMensagem(''), 3000);
      }
    } catch (error) {
      console.error('Erro:', error);
      setMensagem('❌ Erro de conexão');
      setTimeout(() => setMensagem(''), 3000);
    } finally {
      setCarregando(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') registrarVisita();
  };

  const formatarCPF = (valor) => {
    let cpfLimpo = valor.replace(/\D/g, '');
    if (cpfLimpo.length <= 11) {
      if (cpfLimpo.length >= 9) {
        cpfLimpo = cpfLimpo.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4');
      } else if (cpfLimpo.length >= 6) {
        cpfLimpo = cpfLimpo.replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3');
      } else if (cpfLimpo.length >= 3) {
        cpfLimpo = cpfLimpo.replace(/(\d{3})(\d{1,3})/, '$1.$2');
      }
      setCpf(cpfLimpo);
      
      // Busca o visitante quando o CPF estiver completo
      buscarVisitantePorCPF(cpfLimpo);
    }
  };

  return (
    <div className="painel-recepcao-container">
      {/* Fundo com Imagem */}
      <div className="painel-recepcao-background"></div>
      
      {/* Overlay Gradiente */}
      <div className="painel-recepcao-overlay"></div>

      {/* Conteúdo */}
      <div className="painel-recepcao-content">    
        {/* Card Principal */}
        <div className="painel-recepcao-card">
          {/* Header */}
          <div className="painel-recepcao-header">
            <div className="painel-recepcao-header-left">
              <div className="painel-recepcao-icon">
                <Send className="text-white" size={24} />
              </div>
              <div>
                <h1 className="painel-recepcao-title">Painel Recepção</h1>
                <p className="painel-recepcao-subtitle">{usuario.nome}</p>
              </div>
            </div>
            <button onClick={onLogout} className="painel-recepcao-btn-logout">
              <LogOut size={18} className="mr-2" />
              Sair
            </button>
          </div>

          {/* Formulário */}
          <div className="painel-recepcao-form">
            {/* CPF - Primeiro campo com autofocus */}
            <div className="painel-recepcao-form-group">
              <label className="painel-recepcao-label">
                CPF*
              </label>
              <input
                type="text"
                value={cpf}
                onChange={(e) => formatarCPF(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="000.000.000-00"
                maxLength="14"
                className="painel-recepcao-input"
                autoFocus
              />
              <p className="painel-recepcao-input-hint">
                Digite o CPF para buscar visitante cadastrado
              </p>
            </div>

            {/* Nome Completo */}
            <div className="painel-recepcao-form-group">
              <label className="painel-recepcao-label">
                <User size={18} className="painel-recepcao-label-icon" />
                Nome Completo*
              </label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Digite o nome completo"
                maxLength="250"
                className="painel-recepcao-input"
              />
            </div>

            {/* Matrícula */}
            <div className="painel-recepcao-form-group">
              <label className="painel-recepcao-label">
                <IdCard size={18} className="painel-recepcao-label-icon" />
                Matrícula (opcional)
              </label>
              <input
                type="text"
                value={matricula}
                onChange={(e) => setMatricula(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Digite a matrícula"
                maxLength="5"
                className="painel-recepcao-input"
              />
            </div>

            {/* Motivo */}
            <div className="painel-recepcao-form-group">
              <label className="painel-recepcao-label">
                Motivo da Visita*
              </label>
              <input
                type="text"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ex: Entrega de documentos"
                maxLength="250"
                className="painel-recepcao-input"
              />
            </div>

            {/* Departamento */}
            <div className="painel-recepcao-form-group">
              <label className="painel-recepcao-label">
                <Building2 size={18} className="painel-recepcao-label-icon" />
                Departamento de Destino
              </label>
              <div className="painel-recepcao-dept-grid">
                <button
                  onClick={() => setDepartamentoId(2)}
                  className={`painel-recepcao-dept-btn operacional ${departamentoId === 2 ? 'active' : ''}`}
                >
                  <div className="painel-recepcao-dept-name">Departamento Operacional</div>
                </button>
                
                <button
                  onClick={() => setDepartamentoId(3)}
                  className={`painel-recepcao-dept-btn pessoal ${departamentoId === 3 ? 'active' : ''}`}
                >
                  <div className="painel-recepcao-dept-name">Departamento Pessoal</div>
                </button>

                <button
                  onClick={() => setDepartamentoId(5)}
                  className={`painel-recepcao-dept-btn finance ${departamentoId === 5 ? 'active' : ''}`}
                >
                  <div className="painel-recepcao-dept-name">Departamento Financeiro</div>
                </button>
              </div>
            </div>

            {/* Botão Registrar */}
            <button
              onClick={registrarVisita}
              disabled={carregando}
              className="painel-recepcao-btn-submit"
            >
              {carregando ? 'Registrando...' : 'Registrar Visitante'}
            </button>
          </div>

          {/* Mensagem de Feedback */}
          {mensagem && (
            <div className={`painel-recepcao-message ${mensagem.includes('✅') ? 'success' : 'error'}`}>
              {mensagem}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}