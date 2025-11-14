import React, { useState, useEffect } from 'react';
import { BarChart3, Download, FileDown, Filter, ArrowLeft } from 'lucide-react';
import './PainelRelatorio.css';
import imagemFundo from '../assets/confederal.png';

export default function PainelRelatorio({ onVoltar }) {
  const [visitas, setVisitas] = useState([]);
  const [estatisticas, setEstatisticas] = useState({
    total_visitas: 0,
    aguardando: 0,
    em_atendimento: 0,
    finalizados: 0,
    tempo_medio_espera: '0 min',
    tempo_medio_atendimento: '0 min'
  });
  const [carregando, setCarregando] = useState(false);
  
  // Filtros
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [departamentoFiltro, setDepartamentoFiltro] = useState('todos');
  const [statusFiltro, setStatusFiltro] = useState('todos');
  const [departamentos, setDepartamentos] = useState([]);
  const [filtroAtivo, setFiltroAtivo] = useState('hoje'); // NOVO: Estado para filtro ativo

  useEffect(() => {
    buscarDepartamentos();
    aplicarFiltroRapido('hoje');
  }, []);

  const buscarDepartamentos = async () => {
    try {
      const response = await fetch('https://192.167.2.41:3001/api/departamentos');
      const data = await response.json();
      setDepartamentos(data);
    } catch (error) {
      console.error('Erro ao buscar departamentos:', error);
    }
  };

  const aplicarFiltroRapido = (periodo) => {
    const hoje = new Date();
    let inicio, fim;

    switch (periodo) {
      case 'hoje':
        inicio = fim = hoje.toISOString().split('T')[0];
        break;
      case 'ontem':
        const ontem = new Date(hoje);
        ontem.setDate(ontem.getDate() - 1);
        inicio = fim = ontem.toISOString().split('T')[0];
        break;
      case 'semana':
        const inicioSemana = new Date(hoje);
        inicioSemana.setDate(hoje.getDate() - hoje.getDay());
        inicio = inicioSemana.toISOString().split('T')[0];
        fim = hoje.toISOString().split('T')[0];
        break;
      case 'mes':
        inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0];
        fim = hoje.toISOString().split('T')[0];
        break;
      case 'ano':
        inicio = new Date(hoje.getFullYear(), 0, 1).toISOString().split('T')[0];
        fim = hoje.toISOString().split('T')[0];
        break;
      default:
        return;
    }

    setDataInicio(inicio);
    setDataFim(fim);
    setFiltroAtivo(periodo); // Define qual filtro está ativo
    buscarRelatorios(inicio, fim, departamentoFiltro, statusFiltro);
  };

  const buscarRelatorios = async (inicio, fim, depto, status) => {
    if (!inicio || !fim) {
      console.log('Datas não definidas');
      return;
    }

    setCarregando(true);
    try {
      // Buscar visitas
      let urlVisitas = `https://192.167.2.41:3001/api/relatorios/visitas?data_inicio=${inicio}&data_fim=${fim}`;
      if (depto && depto !== 'todos') {
        urlVisitas += `&departamento_id=${depto}`;
      }
      if (status && status !== 'todos') {
        urlVisitas += `&status=${status}`;
      }

      const resVisitas = await fetch(urlVisitas);
      const dataVisitas = await resVisitas.json();
      
      console.log('Visitas recebidas:', dataVisitas);
      setVisitas(dataVisitas);

      // Buscar estatísticas COM OS MESMOS FILTROS
      let urlStats = `https://192.167.2.41:3001/api/relatorios/estatisticas?data_inicio=${inicio}&data_fim=${fim}`;
      if (depto && depto !== 'todos') {
        urlStats += `&departamento_id=${depto}`;
      }
      if (status && status !== 'todos') {
        urlStats += `&status=${status}`;
      }

      const resStats = await fetch(urlStats);
      const dataStats = await resStats.json();
      
      console.log('Estatísticas recebidas:', dataStats);
      setEstatisticas(dataStats);
    } catch (error) {
      console.error('Erro ao buscar relatórios:', error);
    } finally {
      setCarregando(false);
    }
  };

  const aplicarFiltros = () => {
    setFiltroAtivo(null); // Remove destaque dos filtros rápidos
    buscarRelatorios(dataInicio, dataFim, departamentoFiltro, statusFiltro);
  };

  const limparFiltros = () => {
    setDepartamentoFiltro('todos');
    setStatusFiltro('todos');
    aplicarFiltroRapido('hoje'); // Volta para "Hoje"
  };

  const formatarData = (dataString) => {
    if (!dataString) return 'N/A';
    const data = new Date(dataString);
    return data.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatarCPF = (cpf) => {
    if (!cpf) return 'N/A';
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  const formatarTempo = (minutos) => {
    if (minutos === null || minutos === undefined) return 'N/A';
    if (minutos === 0) return '0 min';
    return `${minutos} min`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'aguardando':
        return '#FFA500';
      case 'chamado':
        return '#2196F3';
      case 'finalizado':
        return '#4CAF50';
      default:
        return '#666';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'aguardando':
        return 'AGUARDANDO';
      case 'chamado':
        return 'EM ATENDIMENTO';
      case 'finalizado':
        return 'FINALIZADO';
      default:
        return status?.toUpperCase();
    }
  };

const exportarCSV = () => {
    if (visitas.length === 0) {
      alert('Não há dados para exportar');
      return;
    }

    // Formatação das datas para exibição
    const dataInicioFormatada = dataInicio ? new Date(dataInicio + 'T00:00:00').toLocaleDateString('pt-BR') : 'N/A';
    const dataFimFormatada = dataFim ? new Date(dataFim + 'T00:00:00').toLocaleDateString('pt-BR') : 'N/A';
    const dataAtual = new Date().toLocaleDateString('pt-BR');
    const horaAtual = new Date().toLocaleTimeString('pt-BR');

    // Determinar o período
    let periodoTexto = '';
    if (filtroAtivo) {
      const periodos = {
        'hoje': 'Hoje',
        'ontem': 'Ontem',
        'semana': 'Esta Semana',
        'mes': 'Este Mês',
        'ano': 'Este Ano'
      };
      periodoTexto = periodos[filtroAtivo] || 'Personalizado';
    } else {
      periodoTexto = 'Período Personalizado';
    }

    const totalTempoEspera = visitas.reduce((acc, v) => acc + (v.tempo_espera_minutos || 0), 0);
    const totalTempoAtendimento = visitas.reduce((acc, v) => acc + (v.tempo_atendimento_minutos || 0), 0);
    const mediaTempoEspera = visitas.length > 0 ? (totalTempoEspera / visitas.length).toFixed(1) : 0;
    const mediaTempoAtendimento = visitas.length > 0 ? (totalTempoAtendimento / visitas.length).toFixed(1) : 0;

    // Contadores por status
    const statusCount = {
      aguardando: visitas.filter(v => v.status === 'aguardando').length,
      atendimento: visitas.filter(v => v.status === 'chamado').length,
      finalizado: visitas.filter(v => v.status === 'finalizado').length
    };

    const headers = [
      'Data',
      'Hora',
      'Visitante',
      'CPF',
      'Matrícula',
      'Motivo',
      'Departamento',
      'Responsável',
      'Tempo Espera (min)',
      'Tempo Atendimento (min)',
      'Tempo Total (min)',
      'Status'
    ];

    const rows = visitas.map(v => {
      const dataHora = v.data_entrada ? new Date(v.data_entrada) : null;
      const data = dataHora ? dataHora.toLocaleDateString('pt-BR') : 'N/A';
      const hora = dataHora ? dataHora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'N/A';

      const tempoEspera = v.tempo_espera_minutos || 0;
      const tempoAtendimento = v.tempo_atendimento_minutos || 0;
      const tempoTotal = (tempoEspera + tempoAtendimento) || 'N/A';

      return [
        data,
        hora,
        v.visitante_nome || 'N/A',
        v.visitante_cpf ? `'${v.visitante_cpf}` : 'N/A', // Apóstrofo força texto no Excel
        v.visitante_matricula ? `'${v.visitante_matricula}` : 'N/A', // Apóstrofo força texto no Excel
        v.motivo || 'N/A',
        v.departamento_nome || 'N/A',
        v.responsavel_nome || 'N/A',
        v.tempo_espera_minutos || 'N/A',
        v.tempo_atendimento_minutos || 'N/A',
        tempoTotal,
        getStatusLabel(v.status)
      ];
    });

    const htmlContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
      <meta charset="utf-8">
      <style>
      body {
        font-family: Calibri, sans-serif;
        padding: 20px;
      }
      table {
        border-collapse: collapse;
        font-size: 11pt;
        width: 100%;
        margin-bottom: 30px;
      }
      .section-title {
        background-color: #1a5490;
        color: white;
        font-weight: bold;
        font-size: 16pt;
        padding: 15px;
        text-align: center;
        margin-bottom: 20px;
      }
      .summary-container {
        margin-bottom: 40px;
      }
      .summary-header {
        background-color: #34495e;
        color: white;
        font-weight: bold;
        border: 1px solid #000;
        padding: 12px;
        text-align: center;
        font-size: 14pt;
      }
      .summary-label {
        background-color: #ecf0f1;
        font-weight: bold;
        border: 1px solid #bdc3c7;
        padding: 10px;
        text-align: left;
        font-size: 12pt;
        width: 60%;
      }
      .summary-value {
        background-color: #ffffff;
        font-weight: bold;
        border: 1px solid #bdc3c7;
        padding: 10px;
        text-align: center;
        font-size: 12pt;
        width: 40%;
      }
      .chart-container {
        margin: 40px 0;
      }
      .chart-title {
        background-color: #34495e;
        color: white;
        font-weight: bold;
        padding: 12px;
        text-align: center;
        font-size: 14pt;
        margin-bottom: 20px;
      }
      .header {
        background-color: #2c3e50;
        color: white;
        font-weight: bold;
        text-align: center;
        border: 1px solid #000;
        padding: 8px;
      }
      .cell {
        border: 1px solid #bdc3c7;
        padding: 5px;
        text-align: left;
      }
      .cell-aguardando {
        background-color: #fff3cd;
      }
      .cell-atendimento {
        background-color: #cfe2ff;
      }
      .cell-finalizado {
        background-color: #d1e7dd;
      }
      </style>
      </head>
      <body>

      <!-- INFORMAÇÕES DO RELATÓRIO -->
      <div style="margin-bottom: 20px; padding: 15px; background-color: #f8f9fa; border: 2px solid #1a5490; border-radius: 5px;">
      <table style="width: 100%; margin-bottom: 0;">
      <tbody>
      <tr>
      <td style="border: none; padding: 5px; font-size: 11pt;"><strong>📅 Período do Relatório:</strong> ${periodoTexto}</td>
      </tr>
      <tr>
      <td style="border: none; padding: 5px; font-size: 11pt;"><strong>📊 Data Início:</strong> ${dataInicioFormatada}</td>
      </tr>
      <tr>
      <td style="border: none; padding: 5px; font-size: 11pt;"><strong>📊 Data Fim:</strong> ${dataFimFormatada}</td>
      </tr>
      </tbody>
      </table>
      </div>

      <!-- RESUMO GERAL -->
      <div class="summary-container">
      <div class="section-title">RELATÓRIO DE VISITAS - RESUMO GERAL</div>
      <table>
      <thead>
      <tr>
      <td colspan="2" class="summary-header">ESTATÍSTICAS</td>
      </tr>
      </thead>
      <tbody>
      <tr>
      <td class="summary-label">Total de Registros:</td>
      <td class="summary-value">${visitas.length}</td>
      </tr>
      <tr>
      <td class="summary-label">Tempo Médio de Espera:</td>
      <td class="summary-value">${mediaTempoEspera} minutos</td>
      </tr>
      <tr>
      <td class="summary-label">Tempo Médio de Atendimento:</td>
      <td class="summary-value">${mediaTempoAtendimento} minutos</td>
      </tr>
      <tr>
      <td class="summary-label">Visitantes Aguardando:</td>
      <td class="summary-value">${statusCount.aguardando}</td>
      </tr>
      <tr>
      <td class="summary-label">Visitantes em Atendimento:</td>
      <td class="summary-value">${statusCount.atendimento}</td>
      </tr>
      <tr>
      <td class="summary-label">Visitantes Finalizados:</td>
      <td class="summary-value">${statusCount.finalizado}</td>
      </tr>
      </tbody>
      </table>
      </div>

      <!-- TABELA DETALHADA -->
      <div style="margin-top: 40px; page-break-before: always;">
      <div class="chart-title">DETALHAMENTO DE VISITAS</div>
      <table>
      <thead>
      <tr>
      ${headers.map(h => `<th class="header">${h}</th>`).join('')}
      </tr>
      </thead>
      <tbody>
      ${rows.map((row) => {
        let cellClass = 'cell';
        if (row[11].includes('AGUARDANDO')) {
          cellClass = 'cell cell-aguardando';
        } else if (row[11].includes('ATENDIMENTO')) {
          cellClass = 'cell cell-atendimento';
        } else {
          cellClass = 'cell cell-finalizado';
        }
        return `<tr>${row.map(cell =>
          `<td class="${cellClass}">${cell}</td>`
        ).join('')}</tr>`;
      }).join('')}
      </tbody>
      </table>
      </div>

      </body>
      </html>`;

    const blob = new Blob(['\ufeff' + htmlContent], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio_visitas_${dataInicio}_${dataFim}.xls`;
    link.click();
  };

  // Função para carregar scripts dinamicamente
  const loadScript = (src) => {
    return new Promise((resolve, reject) => {
      const existingScript = document.querySelector(`script[src="${src}"]`);
      if (existingScript) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = src;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Erro ao carregar ${src}`));
      document.body.appendChild(script);
    });
  };

  const exportarPDF = () => {
    alert('Funcionalidade de exportação para PDF será implementada em breve');
  };

  return (
    <div className="painel-relatorio">
      {/* Background com Imagem */}
      <div 
        className="relatorio-background"
        style={{ backgroundImage: `url(${imagemFundo})` }}
      />
      
      {/* Overlay */}
      <div className="relatorio-overlay"></div>
      
      {/* Conteúdo */}
      <div className="relatorio-content">
        <div className="relatorio-card">
          
          {/* Header */}
          <div className="relatorio-header">
            <div className="header-left">
              <div className="header-icon">
                <BarChart3 size={32} />
              </div>
              <div className="header-info">
                <h1>Relatórios e Estatísticas</h1>
                <p>Administrador • Análise de Visitas</p>
              </div>
            </div>
            <button className="btn-voltar" onClick={onVoltar}>
              <ArrowLeft size={20} />
              Voltar
            </button>
          </div>

          {/* Filtros Rápidos */}
          <div className="filtros-rapidos">
            <button 
              className={`filtro-btn ${filtroAtivo === 'hoje' ? 'active' : ''}`}
              onClick={() => aplicarFiltroRapido('hoje')}
            >
              📅 Hoje
            </button>
            <button 
              className={`filtro-btn ${filtroAtivo === 'ontem' ? 'active' : ''}`}
              onClick={() => aplicarFiltroRapido('ontem')}
            >
              📆 Ontem
            </button>
            <button 
              className={`filtro-btn ${filtroAtivo === 'semana' ? 'active' : ''}`}
              onClick={() => aplicarFiltroRapido('semana')}
            >
              📊 Esta Semana
            </button>
            <button 
              className={`filtro-btn ${filtroAtivo === 'mes' ? 'active' : ''}`}
              onClick={() => aplicarFiltroRapido('mes')}
            >
              📈 Este Mês
            </button>
            <button 
              className={`filtro-btn ${filtroAtivo === 'ano' ? 'active' : ''}`}
              onClick={() => aplicarFiltroRapido('ano')}
            >
              📋 Este Ano
            </button>
            
            <button className="btn-limpar-filtros" onClick={limparFiltros}>
              🔄 Limpar Filtros
            </button>
          </div>

          {/* Filtros Avançados */}
          <div className="filtros-avancados">
            <div className="filtro-item">
              <label>Data Início:</label>
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
              />
            </div>
            <div className="filtro-item">
              <label>Data Fim:</label>
              <input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
              />
            </div>
            <div className="filtro-item">
              <label>Departamento:</label>
              <select
                value={departamentoFiltro}
                onChange={(e) => setDepartamentoFiltro(e.target.value)}
              >
                <option value="todos">Todos</option>
                {departamentos.map(d => (
                  <option key={d.id} value={d.id}>{d.nome}</option>
                ))}
              </select>
            </div>
            <div className="filtro-item">
              <label>Status:</label>
              <select
                value={statusFiltro}
                onChange={(e) => setStatusFiltro(e.target.value)}
              >
                <option value="todos">Todos</option>
                <option value="aguardando">Aguardando</option>
                <option value="chamado">Em Atendimento</option>
                <option value="finalizado">Finalizado</option>
              </select>
            </div>
            <button className="btn-aplicar-filtros" onClick={aplicarFiltros}>
              Buscar
            </button>
          </div>

          {/* Cards de Estatísticas */}
          <div className="cards-estatisticas">
            <div className="card-stat card-azul">
              <div className="card-icon">👥</div>
              <div className="card-content">
                <h3>{estatisticas.total_visitas}</h3>
                <p>Total de Visitas</p>
              </div>
            </div>
            
            <div className="card-stat card-laranja">
              <div className="card-icon">⏳</div>
              <div className="card-content">
                <h3>{estatisticas.aguardando}</h3>
                <p>Aguardando</p>
              </div>
            </div>
            
            <div className="card-stat card-azul-claro">
              <div className="card-icon">📈</div>
              <div className="card-content">
                <h3>{estatisticas.em_atendimento}</h3>
                <p>Em Atendimento</p>
              </div>
            </div>
            
            <div className="card-stat card-verde">
              <div className="card-icon">📊</div>
              <div className="card-content">
                <h3>{estatisticas.finalizados}</h3>
                <p>Finalizados</p>
              </div>
            </div>
            
            <div className="card-stat card-amarelo">
              <div className="card-icon">⏱️</div>
              <div className="card-content">
                <h3>{estatisticas.tempo_medio_espera}</h3>
                <p>Tempo Médio Espera</p>
              </div>
            </div>
            
            <div className="card-stat card-roxo">
              <div className="card-icon">📋</div>
              <div className="card-content">
                <h3>{estatisticas.tempo_medio_atendimento}</h3>
                <p>Tempo Médio Atendimento</p>
              </div>
            </div>
          </div>

          {/* Botões de Exportação */}
          <div className="exportacao-header">
            <h3>
              <FileDown size={20} />
              Exportar Dados ({visitas.length} registros)
            </h3>
            <div className="exportacao-botoes">
              <button className="btn-export btn-csv" onClick={exportarCSV}>
                <Download size={18} />
                Exportar CSV
              </button>
              <button className="btn-export btn-pdf" onClick={exportarPDF}>
                <Download size={18} />
                Exportar PDF
              </button>
            </div>
          </div>

          {/* Tabela de Visitas */}
          <div className="tabela-container">
            <h3>Detalhamento de Visitas</h3>
            
            {carregando ? (
              <div className="loading">Carregando dados...</div>
            ) : visitas.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">👁️</div>
                <p>Nenhum registro encontrado para o período selecionado</p>
              </div>
            ) : (
              <table className="tabela-visitas">
                <thead>
                  <tr>
                    <th>DATA/HORA</th>
                    <th>VISITANTE</th>
                    <th>CPF</th>
                    <th>MOTIVO</th>
                    <th>DEPARTAMENTO</th>
                    <th>RESPONSÁVEL</th>
                    <th>TEMPO ESPERA</th>
                    <th>TEMPO ATEND.</th>
                    <th>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {visitas.map((visita) => (
                    <tr key={visita.id}>
                      <td>{formatarData(visita.data_entrada)}</td>
                      <td>{visita.visitante_nome || 'N/A'}</td>
                      <td>{formatarCPF(visita.visitante_cpf)}</td>
                      <td>{visita.motivo || '-'}</td>
                      <td>{visita.departamento_nome || 'N/A'}</td>
                      <td>{visita.responsavel_nome || 'N/A'}</td>
                      <td>{formatarTempo(visita.tempo_espera_minutos)}</td>
                      <td>{formatarTempo(visita.tempo_atendimento_minutos)}</td>
                      <td>
                        <span
                          className="status-badge"
                          style={{ backgroundColor: getStatusColor(visita.status) }}
                        >
                          {getStatusLabel(visita.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          
        </div>
      </div>
    </div>
  );
}