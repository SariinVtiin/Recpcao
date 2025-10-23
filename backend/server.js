// ============================================
// SERVER.JS - Sistema de Recepção Empresarial
// Backend: Node.js + Express + MySQL
// Fluxo: aguardando → chamado → finalizado
// ============================================

const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');

const app = express();
const port = 3001;

// ============================================
// CONFIGURAÇÃO DO POOL DE CONEXÕES MYSQL
// ============================================
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'frd@ConfeMax@2025',
  database: 'sistema_chamadas',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: '-03:00'
});

// ============================================
// MIDDLEWARES
// ============================================
app.use(cors());
app.use(express.json());

// Logger de requisições
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ============================================
// ROTA: Status do Servidor e Banco
// ============================================
app.get('/api/status', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT COUNT(*) as total FROM usuarios');
    res.json({ 
      status: 'online', 
      message: 'Servidor e banco de dados conectados',
      usuarios: rows[0].total,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Erro na conexão:', err);
    res.status(500).json({ 
      status: 'error', 
      message: 'Erro na conexão com o banco de dados' 
    });
  }
});

// ============================================
// AUTENTICAÇÃO - RF006
// ============================================

/**
 * POST /api/auth/login
 * RF006 - Controle de Acesso
 * RF007 - Perfis de Usuário
 */
app.post('/api/auth/login', async (req, res) => {
  const { usuario, senha } = req.body;
  
  console.log('=== TENTATIVA DE LOGIN ===');
  console.log('Usuário recebido:', usuario);
  console.log('Senha recebida:', senha);
  console.log('Body completo:', req.body);
  
  // Validação básica
  if (!usuario || !senha) {
    console.log('❌ Validação falhou: campos vazios');
    return res.status(400).json({ 
      error: 'Usuário e senha são obrigatórios' 
    });
  }

  try {
    const [rows] = await pool.query(
      `SELECT 
        u.id, 
        u.nome, 
        u.login, 
        u.perfil,
        u.departamento_id,
        u.ativo,
        d.nome as departamento_nome
      FROM usuarios u
      LEFT JOIN departamentos d ON u.departamento_id = d.id
      WHERE u.login = ? AND u.senha = ?`,
      [usuario, senha]
    );

    console.log('Registros encontrados:', rows.length);
    
    if (rows.length > 0) {
      console.log('Usuário encontrado:', rows[0].login);
      console.log('Ativo?', rows[0].ativo);
    }

    if (rows.length === 0) {
      console.log('❌ Login falhou: usuário/senha incorretos');
      return res.status(401).json({ 
        error: 'Usuário ou senha inválidos' 
      });
    }

    const user = rows[0];
    
    // Verifica se está ativo
    if (user.ativo !== 1) {
      console.log('❌ Login falhou: usuário inativo');
      return res.status(401).json({ 
        error: 'Usuário inativo' 
      });
    }
    
    // Log de acesso
    console.log(`✅ Login bem-sucedido: ${user.nome} (${user.perfil})`);

    res.json({
      id: user.id,
      nome: user.nome,
      login: user.login,
      perfil: user.perfil,
      departamento_id: user.departamento_id,
      departamento_nome: user.departamento_nome,
      tipo_acesso: user.perfil
    });
  } catch (err) {
    console.error('❌ Erro ao fazer login:', err);
    res.status(500).json({ error: 'Erro ao processar login' });
  }
});

// ============================================
// VISITANTES - RF001
// ============================================

/**
 * GET /api/visitantes
 * Lista todos os visitantes cadastrados
 */
app.get('/api/visitantes', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT 
        id, 
        nome, 
        cpf, 
        DATE_FORMAT(data_cadastro, '%d/%m/%Y %H:%i') as data_cadastro,
        ativo
      FROM visitantes 
      WHERE ativo = 1
      ORDER BY nome ASC`
    );
    res.json(rows);
  } catch (err) {
    console.error('Erro ao listar visitantes:', err);
    res.status(500).json({ error: 'Erro ao listar visitantes' });
  }
});

/**
 * GET /api/visitantes/:cpf
 * Busca visitante por CPF
 */
app.get('/api/visitantes/:cpf', async (req, res) => {
  const { cpf } = req.params;
  
  try {
    const [rows] = await pool.query(
      'SELECT * FROM visitantes WHERE cpf = ?',
      [cpf.replace(/\D/g, '')]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Visitante não encontrado' });
    }
    
    res.json(rows[0]);
  } catch (err) {
    console.error('Erro ao buscar visitante:', err);
    res.status(500).json({ error: 'Erro ao buscar visitante' });
  }
});

// ============================================
// VISITAS - RF001, RF002, RF003, RF005
// ============================================

/**
 * POST /api/visitas
 * RF001 - Cadastro de Visitantes
 * Usa a stored procedure sp_registrar_visita
 */
app.post('/api/visitas', async (req, res) => {
  const { nome, cpf, departamento_id, motivo, observacao, usuario_id } = req.body;
  
  // Validação
  if (!nome || !cpf || !departamento_id) {
    return res.status(400).json({ 
      error: 'Nome, CPF e departamento são obrigatórios' 
    });
  }

  try {
    // Remove formatação do CPF
    const cpfLimpo = cpf.replace(/\D/g, '');
    
    // Valida CPF (11 dígitos)
    if (cpfLimpo.length !== 11) {
      return res.status(400).json({ error: 'CPF inválido' });
    }

    // Valida se usuario_id existe (se fornecido)
    let usuarioIdValido = null;
    if (usuario_id) {
      const [usuarioExiste] = await pool.query(
        'SELECT id FROM usuarios WHERE id = ? AND ativo = 1',
        [usuario_id]
      );
      
      if (usuarioExiste.length > 0) {
        usuarioIdValido = usuario_id;
      }
    }

    // Chama a stored procedure
    const [result] = await pool.query(
      `CALL sp_registrar_visita(?, ?, ?, ?, ?, ?, @visita_id, @visitante_id)`,
      [cpfLimpo, nome, departamento_id, motivo, observacao, usuarioIdValido]
    );

    // Busca os IDs retornados
    const [ids] = await pool.query('SELECT @visita_id as visita_id, @visitante_id as visitante_id');
    
    // Busca a visita completa
    const [visita] = await pool.query(
      'SELECT * FROM visitas_completas WHERE visita_id = ?',
      [ids[0].visita_id]
    );

    console.log(`Nova visita registrada: ${nome} -> ${visita[0].departamento_nome}`);

    res.status(201).json(visita[0]);
  } catch (err) {
    console.error('Erro ao registrar visita:', err);
    res.status(500).json({ error: 'Erro ao registrar visita' });
  }
});

/**
 * GET /api/visitas
 * RF005 - Histórico de Visitas
 * RF009 - Relatórios e Consultas
 */
app.get('/api/visitas', async (req, res) => {
  const { status, departamento_id, data_inicio, data_fim, cpf } = req.query;
  
  try {
    let query = 'SELECT * FROM visitas_completas WHERE 1=1';
    const params = [];

    // Filtros opcionais
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    if (departamento_id) {
      query += ' AND departamento_id = ?';
      params.push(departamento_id);
    }

    if (cpf) {
      query += ' AND visitante_cpf = ?';
      params.push(cpf.replace(/\D/g, ''));
    }

    if (data_inicio && data_fim) {
      query += ' AND DATE(hora_chegada) BETWEEN ? AND ?';
      params.push(data_inicio, data_fim);
    }

    query += ' ORDER BY hora_chegada DESC LIMIT 100';

    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('Erro ao buscar visitas:', err);
    res.status(500).json({ error: 'Erro ao buscar visitas' });
  }
});

/**
 * GET /api/visitas/aguardando/:departamento_id
 * RF002 - Consulta de Visitantes em Espera
 */
app.get('/api/visitas/aguardando/:departamento_id', async (req, res) => {
  const { departamento_id } = req.params;
  
  try {
    const [rows] = await pool.query(
      `SELECT * FROM visitas_completas 
      WHERE status = 'aguardando' 
      AND departamento_id = ?
      ORDER BY hora_chegada ASC`,
      [departamento_id]
    );
    res.json(rows);
  } catch (err) {
    console.error('Erro ao buscar visitas aguardando:', err);
    res.status(500).json({ error: 'Erro ao buscar visitas' });
  }
});

/**
 * GET /api/visitas/chamados/:departamento_id
 * Busca visitas com status 'chamado' para um departamento
 * Ordenado por hora_chamada DESC (mais recente primeiro)
 */
app.get('/api/visitas/chamados/:departamento_id', async (req, res) => {
  const { departamento_id } = req.params;
  
  try {
    const [rows] = await pool.query(
      `SELECT * FROM visitas_completas 
      WHERE status = 'chamado' 
      AND departamento_id = ?
      ORDER BY hora_chamada DESC`,
      [departamento_id]
    );
    res.json(rows);
  } catch (err) {
    console.error('Erro ao buscar visitas chamados:', err);
    res.status(500).json({ error: 'Erro ao buscar visitas' });
  }
});

/**
 * GET /api/visitas/ultima
 * RF003 - Chamada de Visitante
 * RF004 - Atualização Automática (para o painel)
 * Retorna a última visita chamada
 */
app.get('/api/visitas/ultima', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM visitas_completas 
      WHERE status = 'chamado'
        AND hora_chamada IS NOT NULL
      ORDER BY hora_chamada DESC 
      LIMIT 1`
    );
    
    res.json(rows[0] || null);
  } catch (err) {
    console.error('Erro ao buscar última chamada:', err);
    res.status(500).json({ error: 'Erro ao buscar última chamada' });
  }
});

/**
 * PUT /api/visitas/:id/chamar
 * RF003 - Chamada de Visitante
 * Atualiza status para 'chamado' (em atendimento)
 */
app.put('/api/visitas/:id/chamar', async (req, res) => {
  const { id } = req.params;
  
  try {
    console.log(`Tentando chamar visita ID: ${id}`);
    
    // Atualiza status para 'chamado'
    const [result] = await pool.query(
      `UPDATE visitas 
      SET status = 'chamado', hora_chamada = NOW()
      WHERE id = ? AND status = 'aguardando'`,
      [id]
    );

    console.log(`Linhas afetadas: ${result.affectedRows}`);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Visita não encontrada ou já foi chamada' });
    }

    // Busca a visita atualizada
    const [rows] = await pool.query(
      'SELECT * FROM visitas_completas WHERE visita_id = ?',
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Visita não encontrada após atualização' });
    }

    console.log(`Chamada realizada: ${rows[0].visitante_nome}`);

    res.json(rows[0]);
  } catch (err) {
    console.error('Erro ao chamar visitante:', err);
    res.status(500).json({ error: 'Erro ao chamar visitante: ' + err.message });
  }
});

/**
 * PUT /api/visitas/:id/finalizar
 * RF008 - Encerramento de Atendimento
 * Finaliza o atendimento (chamado → finalizado)
 */
app.put('/api/visitas/:id/finalizar', async (req, res) => {
  const { id } = req.params;
  
  try {
    console.log(`Tentando finalizar visita ID: ${id}`);
    
    // Atualiza status para 'finalizado'
    const [result] = await pool.query(
      `UPDATE visitas 
      SET status = 'finalizado', hora_saida = NOW()
      WHERE id = ? AND status = 'chamado'`,
      [id]
    );

    console.log(`Linhas afetadas: ${result.affectedRows}`);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Visita não encontrada ou não está em atendimento' });
    }

    // Busca a visita atualizada
    const [rows] = await pool.query(
      'SELECT * FROM visitas_completas WHERE visita_id = ?',
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Visita não encontrada após finalização' });
    }

    console.log(`Atendimento finalizado: ${rows[0].visitante_nome}`);

    res.json(rows[0]);
  } catch (err) {
    console.error('Erro ao finalizar atendimento:', err);
    res.status(500).json({ error: 'Erro ao finalizar atendimento: ' + err.message });
  }
});

/**
 * PUT /api/visitas/:id/rechamar
 * Rechamar visitante - volta do 'chamado' para 'aguardando'
 */
app.put('/api/visitas/:id/rechamar', async (req, res) => {
  const { id } = req.params;
  
  try {
    console.log(`Tentando rechamar visita ID: ${id}`);
    
    // Volta status para 'aguardando' e limpa hora_chamada
    const [result] = await pool.query(
      `UPDATE visitas 
      SET status = 'aguardando', hora_chamada = NULL
      WHERE id = ? AND status = 'chamado'`,
      [id]
    );

    console.log(`Linhas afetadas: ${result.affectedRows}`);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Visita não encontrada ou não está em atendimento' });
    }

    // Busca a visita atualizada
    const [rows] = await pool.query(
      'SELECT * FROM visitas_completas WHERE visita_id = ?',
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Visita não encontrada após rechamada' });
    }

    console.log(`Visitante rechamado: ${rows[0].visitante_nome}`);

    res.json(rows[0]);
  } catch (err) {
    console.error('Erro ao rechamar visitante:', err);
    res.status(500).json({ error: 'Erro ao rechamar visitante: ' + err.message });
  }
});

/**
 * DELETE /api/visitas/:id
 * RF010 - Edição e Cancelamento de Registros
 */
app.delete('/api/visitas/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    // Verifica se a visita existe e não foi finalizada
    const [visita] = await pool.query(
      'SELECT status FROM visitas WHERE id = ?',
      [id]
    );

    if (visita.length === 0) {
      return res.status(404).json({ error: 'Visita não encontrada' });
    }

    if (visita[0].status === 'finalizado') {
      return res.status(400).json({ 
        error: 'Não é possível cancelar visita já finalizada' 
      });
    }

    await pool.query('DELETE FROM visitas WHERE id = ?', [id]);
    
    console.log(`Visita cancelada: ID ${id}`);

    res.json({ message: 'Visita cancelada com sucesso' });
  } catch (err) {
    console.error('Erro ao cancelar visita:', err);
    res.status(500).json({ error: 'Erro ao cancelar visita' });
  }
});

// ============================================
// USUÁRIOS - CRUD (Apenas Administradores)
// ============================================

/**
 * GET /api/usuarios
 * Lista todos os usuários
 */
app.get('/api/usuarios', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        u.id,
        u.nome,
        u.login,
        u.perfil,
        u.departamento_id,
        d.nome as departamento_nome,
        u.ativo,
        u.created_at
      FROM usuarios u
      LEFT JOIN departamentos d ON u.departamento_id = d.id
      ORDER BY u.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('Erro ao listar usuários:', err);
    res.status(500).json({ error: 'Erro ao listar usuários' });
  }
});

/**
 * POST /api/usuarios
 * Criar novo usuário
 */
app.post('/api/usuarios', async (req, res) => {
  const { nome, login, senha, perfil, departamento_id } = req.body;
  
  // Validação
  if (!nome || !login || !senha || !perfil) {
    return res.status(400).json({ 
      error: 'Nome, login, senha e perfil são obrigatórios' 
    });
  }

  // Validar perfil
  const perfisValidos = ['recepcionista', 'departamento', 'painel', 'administrador'];
  if (!perfisValidos.includes(perfil)) {
    return res.status(400).json({ error: 'Perfil inválido' });
  }

  try {
    // Verificar se login já existe
    const [existe] = await pool.query(
      'SELECT id FROM usuarios WHERE login = ?',
      [login]
    );

    if (existe.length > 0) {
      return res.status(400).json({ error: 'Login já existe' });
    }

    // Criar usuário
    const [result] = await pool.query(
      `INSERT INTO usuarios (nome, login, senha, perfil, departamento_id, ativo) 
       VALUES (?, ?, ?, ?, ?, 1)`,
      [nome, login, senha, perfil, departamento_id || null]
    );

    // Buscar usuário criado
    const [usuario] = await pool.query(
      `SELECT 
        u.id, u.nome, u.login, u.perfil, u.departamento_id,
        d.nome as departamento_nome, u.ativo
       FROM usuarios u
       LEFT JOIN departamentos d ON u.departamento_id = d.id
       WHERE u.id = ?`,
      [result.insertId]
    );

    console.log(`Novo usuário criado: ${nome} (${login})`);

    res.status(201).json(usuario[0]);
  } catch (err) {
    console.error('Erro ao criar usuário:', err);
    res.status(500).json({ error: 'Erro ao criar usuário' });
  }
});

/**
 * PUT /api/usuarios/:id
 * Atualizar usuário
 */
app.put('/api/usuarios/:id', async (req, res) => {
  const { id } = req.params;
  const { nome, login, senha, perfil, departamento_id, ativo } = req.body;

  try {
    // Verificar se usuário existe
    const [usuarioExiste] = await pool.query(
      'SELECT id FROM usuarios WHERE id = ?',
      [id]
    );

    if (usuarioExiste.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Verificar se login já está em uso por outro usuário
    if (login) {
      const [loginEmUso] = await pool.query(
        'SELECT id FROM usuarios WHERE login = ? AND id != ?',
        [login, id]
      );

      if (loginEmUso.length > 0) {
        return res.status(400).json({ error: 'Login já está em uso' });
      }
    }

    // Construir query de atualização dinamicamente
    const campos = [];
    const valores = [];

    if (nome !== undefined) {
      campos.push('nome = ?');
      valores.push(nome);
    }
    if (login !== undefined) {
      campos.push('login = ?');
      valores.push(login);
    }
    if (senha !== undefined && senha.trim() !== '') {
      campos.push('senha = ?');
      valores.push(senha);
    }
    if (perfil !== undefined) {
      campos.push('perfil = ?');
      valores.push(perfil);
    }
    if (departamento_id !== undefined) {
      campos.push('departamento_id = ?');
      valores.push(departamento_id || null);
    }
    if (ativo !== undefined) {
      campos.push('ativo = ?');
      valores.push(ativo ? 1 : 0);
    }

    if (campos.length === 0) {
      return res.status(400).json({ error: 'Nenhum campo para atualizar' });
    }

    valores.push(id);

    await pool.query(
      `UPDATE usuarios SET ${campos.join(', ')} WHERE id = ?`,
      valores
    );

    // Buscar usuário atualizado
    const [usuario] = await pool.query(
      `SELECT 
        u.id, u.nome, u.login, u.perfil, u.departamento_id,
        d.nome as departamento_nome, u.ativo
       FROM usuarios u
       LEFT JOIN departamentos d ON u.departamento_id = d.id
       WHERE u.id = ?`,
      [id]
    );

    console.log(`Usuário atualizado: ${usuario[0].nome} (ID: ${id})`);

    res.json(usuario[0]);
  } catch (err) {
    console.error('Erro ao atualizar usuário:', err);
    res.status(500).json({ error: 'Erro ao atualizar usuário' });
  }
});

/**
 * DELETE /api/usuarios/:id
 * Deletar usuário (soft delete - apenas desativa)
 */
app.delete('/api/usuarios/:id', async (req, res) => {
  const { id } = req.params;

  try {
    // Verificar se não está tentando deletar o próprio usuário admin
    const [usuario] = await pool.query(
      'SELECT login FROM usuarios WHERE id = ?',
      [id]
    );

    if (usuario.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    if (usuario[0].login === 'admin') {
      return res.status(400).json({ 
        error: 'Não é possível deletar o usuário administrador principal' 
      });
    }

    // Soft delete - apenas desativa
    await pool.query(
      'UPDATE usuarios SET ativo = 0 WHERE id = ?',
      [id]
    );

    console.log(`Usuário desativado: ${usuario[0].login} (ID: ${id})`);

    res.json({ message: 'Usuário desativado com sucesso' });
  } catch (err) {
    console.error('Erro ao deletar usuário:', err);
    res.status(500).json({ error: 'Erro ao deletar usuário' });
  }
});

// ============================================
// DEPARTAMENTOS
// ============================================

/**
 * GET /api/departamentos
 * Lista todos os departamentos
 */
app.get('/api/departamentos', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM departamentos ORDER BY nome');
    res.json(rows);
  } catch (err) {
    console.error('Erro ao listar departamentos:', err);
    res.status(500).json({ error: 'Erro ao listar departamentos' });
  }
});

// ============================================
// RELATÓRIOS - RF009
// ============================================

/**
 * GET /api/relatorios/dia
 * Estatísticas do dia atual
 */
app.get('/api/relatorios/dia', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        departamento_nome,
        COUNT(*) as total_visitas,
        SUM(CASE WHEN status = 'finalizado' THEN 1 ELSE 0 END) as finalizados,
        SUM(CASE WHEN status = 'chamado' THEN 1 ELSE 0 END) as chamados,
        SUM(CASE WHEN status = 'aguardando' THEN 1 ELSE 0 END) as aguardando
      FROM visitas_completas
      WHERE DATE(hora_chegada) = CURDATE()
      GROUP BY departamento_id, departamento_nome
    `);
    res.json(rows);
  } catch (err) {
    console.error('Erro ao gerar relatório:', err);
    res.status(500).json({ error: 'Erro ao gerar relatório' });
  }
});

/**
 * GET /api/relatorios/periodo
 * Relatório por período
 */
app.get('/api/relatorios/periodo', async (req, res) => {
  const { data_inicio, data_fim } = req.query;
  
  if (!data_inicio || !data_fim) {
    return res.status(400).json({ 
      error: 'data_inicio e data_fim são obrigatórios' 
    });
  }

  try {
    const [rows] = await pool.query(`
      SELECT 
        DATE(hora_chegada) as data,
        departamento_nome,
        COUNT(*) as total_visitas,
        SUM(CASE WHEN status = 'finalizado' THEN 1 ELSE 0 END) as finalizados
      FROM visitas_completas
      WHERE DATE(hora_chegada) BETWEEN ? AND ?
      GROUP BY DATE(hora_chegada), departamento_id, departamento_nome
      ORDER BY data DESC, departamento_nome
    `, [data_inicio, data_fim]);
    
    res.json(rows);
  } catch (err) {
    console.error('Erro ao gerar relatório de período:', err);
    res.status(500).json({ error: 'Erro ao gerar relatório' });
  }
});

// ============================================
// ROTA 404
// ============================================
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Rota não encontrada',
    path: req.path 
  });
});

// ============================================
// INICIALIZAÇÃO DO SERVIDOR
// ============================================
app.listen(port, "0.0.0.0", async () => {
  console.log('================================================');
  console.log('🚀 SISTEMA DE RECEPÇÃO EMPRESARIAL');
  console.log('================================================');
  console.log(`✅ Servidor rodando em http://192.167.2.41:${port}`);
  console.log(`⏰ Iniciado em: ${new Date().toLocaleString('pt-BR')}`);
  
  // Testa conexão com banco
  try {
    await pool.query('SELECT 1');
    console.log('✅ Banco de dados conectado');
  } catch (err) {
    console.error('❌ Erro ao conectar ao banco:', err.message);
  }
  
  console.log('================================================');
  console.log('📋 Endpoints disponíveis:');
  console.log('   GET  /api/status');
  console.log('   POST /api/auth/login');
  console.log('   GET  /api/usuarios');
  console.log('   POST /api/usuarios');
  console.log('   PUT  /api/usuarios/:id');
  console.log('   DELETE /api/usuarios/:id');
  console.log('   POST /api/visitas');
  console.log('   GET  /api/visitas');
  console.log('   GET  /api/visitas/ultima');
  console.log('   GET  /api/visitas/aguardando/:departamento_id');
  console.log('   GET  /api/visitas/chamados/:departamento_id');
  console.log('   PUT  /api/visitas/:id/chamar');
  console.log('   PUT  /api/visitas/:id/finalizado');
  console.log('   PUT  /api/visitas/:id/rechamar');
  console.log('   DELETE /api/visitas/:id');
  console.log('   GET  /api/departamentos');
  console.log('   GET  /api/visitantes');
  console.log('   GET  /api/relatorios/dia');
  console.log('   GET  /api/relatorios/periodo');
  console.log('================================================');
});