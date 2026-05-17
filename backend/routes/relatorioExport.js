const express = require('express');
const router  = express.Router();
const ExcelJS = require('exceljs');
const path    = require('path');

const LOGO_CONFEDERAL = path.join(__dirname, '..', 'assets', 'LOGO CONFEDERAL.jpg');
const LOGO_MAXIMA     = path.join(__dirname, '..', 'assets', 'LOGO MAXIMA.jpg');

router.post('/relatorios/exportar-excel', async (req, res) => {
  try {
    const { visitas, colunas, dataInicio, dataFim, periodoTexto, nomePreset, statusCount } = req.body;

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Sistema Recepção';
    const sheet = workbook.addWorksheet('Relatório de Visitas');

    sheet.pageSetup.orientation    = 'landscape';
    sheet.pageSetup.fitToPage      = true;
    sheet.pageSetup.fitToWidth     = 1;
    sheet.pageSetup.fitToHeight    = 0;
    sheet.pageSetup.printTitlesRow = '13:13';

    // +1 para acomodar a coluna de numeração na primeira posição
    const numCols = Math.max(3, colunas.length + 1);
    const C_STAT  = numCols;       // última coluna = DADOS
    const C_LABEL = numCols - 1;   // penúltima coluna = ESTATÍSTICAS / labels

    const estiloEscuro = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2C3E50' } };
    const estiloCinza  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFECF0F1' } };
    const bordaThin    = {
      top:    { style: 'thin', color: { argb: 'FF000000' } },
      left:   { style: 'thin', color: { argb: 'FF000000' } },
      bottom: { style: 'thin', color: { argb: 'FF000000' } },
      right:  { style: 'thin', color: { argb: 'FF000000' } },
    };
    const fontBranca = (bold = false, size = 11) => ({ name: 'Calibri', size, bold, color: { argb: 'FFFFFFFF' } });
    const fontPreta  = (bold = false, size = 11) => ({ name: 'Calibri', size, bold, color: { argb: 'FF000000' } });

    const setCelula = (row, col, valor, font, fill = null, align = { horizontal: 'left', vertical: 'middle' }, wrap = true) => {
      const cell = sheet.getCell(row, col);
      cell.value     = valor;
      cell.font      = font;
      cell.border    = bordaThin;
      cell.alignment = { ...align, wrapText: wrap };
      if (fill) cell.fill = fill;
    };

    const mesclar = (r1, c1, r2, c2) => {
      try { sheet.mergeCells(r1, c1, r2, c2); } catch(e) {}
    };

    // ============================================================
    // ESQUERDA: Nome das empresas (mesclados em A:C) + logos
    // ============================================================

    // Linha 1: Nome Confederal (A:C) — mesclado nas 3 primeiras colunas
    mesclar(1, 1, 1, 3);
    setCelula(1, 1, 'CONFEDERAL VIGILÂNCIA E TRANSPORTE DE VALORES LTDA', fontPreta(true), null, { horizontal: 'center', vertical: 'middle' }, false);
    sheet.getRow(1).height = 20; sheet.getRow(1).commit();

    // Linha 2: Nome Maxima (A:C)
    mesclar(2, 1, 2, 3);
    setCelula(2, 1, 'MÁXIMA FACILITY E SOLUÇÕES LTDA', fontPreta(true), null, { horizontal: 'center', vertical: 'middle' }, false);
    sheet.getRow(2).height = 20; sheet.getRow(2).commit();

    // Linhas 3-12: altura para logos
    for (let r = 3; r <= 12; r++) {
      sheet.getRow(r).height = 18;
    }

    // Logo Confederal (coluna B, linhas 3-12)  → nativeCol = 1
    try {
      const imgConfederal = workbook.addImage({ filename: LOGO_CONFEDERAL, extension: 'jpeg' });
      sheet.addImage(imgConfederal, {
        tl: { nativeCol: 1, nativeColOff: 114300, nativeRow: 3, nativeRowOff: 0 },
        ext: { width: 89, height: 94 },
        editAs: 'oneCell',
      });
    } catch(e) { console.warn('Logo Confederal não encontrada:', e.message); }

    // Logo Maxima (coluna C, linhas 3-12)  → nativeCol = 2
    try {
      const imgMaxima = workbook.addImage({ filename: LOGO_MAXIMA, extension: 'jpeg' });
      sheet.addImage(imgMaxima, {
        tl: { nativeCol: 2, nativeColOff: 119063, nativeRow: 3, nativeRowOff: 0 },
        ext: { width: 88, height: 79 },
        editAs: 'oneCell',
      });
    } catch(e) { console.warn('Logo Maxima não encontrada:', e.message); }

    // ============================================================
    // DIREITA (últimas 2 colunas): PERIODO + ESTATÍSTICAS
    // ============================================================

    // PERIODO
    mesclar(1, C_LABEL, 1, C_STAT);
    setCelula(1, C_LABEL, 'PERIODO', fontBranca(true), estiloEscuro, { horizontal: 'center', vertical: 'middle' });

    setCelula(2, C_LABEL, 'Período:',    fontPreta(true),  estiloCinza, { horizontal: 'left',   vertical: 'middle' });
    setCelula(2, C_STAT,  periodoTexto,  fontPreta(false), estiloCinza, { horizontal: 'center', vertical: 'middle' });

    setCelula(3, C_LABEL, 'Data Início:', fontPreta(true),  estiloCinza, { horizontal: 'left',   vertical: 'middle' });
    setCelula(3, C_STAT,  dataInicio,     fontPreta(false), estiloCinza, { horizontal: 'center', vertical: 'middle' });

    setCelula(4, C_LABEL, 'Data Fim:',   fontPreta(true),  estiloCinza, { horizontal: 'left',   vertical: 'middle' });
    setCelula(4, C_STAT,  dataFim,        fontPreta(false), estiloCinza, { horizontal: 'center', vertical: 'middle' });

    setCelula(5, C_LABEL, 'Modelo:',     fontPreta(true),  estiloCinza, { horizontal: 'left',   vertical: 'middle' });
    setCelula(5, C_STAT,  nomePreset,     fontPreta(false), estiloCinza, { horizontal: 'center', vertical: 'middle' });

    // linha em branco
    sheet.getRow(6).commit();

    // ESTATÍSTICAS
    setCelula(7, C_LABEL, 'ESTATÍSTICAS', fontBranca(true), estiloEscuro, { horizontal: 'center', vertical: 'middle' });
    setCelula(7, C_STAT,  'DADOS',        fontBranca(true), estiloEscuro, { horizontal: 'center', vertical: 'middle' });
    sheet.getRow(7).height = 20; sheet.getRow(7).commit();

    [
      ['Total de Registros:', visitas.length],
      ['Aguardando:',         statusCount.aguardando],
      ['Em Atendimento:',     statusCount.atendimento],
      ['Finalizados:',        statusCount.finalizado],
    ].forEach(([label, val], i) => {
      const r = 8 + i;
      setCelula(r, C_LABEL, label, fontPreta(true),  estiloCinza, { horizontal: 'left',   vertical: 'middle' });
      setCelula(r, C_STAT,  val,   fontPreta(true),  estiloCinza, { horizontal: 'center', vertical: 'middle' });
      sheet.getRow(r).commit();
    });

    // ============================================================
    // CABEÇALHO DAS COLUNAS (linha 13)
    // ============================================================

    // Coluna Nº na primeira posição
    setCelula(13, 1, 'Nº', fontBranca(true, 9), estiloEscuro, { horizontal: 'center', vertical: 'middle', wrapText: true });

    // Colunas dinâmicas (deslocadas em 1)
    colunas.forEach((col, i) => {
      setCelula(13, i + 2, col.excelLabel, fontBranca(true, 9), estiloEscuro, { horizontal: 'center', vertical: 'middle', wrapText: true });
    });
    sheet.getRow(13).height = 20; sheet.getRow(13).commit();

    // ============================================================
    // LINHAS DE DADOS (linha 14+)
    // ============================================================
    let L = 14;
    visitas.forEach((v, idx) => {
      const statusVal = v.status === 'aguardando' ? 'AGUARDANDO'
                      : v.status === 'chamado'    ? 'EM ATENDIMENTO'
                      : 'FINALIZADO';
      const bgArgb = statusVal === 'AGUARDANDO'     ? 'FFFFF3CD'
                   : statusVal === 'EM ATENDIMENTO' ? 'FFCFE2FF'
                   : 'FFD1E7DD';
      const bgFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } };

      // Número sequencial na primeira coluna
      setCelula(L, 1, idx + 1, fontPreta(true, 9), bgFill, { horizontal: 'center', vertical: 'middle' });

      // Dados das outras colunas
      colunas.forEach((col, i) => {
        const val = col.key === 'status' ? statusVal : (v[col.key] ?? '-');
        setCelula(L, i + 2, String(val), fontPreta(false, 9), bgFill, { horizontal: 'center', vertical: 'middle', wrapText: true });
      });
      sheet.getRow(L).commit(); L++;
    });

    // ============================================================
    // AJUSTA LARGURA DAS COLUNAS
    // ============================================================

    // Coluna Nº (A) — largura fixa pequena
    sheet.getColumn(1).width = 6;

    // Garantir que as colunas B e C tenham largura suficiente para os logos
    // e para o nome da empresa não ficar cortado
    const LARGURA_MINIMA_LOGOS = 20;

    // Demais colunas começam em c = 2
    for (let c = 2; c <= numCols; c++) {
      const col = sheet.getColumn(c);
      const colKey = colunas[c - 2]?.key; // -2 porque a coluna 1 é o Nº
      let maxLen = 10;
      col.eachCell({ includeEmpty: false }, cell => {
        const len = cell.value ? String(cell.value).length : 0;
        if (len > maxLen) maxLen = len;
      });

      let larguraCalculada;
      if      (colKey === 'matricula')  larguraCalculada = 12;
      else if (colKey === 'hrChegada')  larguraCalculada = 12;
      else if (colKey === 'hrChamada')  larguraCalculada = 12;
      else if (colKey === 'hrSaida')    larguraCalculada = 12;
      else if (colKey === 'tempoTotal') larguraCalculada = 13;
      else if (colKey === 'data')       larguraCalculada = 13;
      else if (colKey === 'status')     larguraCalculada = 16;
      else larguraCalculada = Math.min(maxLen + 2, 40);

      // Para colunas 2 e 3 (que ficam embaixo dos nomes das empresas),
      // garantir largura mínima para que o nome longo não fique cortado
      if (c === 2 || c === 3) {
        larguraCalculada = Math.max(larguraCalculada, LARGURA_MINIMA_LOGOS);
      }

      col.width = larguraCalculada;
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="relatorio_visitas_${dataInicio}_${dataFim}.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();

  } catch (e) {
    console.error('Erro ao gerar Excel:', e);
    res.status(500).json({ erro: e.message });
  }
});

module.exports = router;