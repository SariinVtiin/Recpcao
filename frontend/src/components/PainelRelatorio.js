import React, { useState, useEffect } from 'react';
import { BarChart3, Download, FileDown, Filter, ArrowLeft } from 'lucide-react';
import './PainelRelatorio.css';
import confederal from '../assets/confederal.png';


export default function PainelRelatorio({ usuario, onVoltar }) {  // ADICIONAR usuario AQUI
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
  const [filtroAtivo, setFiltroAtivo] = useState('hoje');

  // Função para obter o label do perfil
  const getPerfilLabel = () => {
    const perfis = {
      administrador: 'Administrador',
      relatorio: 'Analista de Relatórios'
    };
    return perfis[usuario?.perfil] || 'Usuário';
  };

  // useEffect com validação de acesso
  useEffect(() => {
    // Validação de acesso
    if (usuario && usuario.perfil !== 'administrador' && usuario.perfil !== 'relatorio') {
      alert('⚠️ Acesso negado! Você não tem permissão para acessar relatórios.');
      onVoltar();
      return;
    }
    
    buscarDepartamentos();
    aplicarFiltroRapido('hoje');
  }, []);

  const buscarDepartamentos = async () => {
    try {
      const response = await fetch('http://192.167.1.255:3001/api/departamentos');
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
    setFiltroAtivo(periodo);
    buscarRelatorios(inicio, fim, departamentoFiltro, statusFiltro);
  };

  const buscarRelatorios = async (inicio, fim, depto, status) => {
    if (!inicio || !fim) {
      console.log('Datas não definidas');
      return;
    }

    setCarregando(true);
    try {
      let urlVisitas = `http://192.167.1.255:3001/api/relatorios/visitas?data_inicio=${inicio}&data_fim=${fim}`;
      if (depto && depto !== 'todos') {
        urlVisitas += `&departamento_id=${depto}`;
      }
      if (status && status !== 'todos') {
        urlVisitas += `&status=${status}`;
      }

      const resVisitas = await fetch(urlVisitas);
      const dataVisitas = await resVisitas.json();
      
      setVisitas(dataVisitas);

      let urlStats = `http://192.167.1.255:3001/api/relatorios/estatisticas?data_inicio=${inicio}&data_fim=${fim}`;
      if (depto && depto !== 'todos') {
        urlStats += `&departamento_id=${depto}`;
      }
      if (status && status !== 'todos') {
        urlStats += `&status=${status}`;
      }

      const resStats = await fetch(urlStats);
      const dataStats = await resStats.json();
      
      setEstatisticas(dataStats);
    } catch (error) {
      console.error('Erro ao buscar relatórios:', error);
    } finally {
      setCarregando(false);
    }
  };

  const aplicarFiltros = () => {
    setFiltroAtivo(null);
    buscarRelatorios(dataInicio, dataFim, departamentoFiltro, statusFiltro);
  };

  const limparFiltros = () => {
    setDepartamentoFiltro('todos');
    setStatusFiltro('todos');
    aplicarFiltroRapido('hoje');
  };

  // Busca o campo com diferentes nomes possíveis
  const obterCampo = (visita, ...possiveisNomes) => {
    for (const nome of possiveisNomes) {
      if (visita[nome] !== undefined && visita[nome] !== null) {
        return visita[nome];
      }
    }
    return null;
  };

  // Formatar apenas a DATA: DD/MM/YYYY
  const formatarData = (dataString) => {
    if (!dataString) return '-';
    
    try {
      const data = new Date(dataString);
      if (isNaN(data.getTime())) return '-';
      
      const dia = String(data.getDate()).padStart(2, '0');
      const mes = String(data.getMonth() + 1).padStart(2, '0');
      const ano = data.getFullYear();
      
      return `${dia}/${mes}/${ano}`;
    } catch (error) {
      return '-';
    }
  };

  // Formatar apenas a HORA: HH:MM:SS
  const formatarHora = (dataString) => {
    if (!dataString) return '-';
    
    try {
      const data = new Date(dataString);
      if (isNaN(data.getTime())) return '-';
      
      const hora = String(data.getHours()).padStart(2, '0');
      const minuto = String(data.getMinutes()).padStart(2, '0');
      const segundo = String(data.getSeconds()).padStart(2, '0');
      
      return `${hora}:${minuto}:${segundo}`;
    } catch (error) {
      return '-';
    }
  };

  const formatarCPF = (cpf) => {
    if (!cpf) return '-';
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  // Calcular tempo total em minutos
  const calcularTempoTotal = (horaChegada, horaSaida) => {
    if (!horaChegada || !horaSaida) return '-';
    
    try {
      const chegada = new Date(horaChegada);
      const saida = new Date(horaSaida);
      
      if (isNaN(chegada.getTime()) || isNaN(saida.getTime())) return '-';
      
      const diferencaMs = saida - chegada;
      const minutos = Math.floor(diferencaMs / 60000);
      
      if (minutos < 0) return '-';
      
      const horas = Math.floor(minutos / 60);
      const mins = minutos % 60;
      
      if (horas > 0) {
        return `${horas}h ${mins}min`;
      }
      return `${mins}min`;
    } catch (error) {
      return '-';
    }
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

    const dataInicioFormatada = dataInicio ? new Date(dataInicio + 'T00:00:00').toLocaleDateString('pt-BR') : '-';
    const dataFimFormatada = dataFim ? new Date(dataFim + 'T00:00:00').toLocaleDateString('pt-BR') : '-';

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

    const statusCount = {
      aguardando: visitas.filter(v => v.status === 'aguardando').length,
      atendimento: visitas.filter(v => v.status === 'chamado').length,
      finalizado: visitas.filter(v => v.status === 'finalizado').length
    };

    const headers = [
      'ID',
      'VISITANTE',
      'CPF',
      'MATRÍCULA',
      'MOTIVO',
      'SETOR',
      'RESPONSAVEL',
      'DATA',
      'Hr-Chegada',
      'Hr-Chamada',
      'Hr-Saída',
      'TEMPO TOTAL',
    ];

    const rows = visitas.map(v => {
      const horaChegada = obterCampo(v, 'hora_chegada', 'data_entrada', 'data_chegada', 'created_at');
      const horaChamada = obterCampo(v, 'hora_chamada', 'data_chamada', 'chamado_em');
      const horaSaida = obterCampo(v, 'hora_saida', 'data_saida', 'finalizado_em');

      return [
        v.id || '-',
        v.visitante_nome || '-',
        v.visitante_cpf ? `'${v.visitante_cpf}` : '-',
        v.visitante_matricula ? `'${v.visitante_matricula}` : '-',
        v.motivo || '-',
        v.departamento_nome || '-',
        v.responsavel_nome || '-',
        formatarData(horaChegada),
        formatarHora(horaChegada),
        formatarHora(horaChamada),
        formatarHora(horaSaida),
        calcularTempoTotal(horaChegada, horaSaida),
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
        const statusCell = row[row.length - 1];
        if (statusCell.includes('AGUARDANDO')) {
          cellClass = 'cell cell-aguardando';
        } else if (statusCell.includes('ATENDIMENTO')) {
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

  const exportarPDF = () => {
    alert('Funcionalidade de exportação para PDF será implementada em breve');
  };

  return (
    <div className="painel-relatorio">
      <div className="relatorio-background"
        style={{ backgroundImage: `url(${confederal})` }}
      ></div>
      <div className="relatorio-overlay"></div>
      
      <div className="relatorio-content">
        <div className="relatorio-card">
          
          <div className="relatorio-header">
            <div className="header-left">
              <div className="header-icon">
                <BarChart3 size={32} />
              </div>
              <div className="header-info">
                <h1>Relatórios e Estatísticas</h1>
                <p>{getPerfilLabel()} • Análise de Visitas</p>
              </div>
            </div>
            <button className="btn-voltar" onClick={onVoltar}>
              <ArrowLeft size={20} />
              Voltar
            </button>
          </div>

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

          <div className="exportacao-header">
            <h3>
              <FileDown size={20} />
              Exportar Dados ({visitas.length} registros)
            </h3>
            <div className="exportacao-botoes">
              <button className="btn-export btn-csv" onClick={exportarCSV}>
                <Download size={18} />
                Exportar Excel
              </button>
              <button className="btn-export btn-pdf" onClick={exportarPDF}>
                <Download size={18} />
                Exportar PDF
              </button>
            </div>
          </div>

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
                    <th>ID</th>
                    <th>VISITANTE</th>
                    <th>CPF</th>
                    <th>MOTIVO</th>
                    <th>DEPARTAMENTO</th>
                    <th>RESPONSÁVEL</th>
                    <th>DATA</th>
                    <th>HORA CHEGADA</th>
                    <th>HORA CHAMADA</th>
                    <th>HORA SAÍDA</th>
                    <th>TEMPO TOTAL</th>
                    <th>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {visitas.map((visita) => {
                    const horaChegada = obterCampo(visita, 'hora_chegada', 'data_entrada', 'data_chegada', 'created_at');
                    const horaChamada = obterCampo(visita, 'hora_chamada', 'data_chamada', 'chamado_em');
                    const horaSaida = obterCampo(visita, 'hora_saida', 'data_saida', 'finalizado_em');

                    return (
                      <tr key={visita.id}>
                        <td>{visita.id}</td>
                        <td>{visita.visitante_nome || '-'}</td>
                        <td>{formatarCPF(visita.visitante_cpf)}</td>
                        <td>{visita.motivo || '-'}</td>
                        <td>{visita.departamento_nome || '-'}</td>
                        <td>{visita.responsavel_nome || '-'}</td>
                        <td>{formatarData(horaChegada)}</td>
                        <td>{formatarHora(horaChegada)}</td>
                        <td>{formatarHora(horaChamada)}</td>
                        <td>{formatarHora(horaSaida)}</td>
                        <td>{calcularTempoTotal(horaChegada, horaSaida)}</td>
                        <td>
                          <span
                            className="status-badge"
                            style={{ backgroundColor: getStatusColor(visita.status) }}
                          >
                            {getStatusLabel(visita.status)}
                          </span>
                        </td>
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