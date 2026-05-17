import React, { useState, useEffect, useMemo } from 'react';
import { BarChart3, Download, FileDown, ArrowLeft, Columns, Search, X } from 'lucide-react';
import './PainelRelatorio.css';
import confederal from '../assets/confederal.png';

const API = 'http://192.168.0.126:3001';

// ============================================================
// Definição de todas as colunas disponíveis
// ============================================================
const TODAS_COLUNAS = [
  { key: 'nome',         label: 'VISITANTE',    excelLabel: 'VISITANTE'    },
  { key: 'matricula',    label: 'MATRÍCULA',    excelLabel: 'MATRÍCULA'    },
  { key: 'motivo',       label: 'MOTIVO',       excelLabel: 'MOTIVO'       },
  { key: 'departamento', label: 'DEPARTAMENTO', excelLabel: 'SETOR'        },
  { key: 'cadastrado',   label: 'CADASTRADO',   excelLabel: 'CADASTRADO'   },
  { key: 'chamado',      label: 'CHAMADO',      excelLabel: 'CHAMADO'      },
  { key: 'finalizado',   label: 'FINALIZADO',   excelLabel: 'FINALIZADO'   },
  { key: 'data',         label: 'DATA',         excelLabel: 'DATA'         },
  { key: 'hrChegada',    label: 'HR CHEGADA',   excelLabel: 'Hr-Chegada'   },
  { key: 'hrChamada',    label: 'HR CHAMADA',   excelLabel: 'Hr-Chamada'   },
  { key: 'hrSaida',      label: 'HR SAÍDA',     excelLabel: 'Hr-Saída'     },
  { key: 'tempoTotal',   label: 'TEMPO TOTAL',  excelLabel: 'TEMPO TOTAL'  },
  { key: 'status',       label: 'STATUS',       excelLabel: 'STATUS'       },
];

// ============================================================
// Presets de colunas
// ============================================================
const PRESETS = {
  completo: {
    label: 'Completo',
    descricao: 'Todas as colunas',
    colunas: TODAS_COLUNAS.map(c => c.key)
  },
  analise: {
    label: 'Análise',
    descricao: 'Foco em tempo e responsáveis',
    colunas: ['nome', 'matricula', 'motivo', 'departamento', 'chamado', 'finalizado', 'data', 'hrChegada', 'hrSaida', 'tempoTotal']
  }
};

// Campos disponíveis para a busca textual
const CAMPOS_BUSCA = [
  { key: 'nome',         label: 'Visitante'    },
  { key: 'matricula',    label: 'Matrícula'    },  // ← nova
  { key: 'motivo',       label: 'Motivo'       },
  { key: 'departamento', label: 'Departamento' },
];

const presetInicial = TODAS_COLUNAS.reduce((acc, c) => ({ ...acc, [c.key]: true }), {});

export default function PainelRelatorio({ usuario, onVoltar }) {
  const [visitas, setVisitas] = useState([]);
  const [estatisticas, setEstatisticas] = useState({
    total_visitas: 0, aguardando: 0, em_atendimento: 0, finalizados: 0,
    tempo_medio_espera: '0 min', tempo_medio_atendimento: '0 min'
  });
  const [carregando, setCarregando] = useState(false);
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [departamentoFiltro, setDepartamentoFiltro] = useState('todos');
  const [statusFiltro, setStatusFiltro] = useState('todos');
  const [departamentos, setDepartamentos] = useState([]);
  const [filtroAtivo, setFiltroAtivo] = useState('hoje');

  // Estado de colunas
  const [colunasSelecionadas, setColunasSelecionadas] = useState(presetInicial);
  const [presetAtivo, setPresetAtivo] = useState('completo');
  const [mostrarSeletor, setMostrarSeletor] = useState(false);

  // 🔍 Estado da busca textual
  const [campoBusca, setCampoBusca] = useState('nome');
  const [termoBusca, setTermoBusca] = useState('');

  const getPerfilLabel = () => {
    const perfis = { administrador: 'Administrador', relatorio: 'Analista de Relatórios' };
    return perfis[usuario?.perfil] || 'Usuário';
  };

  useEffect(() => {
    if (usuario && usuario.perfil !== 'administrador' && usuario.perfil !== 'relatorio') {
      alert('⚠️ Acesso negado!');
      onVoltar();
      return;
    }
    buscarDepartamentos();
    aplicarFiltroRapido('hoje');
  }, []);

  const buscarDepartamentos = async () => {
    try {
      const r = await fetch(`${API}/api/departamentos`);
      setDepartamentos(await r.json());
    } catch (e) { console.error(e); }
  };

  const aplicarFiltroRapido = (periodo) => {
    const hoje = new Date();
    let inicio, fim;
    switch (periodo) {
      case 'hoje':   inicio = fim = hoje.toISOString().split('T')[0]; break;
      case 'ontem':  const on = new Date(hoje); on.setDate(on.getDate()-1); inicio = fim = on.toISOString().split('T')[0]; break;
      case 'semana': const is = new Date(hoje); is.setDate(hoje.getDate()-hoje.getDay()); inicio = is.toISOString().split('T')[0]; fim = hoje.toISOString().split('T')[0]; break;
      case 'mes':    inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0]; fim = hoje.toISOString().split('T')[0]; break;
      case 'ano':    inicio = new Date(hoje.getFullYear(), 0, 1).toISOString().split('T')[0]; fim = hoje.toISOString().split('T')[0]; break;
      default: return;
    }
    setDataInicio(inicio); setDataFim(fim); setFiltroAtivo(periodo);
    buscarRelatorios(inicio, fim, departamentoFiltro, statusFiltro);
  };

  const buscarRelatorios = async (inicio, fim, depto, status) => {
    if (!inicio || !fim) return;
    setCarregando(true);
    try {
      let urlV = `${API}/api/relatorios/visitas?data_inicio=${inicio}&data_fim=${fim}`;
      if (depto && depto !== 'todos') urlV += `&departamento_id=${depto}`;
      if (status && status !== 'todos') urlV += `&status=${status}`;
      setVisitas(await (await fetch(urlV)).json());

      let urlS = `${API}/api/relatorios/estatisticas?data_inicio=${inicio}&data_fim=${fim}`;
      if (depto && depto !== 'todos') urlS += `&departamento_id=${depto}`;
      if (status && status !== 'todos') urlS += `&status=${status}`;
      setEstatisticas(await (await fetch(urlS)).json());
    } catch (e) { console.error(e); }
    finally { setCarregando(false); }
  };

  const aplicarFiltros = () => { setFiltroAtivo(null); buscarRelatorios(dataInicio, dataFim, departamentoFiltro, statusFiltro); };
  const limparFiltros  = () => { setDepartamentoFiltro('todos'); setStatusFiltro('todos'); setTermoBusca(''); aplicarFiltroRapido('hoje'); };

  const aplicarPreset = (key) => {
    const novas = TODAS_COLUNAS.reduce((acc, c) => ({ ...acc, [c.key]: PRESETS[key].colunas.includes(c.key) }), {});
    setColunasSelecionadas(novas);
    setPresetAtivo(key);
    setMostrarSeletor(false);
  };

  const toggleColuna = (key) => {
    setColunasSelecionadas(prev => ({ ...prev, [key]: !prev[key] }));
    setPresetAtivo(null);
  };

  const colunasAtivas = TODAS_COLUNAS.filter(c => colunasSelecionadas[c.key]);

  // 🔍 Filtragem em memória pela busca textual
  const visitasFiltradas = useMemo(() => {
    if (!termoBusca.trim()) return visitas;
    const termo = termoBusca.toLowerCase().trim();
    return visitas.filter(v => {
      switch (campoBusca) {
        case 'nome':         return (v.visitante_nome || '').toLowerCase().includes(termo);
        case 'matricula': return String(v.visitante_matricula || '').toLowerCase().includes(termo);
        case 'motivo':       return (v.motivo || '').toLowerCase().includes(termo);
        case 'departamento': return (v.departamento_nome || '').toLowerCase().includes(termo);
        default:             return true;
      }
    });
  }, [visitas, campoBusca, termoBusca]);

  const getCelula = (visita, key, horaChegada, horaChamada, horaSaida) => {
    switch (key) {
      case 'nome':         return visita.visitante_nome || '-';
      case 'matricula':    return visita.visitante_matricula || '-';
      case 'motivo':       return visita.motivo || '-';
      case 'departamento': return visita.departamento_nome || '-';
      case 'cadastrado':   return visita.usuario_cadastro_nome || '-';
      case 'chamado':      return visita.usuario_chamada_nome || '-';
      case 'finalizado':   return visita.usuario_finalizacao_nome || '-';
      case 'data':         return formatarData(horaChegada);
      case 'hrChegada':    return formatarHora(horaChegada);
      case 'hrChamada':    return formatarHora(horaChamada);
      case 'hrSaida':      return formatarHora(horaSaida);
      case 'tempoTotal':   return calcularTempoTotal(horaChegada, horaSaida);
      default:             return '-';
    }
  };

  const obterCampo = (v, ...ns) => { for (const n of ns) { if (v[n] != null) return v[n]; } return null; };

  const formatarData = (d) => {
    if (!d) return '-';
    try { const dt = new Date(d); return `${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')}/${dt.getFullYear()}`; }
    catch { return '-'; }
  };

  const formatarHora = (d) => {
    if (!d) return '-';
    try { const dt = new Date(d); return `${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}:${String(dt.getSeconds()).padStart(2,'0')}`; }
    catch { return '-'; }
  };

  const calcularTempoTotal = (c, s) => {
    if (!c || !s) return '-';
    try { const m = Math.floor((new Date(s)-new Date(c))/60000); if (m<0) return '-'; const h=Math.floor(m/60), mn=m%60; return h>0?`${h}h ${mn}min`:`${mn}min`; }
    catch { return '-'; }
  };

  const getColWidth = (key) => ({
    nome:       '160px',
    matricula:  '90px',
    hrChegada:  '95px',
    hrChamada:  '95px',
    hrSaida:    '95px',
    tempoTotal: '100px',
    data:       '95px',
    status:     '130px',
  }[key] || undefined);

  const getStatusColor = (s) => ({ aguardando:'#FFA500', chamado:'#2196F3', finalizado:'#4CAF50' }[s] || '#666');
  const getStatusLabel = (s) => ({ aguardando:'AGUARDANDO', chamado:'EM ATENDIMENTO', finalizado:'FINALIZADO' }[s] || s?.toUpperCase());

  // ============================================================
  // EXPORTAR EXCEL — usa lista filtrada (visitasFiltradas)
  // ============================================================
  const exportarCSV = async () => {
    if (visitasFiltradas.length === 0) { alert('Não há dados para exportar'); return; }

    const dataInicioFormatada = dataInicio ? new Date(dataInicio+'T00:00:00').toLocaleDateString('pt-BR') : '-';
    const dataFimFormatada    = dataFim    ? new Date(dataFim+'T00:00:00').toLocaleDateString('pt-BR')    : '-';
    const periodos = { hoje:'Hoje', ontem:'Ontem', semana:'Esta Semana', mes:'Este Mês', ano:'Este Ano' };
    const periodoTexto = filtroAtivo ? (periodos[filtroAtivo] || 'Personalizado') : 'Período Personalizado';
    const nomePreset  = presetAtivo ? PRESETS[presetAtivo]?.label : 'Personalizado';

    const statusCount = {
      aguardando:  visitasFiltradas.filter(v => v.status === 'aguardando').length,
      atendimento: visitasFiltradas.filter(v => v.status === 'chamado').length,
      finalizado:  visitasFiltradas.filter(v => v.status === 'finalizado').length
    };

    const visitasMapeadas = visitasFiltradas.map(v => {
      const horaChegada = obterCampo(v, 'hora_chegada', 'data_entrada');
      const horaChamada = obterCampo(v, 'hora_chamada', 'data_chamada');
      const horaSaida   = obterCampo(v, 'hora_saida',   'data_saida');
      const obj = { status: v.status };
      colunasAtivas.forEach(col => {
        if (col.key === 'matricula') obj[col.key] = v.visitante_matricula || '-';
        else obj[col.key] = getCelula(v, col.key, horaChegada, horaChamada, horaSaida);
      });
      return obj;
    });

    try {
      const response = await fetch(`${API}/api/relatorios/exportar-excel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitas:      visitasMapeadas,
          colunas:      colunasAtivas.map(c => ({ key: c.key, excelLabel: c.excelLabel })),
          dataInicio:   dataInicioFormatada,
          dataFim:      dataFimFormatada,
          periodoTexto,
          nomePreset,
          statusCount,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.erro || 'Erro no servidor');
      }

      const blob = await response.blob();
      const url  = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href     = url;
      link.download = `relatorio_visitas_${dataInicio}_${dataFim}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);

    } catch (e) {
      console.error('Erro ao exportar:', e);
      alert(`Erro ao gerar relatório:\n${e.message}`);
    }
  };

  const exportarPDF = () => alert('Funcionalidade de exportação para PDF será implementada em breve');

  // Placeholder dinâmico do campo de busca
  const placeholderBusca = `Pesquisar por ${CAMPOS_BUSCA.find(c => c.key === campoBusca)?.label.toLowerCase()}...`;

  return (
    <div className="painel-relatorio">
      <div className="relatorio-background" style={{ backgroundImage: `url(${confederal})` }}></div>
      <div className="relatorio-overlay"></div>

      <div className="relatorio-content">
        <div className="relatorio-card">

          {/* HEADER */}
          <div className="relatorio-header">
            <div className="header-left">
              <div className="header-icon"><BarChart3 size={32} /></div>
              <div className="header-info">
                <h1>Relatórios e Estatísticas</h1>
                <p>{getPerfilLabel()} • Análise de Visitas</p>
              </div>
            </div>
            <button className="btn-voltar" onClick={onVoltar}><ArrowLeft size={20} /> Voltar</button>
          </div>

          {/* FILTROS RÁPIDOS */}
          <div className="filtros-rapidos">
            {['hoje','ontem','semana','mes','ano'].map((p, i) => {
              const labels = ['📅 Hoje','📆 Ontem','📊 Esta Semana','📈 Este Mês','📋 Este Ano'];
              return (
                <button key={p} className={`filtro-btn ${filtroAtivo === p ? 'active' : ''}`} onClick={() => aplicarFiltroRapido(p)}>
                  {labels[i]}
                </button>
              );
            })}
            <button className="btn-limpar-filtros" onClick={limparFiltros}>🔄 Limpar</button>
          </div>

          {/* FILTROS AVANÇADOS */}
          <div className="filtros-avancados">
            <div className="filtro-item">
              <label>Data Início:</label>
              <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
            </div>
            <div className="filtro-item">
              <label>Data Fim:</label>
              <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
            </div>
            <div className="filtro-item">
              <label>Departamento:</label>
              <select value={departamentoFiltro} onChange={(e) => setDepartamentoFiltro(e.target.value)}>
                <option value="todos">Todos</option>
                {departamentos.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
              </select>
            </div>
            <div className="filtro-item">
              <label>Status:</label>
              <select value={statusFiltro} onChange={(e) => setStatusFiltro(e.target.value)}>
                <option value="todos">Todos</option>
                <option value="aguardando">Aguardando</option>
                <option value="chamado">Em Atendimento</option>
                <option value="finalizado">Finalizado</option>
              </select>
            </div>
            <button className="btn-aplicar-filtros" onClick={aplicarFiltros}>Buscar</button>
          </div>

          {/* 🔍 BUSCA TEXTUAL */}
          <div className="busca-container">
            <div className="busca-icon"><Search size={18} /></div>
            <select
              className="busca-select"
              value={campoBusca}
              onChange={(e) => setCampoBusca(e.target.value)}
            >
              {CAMPOS_BUSCA.map(c => (
                <option key={c.key} value={c.key}>{c.label}</option>
              ))}
            </select>
            <input
              type="text"
              className="busca-input"
              value={termoBusca}
              onChange={(e) => setTermoBusca(e.target.value)}
              placeholder={placeholderBusca}
            />
            {termoBusca && (
              <button
                className="busca-limpar"
                onClick={() => setTermoBusca('')}
                title="Limpar busca"
              >
                <X size={16} />
              </button>
            )}
            {termoBusca && (
              <span className="busca-resultado">
                {visitasFiltradas.length} {visitasFiltradas.length === 1 ? 'resultado' : 'resultados'}
              </span>
            )}
          </div>

          {/* SELETOR DE COLUNAS */}
          <div className="seletor-colunas-container">
            <div className="seletor-header">
              <div className="seletor-presets">
                <span className="seletor-label"><Columns size={15} /> Colunas:</span>
                {Object.entries(PRESETS).map(([key, preset]) => (
                  <button
                    key={key}
                    className={`preset-btn ${presetAtivo === key ? 'active' : ''}`}
                    onClick={() => aplicarPreset(key)}
                    title={preset.descricao}
                  >
                    {preset.label}
                  </button>
                ))}
                <button
                  className={`preset-btn ${mostrarSeletor ? 'active' : ''} ${!presetAtivo ? 'personalizado' : ''}`}
                  onClick={() => setMostrarSeletor(v => !v)}
                >
                  🔧 Personalizar {mostrarSeletor ? '▲' : '▼'}
                </button>
              </div>
            </div>

            {mostrarSeletor && (
              <div className="seletor-toggles">
                {TODAS_COLUNAS.map(col => (
                  <label key={col.key} className={`toggle-col ${colunasSelecionadas[col.key] ? 'ativo' : ''}`}>
                    <input
                      type="checkbox"
                      checked={!!colunasSelecionadas[col.key]}
                      onChange={() => toggleColuna(col.key)}
                    />
                    {col.label}
                  </label>
                ))}
                <div className="toggle-acoes">
                  <button onClick={() => { const t = TODAS_COLUNAS.reduce((a,c)=>({...a,[c.key]:true}),{}); setColunasSelecionadas(t); setPresetAtivo('completo'); }}>✅ Todas</button>
                  <button onClick={() => { const t = TODAS_COLUNAS.reduce((a,c)=>({...a,[c.key]:false}),{}); setColunasSelecionadas(t); setPresetAtivo(null); }}>❌ Nenhuma</button>
                </div>
              </div>
            )}
          </div>

          {/* CARDS DE ESTATÍSTICAS */}
          <div className="cards-estatisticas">
            <div className="card-stat card-azul"><div className="card-icon">👥</div><div className="card-content"><h3>{estatisticas.total_visitas}</h3><p>Total de Visitas</p></div></div>
            <div className="card-stat card-laranja"><div className="card-icon">⏳</div><div className="card-content"><h3>{estatisticas.aguardando}</h3><p>Aguardando</p></div></div>
            <div className="card-stat card-azul-claro"><div className="card-icon">📈</div><div className="card-content"><h3>{estatisticas.em_atendimento}</h3><p>Em Atendimento</p></div></div>
            <div className="card-stat card-verde"><div className="card-icon">📊</div><div className="card-content"><h3>{estatisticas.finalizados}</h3><p>Finalizados</p></div></div>
            <div className="card-stat card-amarelo"><div className="card-icon">⏱️</div><div className="card-content"><h3>{estatisticas.tempo_medio_espera}</h3><p>Tempo Médio Espera</p></div></div>
            <div className="card-stat card-roxo"><div className="card-icon">📋</div><div className="card-content"><h3>{estatisticas.tempo_medio_atendimento}</h3><p>Tempo Médio Atendimento</p></div></div>
          </div>

          {/* EXPORTAÇÃO */}
          <div className="exportacao-header">
            <h3><FileDown size={20} /> Exportar Dados ({visitasFiltradas.length} registros)</h3>
            <div className="exportacao-botoes">
              <button className="btn-export btn-csv" onClick={exportarCSV}><Download size={18} /> Exportar Excel</button>
              <button className="btn-export btn-pdf" onClick={exportarPDF}><Download size={18} /> Exportar PDF</button>
            </div>
          </div>

          {/* TABELA */}
          <div className="tabela-container" style={{ overflowX: 'auto', width: '100%' }}>
            <h3>Detalhamento de Visitas</h3>
            {carregando ? (
              <div className="loading">Carregando dados...</div>
            ) : visitasFiltradas.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">👁️</div>
                <p>
                  {termoBusca
                    ? `Nenhum resultado encontrado para "${termoBusca}"`
                    : 'Nenhum registro encontrado para o período selecionado'}
                </p>
              </div>
            ) : colunasAtivas.length === 0 ? (
              <div className="empty-state"><div className="empty-icon">📋</div><p>Selecione ao menos uma coluna para exibir</p></div>
            ) : (
              <table className="tabela-visitas" style={{ minWidth: `${Math.max(600, colunasAtivas.length * 120)}px`, width: '100%' }}>
                <thead>
                  <tr>{colunasAtivas.map(col => <th key={col.key} style={{ width: getColWidth(col.key), minWidth: getColWidth(col.key), textAlign: 'center' }}>{col.label}</th>)}</tr>
                </thead>
                <tbody>
                  {visitasFiltradas.map((visita) => {
                    const horaChegada = obterCampo(visita, 'hora_chegada', 'data_entrada');
                    const horaChamada = obterCampo(visita, 'hora_chamada', 'data_chamada');
                    const horaSaida   = obterCampo(visita, 'hora_saida',   'data_saida');
                    return (
                      <tr key={visita.id}>
                        {colunasAtivas.map(col => (
                          <td key={col.key} style={{ textAlign: 'center', wordBreak: 'break-word', whiteSpace: 'normal' }}>
                            {col.key === 'status' ? (
                              <span className="status-badge" style={{ backgroundColor: getStatusColor(visita.status) }}>
                                {getStatusLabel(visita.status)}
                              </span>
                            ) : getCelula(visita, col.key, horaChegada, horaChamada, horaSaida)}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

        </div>
        <div className="painel-admin-footer">
          <p>Sistema de Recepção - Máxima Facility | Confederal</p>
          <p>© 2026 • Desenvolvido por Jonathan Almeida Vieira • TI</p>
        </div>
      </div>
    </div>
  );
}