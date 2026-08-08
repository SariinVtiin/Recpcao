import React, { useState, useEffect, useRef } from 'react';
import { User, Building2, LogOut, Send, IdCard } from 'lucide-react';
import './PainelRecepcao.css';
import confederal from '../assets/confederal.png';

const API = 'http://192.167.0.9:3001';
const INATIVIDADE_MS = 4 * 60 * 1000; // 4 minutos

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
  const [buscandoCpf, setBuscandoCpf] = useState(false);
  const [aguardandoConfirmacao, setAguardandoConfirmacao] = useState(false);

  // ── Timer de inatividade ──────────────────────────────────────────────────
  const timerLogoutRef = useRef(null);

  const resetarTimer = () => {
    clearTimeout(timerLogoutRef.current);
    timerLogoutRef.current = setTimeout(() => {
      onLogout();
    }, INATIVIDADE_MS);
  };

  useEffect(() => {
    const eventos = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    eventos.forEach(ev => window.addEventListener(ev, resetarTimer));
    resetarTimer();

    return () => {
      eventos.forEach(ev => window.removeEventListener(ev, resetarTimer));
      clearTimeout(timerLogoutRef.current);
    };
  }, []);

  // ── Estatísticas ──────────────────────────────────────────────────────────
  useEffect(() => {
    buscarEstatisticas();
    const interval = setInterval(buscarEstatisticas, 5000);
    return () => clearInterval(interval);
  }, []);

  const buscarEstatisticas = async () => {
    try {
      const response = await fetch(`${API}/api/relatorios/dia`);
      const data = await response.json();
      setEstatisticas(data);
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
    }
  };

  // ── Busca por CPF ─────────────────────────────────────────────────────────
  const buscarVisitantePorCPF = async (cpfDigitado) => {
    const cpfLimpo = cpfDigitado.replace(/\D/g, '');
    if (cpfLimpo.length !== 11) return;

    setBuscandoCpf(true);
    try {
      const response = await fetch(`${API}/api/visitantes/${cpfLimpo}`);
      if (response.ok) {
        const data = await response.json();
        setNome(data.nome || '');

        // Se o histórico tiver "Sem Matrícula" ou vazio, deixa o campo vazio
        // para o recepcionista poder atualizar o cadastro caso necessário
        const matriculaValida = data.matricula && data.matricula !== 'Sem Matrícula';
        setMatricula(matriculaValida ? data.matricula : '');

        setPreferencial(data.preferencial || false);
        setMensagem('✅ Visitante encontrado no sistema!');
        setTimeout(() => setMensagem(''), 2000);
      }
    } catch (error) {
      console.log('Visitante não encontrado - novo cadastro');
    } finally {
      setBuscandoCpf(false);
    }
  };

  // ── Registrar visita ──────────────────────────────────────────────────────
  const registrarVisita = async (forcarSemMatricula = false) => {
    if (!nome.trim() || !cpf.trim() || !motivo.trim()) {
      setMensagem('❌ Nome, CPF e Motivo são obrigatórios');
      setTimeout(() => setMensagem(''), 3000);
      return;
    }

    // ⚠️ Matrícula vazia — aguarda confirmação do recepcionista
    if (!matricula.trim() && !forcarSemMatricula) {
      setAguardandoConfirmacao(true);
      return;
    }

    setAguardandoConfirmacao(false);
    setCarregando(true);

    try {
      const response = await fetch(`${API}/api/visitas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: nome.trim(),
          cpf: cpf.replace(/\D/g, ''),
          departamento_id: departamentoId,
          motivo: motivo.trim(),
          observacao: matricula.trim() ? matricula.trim() : 'Sem Matrícula',
          preferencial: preferencial,
          usuario_id: usuario.id
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setMensagem(`✅ ${data.visitante_nome} registrado com sucesso!`);
        limparFormulario();
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

  const limparFormulario = () => {
    setNome('');
    setCpf('');
    setMotivo('');
    setMatricula('');
    setPreferencial(false);
    setAguardandoConfirmacao(false);
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
      buscarVisitantePorCPF(cpfLimpo);
    }
  };

  // ── Matrícula: apenas números ─────────────────────────────────────────────
  const handleMatricula = (e) => {
    const apenasNumeros = e.target.value.replace(/\D/g, '');
    setMatricula(apenasNumeros);
    if (apenasNumeros.trim()) setAguardandoConfirmacao(false);
  };

  return (
    <div className="painel-recepcao-container">
      {/* Fundo com Imagem */}
      <div className="painel-recepcao-background"
        style={{ backgroundImage: `url(${confederal})` }}
      ></div>

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

            {/* CPF */}
            <div className="painel-recepcao-form-group">
              <label className="painel-recepcao-label">CPF*</label>
              <div style={{ position: 'relative' }}>
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
                {buscandoCpf && (
                  <span style={{
                    position: 'absolute', right: '12px', top: '50%',
                    transform: 'translateY(-50%)', fontSize: '12px', color: '#888'
                  }}>
                    Buscando...
                  </span>
                )}
              </div>
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
                onChange={handleMatricula}
                onKeyPress={handleKeyPress}
                placeholder="Digite a matrícula"
                maxLength="5"
                inputMode="numeric"
                className="painel-recepcao-input"
              />

              {/* ⚠️ Confirmação aparece logo abaixo do campo matrícula */}
              {aguardandoConfirmacao && (
                <div style={{
                  marginTop: '10px',
                  background: '#fff8e1',
                  border: '1px solid #f59e0b',
                  borderRadius: '10px',
                  padding: '14px'
                }}>
                  <p style={{ margin: '0 0 10px', fontSize: '13px', color: '#92400e', fontWeight: '500' }}>
                    ⚠️ Matrícula não preenchida. Este visitante não é funcionário?
                  </p>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => setAguardandoConfirmacao(false)}
                      style={{
                        flex: 1, padding: '9px', borderRadius: '8px',
                        background: '#f59e0b', color: '#374151', fontWeight: '600',
                        cursor: 'pointer', fontSize: '13px', border: 'none'
                      }}
                    >
                      Voltar e preencher
                    </button>
                    <button
                      onClick={() => registrarVisita(true)}
                      style={{
                        flex: 1, padding: '9px', borderRadius: '8px',
                        border: '1px solid #d1d5db', background: '#fff',
                        cursor: 'pointer', fontSize: '13px'
                      }}
                    >
                      Confirmar sem matrícula
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Motivo */}
            <div className="painel-recepcao-form-group">
              <label className="painel-recepcao-label">Motivo da Visita*</label>
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
              onClick={() => registrarVisita()}
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

        <div className="painel-admin-footer">
          <p>Sistema de Recepção - Máxima Facility | Confederal</p>
          <p>© 2026 • Desenvolvido por Jonathan Almeida Vieira • TI</p>
        </div>
      </div>
    </div>
  );
}