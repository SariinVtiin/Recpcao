// ============================================
// SERVER.JS - Sistema de Recepção Empresarial
// Backend: Node.js + Express + MySQL
// Fluxo: aguardando → chamado → finalizado
// VERSÃO CORRIGIDA COM BCRYPT
// ============================================

const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

const app = express();
const port = 3001;

// ============================================
// CONFIGURAÇÃO DO POOL DE CONEXÕES MYSQL
// ============================================
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'frd@confederal@2024',
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
// AUTENTICAÇÃO - RF006 (CORRIGIDO COM BCRYPT)
// ============================================

/**
 * POST /api/auth/login
 * RF006 - Controle de Acesso
 * RF007 - Perfis de Usuário
 * VERSÃO CORRIGIDA: Usa bcrypt.compare() para validar senha
 */
app.post('/api/auth/login', async (req, res) => {
  // Aceita tanto 'usuario' quanto 'login' para compatibilidade
  const { usuario, login, senha } = req.body;
  const loginValue = login || usuario;
  
  console.log('=== TENTATIVA DE LOGIN ===');
  console.log('Login recebido:', loginValue);
  console.log('Senha recebida:', senha ? '***' : 'vazio');
  
  // Validação básica
  if (!loginValue || !senha) {
    console.log('❌ Validação falhou: campos vazios');
    return res.status(400).json({ 
      error: 'Usuário e senha são obrigatórios' 
    });
  }

  try {
    // 1️⃣ Buscar usuário APENAS pelo login (SEM verificar senha na query)
    const [rows] = await pool.query(
      `SELECT 
        u.id, 
        u.nome, 
        u.login,
        u.senha,
        u.perfil,
        u.departamento_id,
        u.ativo,
        d.nome as departamento_nome
      FROM usuarios u
      LEFT JOIN departamentos d ON u.departamento_id = d.id
      WHERE u.login = ?`,
      [loginValue]
    );

    console.log('Usuários encontrados:', rows.length);

    // Se não encontrou nenhum usuário com esse login
    if (rows.length === 0) {
      console.log('❌ Login falhou: usuário não encontrado');
      return res.status(401).json({ 
        error: 'Usuário ou senha inválidos' 
      });
    }

    const user = rows[0];
    
    console.log('Usuário encontrado:', user.login);
    console.log('Ativo?', user.ativo === 1);
    
    // 2️⃣ Verificar se o usuário está ativo
    if (user.ativo !== 1) {
      console.log('❌ Login falhou: usuário inativo');
      return res.status(401).json({ 
        error: 'Usuário inativo' 
      });
    }
    
    // 3️⃣ Comparar senha usando bcrypt
    console.log('Validando senha com bcrypt...');
    const senhaValida = await bcrypt.compare(senha, user.senha);
    console.log('Senha válida?', senhaValida);
    
    if (!senhaValida) {
      console.log('❌ Login falhou: senha incorreta');
      return res.status(401).json({ 
        error: 'Usuário ou senha inválidos' 
      });
    }
    
    // 4️⃣ Login bem-sucedido
    console.log(`✅ Login bem-sucedido: ${user.nome} (${user.perfil})`);

    // Retorna os dados do usuário (SEM a senha)
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
  const { nome, cpf, departamento_id, motivo, observacao, matricula, usuario_id } = req.body;
  
  // Aceita tanto 'observacao' quanto 'matricula' para compatibilidade
  const matriculaValue = matricula || observacao || null;
  
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

    // Chama a stored procedure (agora com matrícula ao invés de observacao)
    const [result] = await pool.query(
      `CALL sp_registrar_visita(?, ?, ?, ?, ?, ?, @visita_id, @visitante_id)`,
      [cpfLimpo, nome, matriculaValue, departamento_id, motivo, usuarioIdValido]
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

    if (data_inicio && data_fim) {
      query += ' AND DATE(hora_chegada) BETWEEN ? AND ?';
      params.push(data_inicio, data_fim);
    } else if (data_inicio) {
      query += ' AND DATE(hora_chegada) >= ?';
      params.push(data_inicio);
    } else if (data_fim) {
      query += ' AND DATE(hora_chegada) <= ?';
      params.push(data_fim);
    }

    if (cpf) {
      query += ' AND visitante_cpf = ?';
      params.push(cpf.replace(/\D/g, ''));
    }

    query += ' ORDER BY hora_chegada DESC LIMIT 500';

    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('Erro ao listar visitas:', err);
    res.status(500).json({ error: 'Erro ao listar visitas' });
  }
});

/**
 * GET /api/visitas/ultima
 * Retorna a última visita registrada
 */
app.get('/api/visitas/ultima', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM visitas_completas ORDER BY hora_chegada DESC LIMIT 1'
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Nenhuma visita registrada' });
    }
    
    res.json(rows[0]);
  } catch (err) {
    console.error('Erro ao buscar última visita:', err);
    res.status(500).json({ error: 'Erro ao buscar última visita' });
  }
});

/**
 * GET /api/visitas/aguardando/:departamento_id
 * RF002 - Fila de Espera por Departamento
 */
app.get('/api/visitas/aguardando/:departamento_id', async (req, res) => {
  const { departamento_id } = req.params;
  
  try {
    const [rows] = await pool.query(
      `SELECT * FROM visitas_completas 
       WHERE departamento_id = ? AND status = 'aguardando'
       ORDER BY hora_chegada ASC`,
      [departamento_id]
    );
    res.json(rows);
  } catch (err) {
    console.error('Erro ao listar fila de espera:', err);
    res.status(500).json({ error: 'Erro ao listar fila de espera' });
  }
});

/**
 * GET /api/visitas/chamados/:departamento_id
 * Lista visitantes já chamados de um departamento
 */
app.get('/api/visitas/chamados/:departamento_id', async (req, res) => {
  const { departamento_id } = req.params;
  
  try {
    const [rows] = await pool.query(
      `SELECT * FROM visitas_completas 
       WHERE departamento_id = ? 
       AND status IN ('chamado', 'finalizado')
       AND DATE(hora_chegada) = CURDATE()
       ORDER BY hora_chamada DESC`,
      [departamento_id]
    );
    res.json(rows);
  } catch (err) {
    console.error('Erro ao listar chamados:', err);
    res.status(500).json({ error: 'Erro ao listar chamados' });
  }
});

/**
 * PUT /api/visitas/:id/chamar
 * RF003 - Chamar Visitante
 * Transição: aguardando → chamado
 */
app.put('/api/visitas/:id/chamar', async (req, res) => {
  const { id } = req.params;
  const { usuario_id } = req.body;
  
  try {
    // Verificar se a visita existe e está aguardando
    const [visita] = await pool.query(
      'SELECT * FROM visitas WHERE id = ?',
      [id]
    );

    if (visita.length === 0) {
      return res.status(404).json({ error: 'Visita não encontrada' });
    }

    if (visita[0].status !== 'aguardando') {
      return res.status(400).json({ 
        error: `Visita não pode ser chamada. Status atual: ${visita[0].status}` 
      });
    }

    // Atualizar para status 'chamado'
    await pool.query(
      `UPDATE visitas 
       SET status = 'chamado', 
           hora_chamada = NOW(),
           usuario_id = ?
       WHERE id = ?`,
      [usuario_id || null, id]
    );

    // Buscar visita atualizada
    const [visitaAtualizada] = await pool.query(
      'SELECT * FROM visitas_completas WHERE visita_id = ?',
      [id]
    );

    console.log(`Visitante chamado: ${visitaAtualizada[0].visitante_nome}`);

    res.json(visitaAtualizada[0]);
  } catch (err) {
    console.error('Erro ao chamar visitante:', err);
    res.status(500).json({ error: 'Erro ao chamar visitante' });
  }
});

/**
 * PUT /api/visitas/:id/finalizado
 * RF004 - Finalizar Atendimento
 * Transição: chamado → finalizado
 */
app.put('/api/visitas/:id/finalizado', async (req, res) => {
  const { id } = req.params;
  
  try {
    // Verificar se a visita existe e está com status 'chamado'
    const [visita] = await pool.query(
      'SELECT * FROM visitas WHERE id = ?',
      [id]
    );

    if (visita.length === 0) {
      return res.status(404).json({ error: 'Visita não encontrada' });
    }

    if (visita[0].status !== 'chamado') {
      return res.status(400).json({ 
        error: `Visita não pode ser finalizada. Status atual: ${visita[0].status}` 
      });
    }

    // Atualizar para status 'finalizado'
    await pool.query(
      `UPDATE visitas 
       SET status = 'finalizado', 
           hora_saida = NOW()
       WHERE id = ?`,
      [id]
    );

    // Buscar visita atualizada
    const [visitaAtualizada] = await pool.query(
      'SELECT * FROM visitas_completas WHERE visita_id = ?',
      [id]
    );

    console.log(`Atendimento finalizado: ${visitaAtualizada[0].visitante_nome}`);

    res.json(visitaAtualizada[0]);
  } catch (err) {
    console.error('Erro ao finalizar atendimento:', err);
    res.status(500).json({ error: 'Erro ao finalizar atendimento' });
  }
});

/**
 * PUT /api/visitas/:id/rechamar
 * Permite rechamar um visitante (chamado → aguardando)
 */
app.put('/api/visitas/:id/rechamar', async (req, res) => {
  const { id } = req.params;
  
  try {
    const [visita] = await pool.query(
      'SELECT * FROM visitas WHERE id = ?',
      [id]
    );

    if (visita.length === 0) {
      return res.status(404).json({ error: 'Visita não encontrada' });
    }

    if (visita[0].status !== 'chamado') {
      return res.status(400).json({ 
        error: `Não é possível rechamar. Status atual: ${visita[0].status}` 
      });
    }

    // Voltar para aguardando
    await pool.query(
      `UPDATE visitas 
       SET status = 'aguardando', 
           hora_chamada = NULL
       WHERE id = ?`,
      [id]
    );

    const [visitaAtualizada] = await pool.query(
      'SELECT * FROM visitas_completas WHERE visita_id = ?',
      [id]
    );

    console.log(`Visitante voltou para fila: ${visitaAtualizada[0].visitante_nome}`);

    res.json(visitaAtualizada[0]);
  } catch (err) {
    console.error('Erro ao rechamar visitante:', err);
    res.status(500).json({ error: 'Erro ao rechamar visitante' });
  }
});

/**
 * DELETE /api/visitas/:id
 * Cancelar/deletar visita
 */
app.delete('/api/visitas/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const [visita] = await pool.query(
      'SELECT * FROM visitas WHERE id = ?',
      [id]
    );

    if (visita.length === 0) {
      return res.status(404).json({ error: 'Visita não encontrada' });
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
// USUÁRIOS - RF006, RF007
// ============================================

/**
 * GET /api/usuarios
 * Lista todos os usuários
 */
app.get('/api/usuarios', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT 
        u.id, u.nome, u.login, u.perfil, u.departamento_id,
        d.nome as departamento_nome, u.ativo,
        DATE_FORMAT(u.created_at, '%d/%m/%Y %H:%i') as data_cadastro
       FROM usuarios u
       LEFT JOIN departamentos d ON u.departamento_id = d.id
       ORDER BY u.nome`
    );
    res.json(rows);
  } catch (err) {
    console.error('Erro ao listar usuários:', err);
    res.status(500).json({ error: 'Erro ao listar usuários' });
  }
});

/**
 * GET /api/usuarios/:id
 * Busca usuário por ID
 */
app.get('/api/usuarios/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await pool.query(
      `SELECT 
        u.id, u.nome, u.login, u.perfil, u.departamento_id,
        d.nome as departamento_nome, u.ativo
       FROM usuarios u
       LEFT JOIN departamentos d ON u.departamento_id = d.id
       WHERE u.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error('Erro ao buscar usuário:', err);
    res.status(500).json({ error: 'Erro ao buscar usuário' });
  }
});

/**
 * POST /api/usuarios
 * Criar novo usuário
 * CORRIGIDO: Agora criptografa a senha com bcrypt
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
    const [loginExiste] = await pool.query(
      'SELECT id FROM usuarios WHERE login = ?',
      [login]
    );

    if (loginExiste.length > 0) {
      return res.status(400).json({ error: 'Login já cadastrado' });
    }

    // Criptografar senha com bcrypt
    console.log('Criptografando senha para novo usuário...');
    const senhaHash = await bcrypt.hash(senha, 10);
    console.log('Senha criptografada com sucesso');

    // Inserir usuário
    const [result] = await pool.query(
      `INSERT INTO usuarios (nome, login, senha, perfil, departamento_id, ativo) 
       VALUES (?, ?, ?, ?, ?, 1)`,
      [nome, login, senhaHash, perfil, departamento_id || null]
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

    console.log(`✅ Novo usuário criado: ${nome} (${login}) - Senha criptografada`);

    res.status(201).json(usuario[0]);
  } catch (err) {
    console.error('Erro ao criar usuário:', err);
    res.status(500).json({ error: 'Erro ao criar usuário' });
  }
});

/**
 * PUT /api/usuarios/:id
 * Atualizar usuário
 * CORRIGIDO: Agora criptografa a senha com bcrypt ao atualizar
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
      // Criptografar senha com bcrypt
      console.log(`Criptografando nova senha para usuário ID ${id}...`);
      const senhaHash = await bcrypt.hash(senha.trim(), 10);
      campos.push('senha = ?');
      valores.push(senhaHash);
      console.log('Senha criptografada com sucesso');
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

    console.log(`✅ Usuário atualizado: ${usuario[0].nome} (ID: ${id})`);

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
  console.log('   VERSÃO CORRIGIDA COM BCRYPT');
  console.log('================================================');
  console.log(`✅ Servidor rodando em http://192.167.2.41:${port}`);
  console.log(`⏰ Iniciado em: ${new Date().toLocaleString('pt-BR')}`);
  
  // Testa conexão com banco
  try {
    await pool.query('SELECT 1');
    console.log('✅ Banco de dados conectado');
    console.log('✅ bcrypt habilitado para validação de senhas');
  } catch (err) {
    console.error('❌ Erro ao conectar ao banco:', err.message);
  }
  
  console.log('================================================');
  console.log('📋 Endpoints disponíveis:');
  console.log('   GET  /api/status');
  console.log('   POST /api/auth/login (CORRIGIDO)');
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
  console.log('🔐 Credenciais padrão:');
  console.log('   Login: admin | Senha: 123456');
  console.log('================================================');
});