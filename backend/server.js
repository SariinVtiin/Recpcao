// ============================================
// SERVER.JS - Sistema de Recepção Empresarial
// Backend: Node.js + Express + MySQL + HTTP
// Fluxo: aguardando → chamado → finalizado
// VERSÃO HTTP + STREAMING DE CÂMERA (HLS)
// ============================================

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const relatorioExport = require('./routes/relatorioExport');

const app = express();
const port = process.env.PORT || 3001;

// ============================================
// CONFIGURAÇÃO DO POOL DE CONEXÕES MYSQL
// ============================================
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: process.env.DB_TIMEZONE
});

// ============================================
// MIDDLEWARES
// ============================================
app.use(cors());
app.use(express.json());

// Servir arquivos estáticos do streaming HLS
const PUBLIC_DIR = path.join(__dirname, 'public');
if (!fs.existsSync(PUBLIC_DIR)) {
  fs.mkdirSync(PUBLIC_DIR, { recursive: true });
}
app.use('/camera', express.static(PUBLIC_DIR));

app.use('/api', relatorioExport);

// Logger de requisições (ignora arquivos do HLS pra não poluir o log)
app.use((req, res, next) => {
  if (!req.path.startsWith('/camera/')) {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  }
  next();
});

// ============================================
// STREAMING DA CÂMERA (RTSP → HLS via FFmpeg)
// ============================================
let ffmpegProcess = null;
let ffmpegRestartTimeout = null;

function mascararSenha(texto, senha) {
  if (!senha || !texto) return texto;
  return texto.split(senha).join('****');
}

function iniciarStreamCamera() {
  const cam = {
    user: process.env.CAM1_USER,
    password: process.env.CAM1_PASSWORD,
    host: process.env.CAM1_HOST,
    port: process.env.CAM1_PORT,
    channel: process.env.CAM1_CHANNEL,
    subtype: process.env.CAM1_SUBTYPE
  };

  const ffmpegPath = process.env.FFMPEG_PATH;
  const hlsOutput = process.env.HLS_OUTPUT || 'public/live.m3u8';
  const hlsSegmentTime = process.env.HLS_SEGMENT_TIME || '2';
  const hlsListSize = process.env.HLS_LIST_SIZE || '3';

  const camConfigOk = cam.user && cam.password && cam.host && cam.port && cam.channel !== undefined && cam.subtype !== undefined;
  if (!camConfigOk || !ffmpegPath) {
    console.log('📹 Câmera não configurada no .env (CAM1_* e FFMPEG_PATH) — streaming desativado');
    return;
  }

  if (!fs.existsSync(ffmpegPath)) {
    console.error(`❌ FFmpeg não encontrado em: ${ffmpegPath}`);
    console.error('   Verifique a variável FFMPEG_PATH no .env');
    return;
  }

  // 🧹 LIMPEZA: remove arquivos antigos do streaming antes de começar
  try {
    const arquivos = fs.readdirSync(PUBLIC_DIR);
    arquivos
      .filter(f => f.endsWith('.m3u8') || f.endsWith('.ts'))
      .forEach(f => {
        fs.unlinkSync(path.join(PUBLIC_DIR, f));
      });
    console.log('🧹 Arquivos HLS antigos removidos');
  } catch (e) {
    console.warn('⚠️ Falha ao limpar arquivos antigos:', e.message);
  }

  const rtsp = `rtsp://${cam.user}:${encodeURIComponent(cam.password)}@${cam.host}:${cam.port}/cam/realmonitor?channel=${cam.channel}&subtype=${cam.subtype}`;

  console.log(`📹 Iniciando streaming da câmera ${cam.host}:${cam.port} (canal ${cam.channel})`);

ffmpegProcess = spawn(ffmpegPath, [
    '-rtsp_transport', 'tcp',
    '-timeout', '5000000',
    '-fflags', '+nobuffer',
    '-flags', 'low_delay',
    '-i', rtsp,
    '-f', 'hls',
    '-hls_time', hlsSegmentTime,
    '-hls_list_size', hlsListSize,
    '-hls_flags', 'delete_segments+omit_endlist',
    hlsOutput
  ]);

  ffmpegProcess.stderr.on('data', data => {
    const log = mascararSenha(data.toString(), cam.password);
    process.stdout.write(log);
  });

  ffmpegProcess.on('close', code => {
    console.log(`⚠️ FFmpeg encerrou com código ${code}`);
    ffmpegProcess = null;

    if (code !== null && code !== 255) {
      console.log('🔄 Reiniciando streaming em 5 segundos...');
      ffmpegRestartTimeout = setTimeout(iniciarStreamCamera, 5000);
    }
  });

  ffmpegProcess.on('error', err => {
    console.error('❌ Erro no processo FFmpeg:', err.message);
  });
}

function pararStreamCamera() {
  if (ffmpegRestartTimeout) {
    clearTimeout(ffmpegRestartTimeout);
    ffmpegRestartTimeout = null;
  }
  if (ffmpegProcess) {
    console.log('🛑 Encerrando streaming da câmera...');
    ffmpegProcess.kill('SIGTERM');
    ffmpegProcess = null;
  }
}

// Endpoint pra verificar status do streaming
app.get('/api/camera/status', (req, res) => {
  res.json({
    streaming: ffmpegProcess !== null,
    url_hls: `/camera/${path.basename(process.env.HLS_OUTPUT || 'live.m3u8')}`,
    timestamp: new Date().toISOString()
  });
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
      camera_streaming: ffmpegProcess !== null,
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
app.post('/api/auth/login', async (req, res) => {
  const { usuario, login, senha } = req.body;
  const loginValue = login || usuario;
  
  console.log('=== TENTATIVA DE LOGIN ===');
  console.log('Login recebido:', loginValue);
  
  if (!loginValue || !senha) {
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

    if (rows.length === 0) {
      console.log('❌ Login falhou: usuário não encontrado');
      return res.status(401).json({ 
        error: 'Usuário ou senha inválidos' 
      });
    }

    const user = rows[0];
    
    if (user.ativo !== 1) {
      console.log('❌ Login falhou: usuário inativo');
      return res.status(401).json({ 
        error: 'Usuário inativo' 
      });
    }
    
    const senhaValida = await bcrypt.compare(senha, user.senha);
    
    if (!senhaValida) {
      console.log('❌ Login falhou: senha incorreta');
      return res.status(401).json({ 
        error: 'Usuário ou senha inválidos' 
      });
    }
    
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
app.post('/api/visitas', async (req, res) => {
  const { nome, cpf, departamento_id, motivo, observacao, matricula, usuario_id } = req.body;
  
  console.log('=== POST /api/visitas ===');
  console.log('Body recebido:', req.body);
  console.log('usuario_id recebido:', usuario_id);

  const matriculaValue = matricula || observacao || null;
  
  if (!nome || !cpf || !departamento_id) {
    return res.status(400).json({ 
      error: 'Nome, CPF e departamento são obrigatórios' 
    });
    
  }

  try {
    const cpfLimpo = cpf.replace(/\D/g, '');
    
    if (cpfLimpo.length !== 11) {
      return res.status(400).json({ error: 'CPF inválido' });
    }

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

    const [result] = await pool.query(
      `CALL sp_registrar_visita(?, ?, ?, ?, ?, ?, @visita_id, @visitante_id)`,
      [cpfLimpo, nome, matriculaValue, departamento_id, motivo, usuarioIdValido]
    );

    const [ids] = await pool.query('SELECT @visita_id as visita_id, @visitante_id as visitante_id');

    // ✅ Gravar quem fez o cadastro
    if (usuarioIdValido && ids[0].visita_id) {
      await pool.query(
        'UPDATE visitas SET usuario_cadastro_id = ? WHERE id = ?',
        [usuarioIdValido, ids[0].visita_id]
      );
      console.log(`📋 Cadastro registrado: usuário ${usuarioIdValido} registrou visita ${ids[0].visita_id}`);
    }
    
    const [visita] = await pool.query(
      'SELECT * FROM visitas_completas WHERE visita_id = ?',
      [ids[0].visita_id]
    );
    res.status(201).json(visita[0]);
  } catch (err) {
    console.error('Erro ao registrar visita:', err);
    res.status(500).json({ error: 'Erro ao registrar visita' });
  }
});

app.get('/api/visitas', async (req, res) => {
  const { status, departamento_id, data_inicio, data_fim, cpf } = req.query;
  
  try {
    let query = 'SELECT * FROM visitas_completas WHERE 1=1';
    const params = [];

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

app.get('/api/visitas/chamados/:departamento_id', async (req, res) => {
  const { departamento_id } = req.params;
  
  try {
    const [rows] = await pool.query(
      `SELECT * FROM visitas_completas 
       WHERE departamento_id = ? 
       AND status = 'chamado'
       AND DATE(hora_chegada) = CURDATE()
       ORDER BY hora_chamada DESC`,
      [departamento_id]
    );    
    res.json(rows);
  } catch (err) {
    console.error('❌ Erro ao listar chamados:', err);
    res.status(500).json({ error: 'Erro ao listar chamados' });
  }
});

app.put('/api/visitas/:id/chamar', async (req, res) => {
  const { id } = req.params;
  const { usuario_id } = req.body;
  
  try {
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

    // ✅ Gravar quem fez a chamada
    await pool.query(
      `UPDATE visitas 
       SET status = 'chamado', 
           hora_chamada = NOW(),
           usuario_chamada_id = ?
       WHERE id = ?`,
      [usuario_id || null, id]
    );

    const [visitaAtualizada] = await pool.query(
      'SELECT * FROM visitas_completas WHERE visita_id = ?',
      [id]
    );

    console.log(`📋 Chamada registrada: usuário ${usuario_id} chamou visita ${id} - ${visitaAtualizada[0].visitante_nome}`);

    res.json(visitaAtualizada[0]);
  } catch (err) {
    console.error('Erro ao chamar visitante:', err);
    res.status(500).json({ error: 'Erro ao chamar visitante' });
  }
});

app.put('/api/visitas/:id/finalizado', async (req, res) => {
  const { id } = req.params;
  // ✅ MODIFICAÇÃO: Receber usuario_id no body
  const { usuario_id } = req.body || {};
  
  console.log(`🏁 Tentando finalizar visita ID: ${id}`);
  
  try {
    const [visita] = await pool.query(
      'SELECT id, status, visitante_id FROM visitas WHERE id = ?',
      [id]
    );

    if (visita.length === 0) {
      console.log(`❌ Visita ${id} não encontrada`);
      return res.status(404).json({ error: 'Visita não encontrada' });
    }

    if (visita[0].status !== 'chamado') {
      console.log(`❌ Visita ${id} não está em atendimento (status: ${visita[0].status})`);
      return res.status(400).json({ 
        error: `Apenas visitas em atendimento podem ser finalizadas. Status atual: ${visita[0].status}` 
      });
    }

    // ✅ Gravar quem finalizou
    await pool.query(
      `UPDATE visitas 
       SET status = 'finalizado', 
           hora_saida = NOW(),
           usuario_finalizacao_id = ?
       WHERE id = ?`,
      [usuario_id || null, id]
    );

    const [visitaAtualizada] = await pool.query(
      'SELECT * FROM visitas_completas WHERE visita_id = ?',
      [id]
    );

    console.log(`📋 Finalização registrada: usuário ${usuario_id} finalizou visita ${id} - ${visitaAtualizada[0].visitante_nome}`);

    res.json(visitaAtualizada[0]);
  } catch (err) {
    console.error('❌ Erro ao finalizar atendimento:', err);
    res.status(500).json({ error: 'Erro ao finalizar atendimento' });
  }
});

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

    await pool.query(
      `UPDATE visitas 
       SET status = 'aguardando', 
           hora_chamada = NULL,
           usuario_chamada_id = NULL
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
app.get('/api/usuarios', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT 
        u.id, u.nome, u.login, u.perfil, u.departamento_id,
        d.nome as departamento_nome, u.ativo,
        DATE_FORMAT(u.created_at, '%d/%m/%Y %H:%i') as created_at
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

app.post('/api/usuarios', async (req, res) => {
  const { nome, login, senha, perfil, departamento_id } = req.body;
  if (!nome || !login || !senha || !perfil) {
    return res.status(400).json({ 
      error: 'Nome, login, senha e perfil são obrigatórios' 
    });
  }

  const perfisValidos = ['recepcionista', 'departamento', 'painel', 'administrador', 'relatorio'];
  if (!perfisValidos.includes(perfil)) {
    return res.status(400).json({ error: 'Perfil inválido' });
  }

  try {
    const [loginExiste] = await pool.query(
      'SELECT id FROM usuarios WHERE login = ?',
      [login]
    );

    if (loginExiste.length > 0) {
      return res.status(400).json({ error: 'Login já cadastrado' });
    }

    console.log('Criptografando senha para novo usuário...');
    const senhaHash = await bcrypt.hash(senha, 10);

    const [result] = await pool.query(
      `INSERT INTO usuarios (nome, login, senha, perfil, departamento_id, ativo) 
       VALUES (?, ?, ?, ?, ?, 1)`,
      [nome, login, senhaHash, perfil, departamento_id || null]
    );

    const [usuario] = await pool.query(
      `SELECT 
        u.id, u.nome, u.login, u.perfil, u.departamento_id,
        d.nome as departamento_nome, u.ativo
       FROM usuarios u
       LEFT JOIN departamentos d ON u.departamento_id = d.id
       WHERE u.id = ?`,
      [result.insertId]
    );

    console.log(`✅ Novo usuário criado: ${nome} (${login})`);

    res.status(201).json(usuario[0]);
  } catch (err) {
    console.error('Erro ao criar usuário:', err);
    res.status(500).json({ error: 'Erro ao criar usuário' });
  }
});

app.put('/api/usuarios/:id', async (req, res) => {
  const { id } = req.params;
  const { nome, login, senha, perfil, departamento_id, ativo } = req.body;

  try {
    const [usuarioExiste] = await pool.query(
      'SELECT id FROM usuarios WHERE id = ?',
      [id]
    );

    if (usuarioExiste.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    if (login) {
      const [loginEmUso] = await pool.query(
        'SELECT id FROM usuarios WHERE login = ? AND id != ?',
        [login, id]
      );

      if (loginEmUso.length > 0) {
        return res.status(400).json({ error: 'Login já está em uso' });
      }
    }

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
      console.log(`Criptografando nova senha para usuário ID ${id}...`);
      const senhaHash = await bcrypt.hash(senha.trim(), 10);
      campos.push('senha = ?');
      valores.push(senhaHash);
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

// DESATIVAR USUÁRIO (soft delete)
app.delete('/api/usuarios/:id', async (req, res) => {
  const { id } = req.params;

  try {
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

    await pool.query(
      'UPDATE usuarios SET ativo = 0 WHERE id = ?',
      [id]
    );

    console.log(`✅ Usuário desativado: ${usuario[0].login} (ID: ${id})`);

    res.json({ message: 'Usuário desativado com sucesso' });
  } catch (err) {
    console.error('Erro ao deletar usuário:', err);
    res.status(500).json({ error: 'Erro ao deletar usuário' });
  }
});

// REATIVAR USUÁRIO
app.put('/api/usuarios/:id/reativar', async (req, res) => {
  const { id } = req.params;

  console.log(`🔄 Tentando reativar usuário ID: ${id}`);

  try {
    const [usuario] = await pool.query(
      'SELECT id, nome, login, ativo FROM usuarios WHERE id = ?',
      [id]
    );

    if (usuario.length === 0) {
      console.log(`❌ Usuário ID ${id} não encontrado`);
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    if (usuario[0].ativo === 1) {
      console.log(`⚠️ Usuário ${usuario[0].nome} já está ativo`);
      return res.status(400).json({ error: 'Usuário já está ativo' });
    }

    await pool.query(
      'UPDATE usuarios SET ativo = 1 WHERE id = ?',
      [id]
    );

    const [usuarioAtualizado] = await pool.query(
      `SELECT 
        u.id, u.nome, u.login, u.perfil, u.departamento_id,
        d.nome as departamento_nome, u.ativo
       FROM usuarios u
       LEFT JOIN departamentos d ON u.departamento_id = d.id
       WHERE u.id = ?`,
      [id]
    );

    console.log(`✅ Usuário reativado: ${usuarioAtualizado[0].nome} (${usuarioAtualizado[0].login})`);

    res.json(usuarioAtualizado[0]);
  } catch (err) {
    console.error('❌ Erro ao reativar usuário:', err);
    res.status(500).json({ error: 'Erro ao reativar usuário' });
  }
});

// EXCLUIR PERMANENTEMENTE
app.delete('/api/usuarios/:id/excluir-permanente', async (req, res) => {
  const { id } = req.params;

  console.log(`🗑️ Tentando excluir permanentemente usuário ID: ${id}`);

  try {
    const [usuario] = await pool.query(
      'SELECT id, nome, login, ativo FROM usuarios WHERE id = ?',
      [id]
    );

    if (usuario.length === 0) {
      console.log(`❌ Usuário ID ${id} não encontrado`);
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    if (usuario[0].login === 'admin') {
      console.log(`❌ Tentativa de excluir usuário admin`);
      return res.status(400).json({ 
        error: 'Não é possível excluir o usuário administrador principal' 
      });
    }

    if (usuario[0].ativo === 1) {
      console.log(`❌ Usuário ${usuario[0].nome} ainda está ativo`);
      return res.status(400).json({ 
        error: 'Só é possível excluir permanentemente usuários desativados. Desative o usuário primeiro.' 
      });
    }

    const [visitasRegistradas] = await pool.query(
      `SELECT COUNT(*) as total FROM visitas 
       WHERE usuario_cadastro_id = ? OR usuario_chamada_id = ? OR usuario_finalizacao_id = ?`,
      [id, id, id]
    );

    if (visitasRegistradas[0].total > 0) {
      await pool.query(
        'UPDATE usuarios SET ativo = -1, login = CONCAT(login, "_DELETED_", ?) WHERE id = ?',
        [Date.now(), id]
      );
      console.log(`⚠️ Usuário ${usuario[0].nome} marcado como excluído (tinha ${visitasRegistradas[0].total} visitas registradas)`);
    } else {
      await pool.query('DELETE FROM usuarios WHERE id = ?', [id]);
      console.log(`✅ Usuário ${usuario[0].nome} excluído permanentemente do banco de dados`);
    }

    res.json({ 
      message: 'Usuário excluído permanentemente',
      usuario: usuario[0].nome
    });
  } catch (err) {
    console.error('❌ Erro ao excluir usuário permanentemente:', err);
    res.status(500).json({ error: 'Erro ao excluir usuário' });
  }
});

// ============================================
// DEPARTAMENTOS
// ============================================
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

app.get('/api/relatorios/visitas', async (req, res) => {
  const { data_inicio, data_fim, departamento_id, status } = req.query;
    
  if (!data_inicio || !data_fim) {
    return res.status(400).json({ 
      error: 'data_inicio e data_fim são obrigatórios' 
    });
  }

  try {
    // ✅ MODIFICAÇÃO: JOIN com as 3 colunas de responsável
    let query = `
      SELECT 
        v.id,
        v.status,
        v.motivo,
        v.hora_chegada as data_entrada,
        v.hora_chamada as data_chamada,
        v.hora_saida as data_saida,
        vi.nome as visitante_nome,
        vi.cpf as visitante_cpf,
        vi.matricula as visitante_matricula,
        d.id as departamento_id,
        d.nome as departamento_nome,
        u_cadastro.nome   as usuario_cadastro_nome,
        u_chamada.nome    as usuario_chamada_nome,
        u_finalizacao.nome as usuario_finalizacao_nome,
        TIMESTAMPDIFF(MINUTE, v.hora_chegada, v.hora_chamada) as tempo_espera_minutos,
        TIMESTAMPDIFF(MINUTE, v.hora_chamada, v.hora_saida) as tempo_atendimento_minutos,
        TIMESTAMPDIFF(MINUTE, v.hora_chegada, v.hora_saida) as tempo_total_minutos
      FROM visitas v
      INNER JOIN visitantes vi ON v.visitante_id = vi.id
      INNER JOIN departamentos d ON v.departamento_id = d.id
      LEFT JOIN usuarios u_cadastro    ON v.usuario_cadastro_id    = u_cadastro.id
      LEFT JOIN usuarios u_chamada     ON v.usuario_chamada_id     = u_chamada.id
      LEFT JOIN usuarios u_finalizacao ON v.usuario_finalizacao_id = u_finalizacao.id
      WHERE DATE(v.hora_chegada) BETWEEN ? AND ?
    `;

    const params = [data_inicio, data_fim];

    if (departamento_id && departamento_id !== 'todos') {
      query += ' AND v.departamento_id = ?';
      params.push(departamento_id);
    }

    if (status && status !== 'todos') {
      query += ' AND v.status = ?';
      params.push(status);
    }

    query += ' ORDER BY v.hora_chegada DESC LIMIT 1000';

    const [visitas] = await pool.query(query, params);
    
    res.json(visitas);
  } catch (err) {
    console.error('❌ Erro ao buscar relatório de visitas:', err);
    res.status(500).json({ error: 'Erro ao buscar relatórios' });
  }
});

app.get('/api/relatorios/estatisticas', async (req, res) => {
  const { data_inicio, data_fim, departamento_id, status } = req.query;
  
  if (!data_inicio || !data_fim) {
    return res.status(400).json({ 
      error: 'data_inicio e data_fim são obrigatórios' 
    });
  }

  try {
    let whereConditions = 'WHERE DATE(hora_chegada) BETWEEN ? AND ?';
    const params = [data_inicio, data_fim];

    if (departamento_id && departamento_id !== 'todos') {
      whereConditions += ' AND departamento_id = ?';
      params.push(departamento_id);
    }

    if (status && status !== 'todos') {
      whereConditions += ' AND status = ?';
      params.push(status);
    }

    const [stats] = await pool.query(`
      SELECT 
        COUNT(*) as total_visitas,
        SUM(CASE WHEN status = 'aguardando' THEN 1 ELSE 0 END) as aguardando,
        SUM(CASE WHEN status = 'chamado' THEN 1 ELSE 0 END) as em_atendimento,
        SUM(CASE WHEN status = 'finalizado' THEN 1 ELSE 0 END) as finalizados,
        ROUND(AVG(CASE 
          WHEN status IN ('chamado', 'finalizado') 
          THEN TIMESTAMPDIFF(MINUTE, hora_chegada, hora_chamada) 
        END)) as tempo_medio_espera_minutos,
        ROUND(AVG(CASE 
          WHEN status = 'finalizado' 
          THEN TIMESTAMPDIFF(MINUTE, hora_chamada, hora_saida) 
        END)) as tempo_medio_atendimento_minutos
      FROM visitas
      ${whereConditions}
    `, params);

    const resultado = {
      total_visitas: stats[0].total_visitas || 0,
      aguardando: stats[0].aguardando || 0,
      em_atendimento: stats[0].em_atendimento || 0,
      finalizados: stats[0].finalizados || 0,
      tempo_medio_espera: stats[0].tempo_medio_espera_minutos 
        ? `${stats[0].tempo_medio_espera_minutos} min` 
        : '0 min',
      tempo_medio_atendimento: stats[0].tempo_medio_atendimento_minutos 
        ? `${stats[0].tempo_medio_atendimento_minutos} min` 
        : '0 min'
    };

    res.json(resultado);
  } catch (err) {
    console.error('❌ Erro ao buscar estatísticas:', err);
    res.status(500).json({ error: 'Erro ao buscar estatísticas' });
  }
});

app.get('/api/relatorios/por-departamento', async (req, res) => {
  const { data_inicio, data_fim } = req.query;
  
  if (!data_inicio || !data_fim) {
    return res.status(400).json({ 
      error: 'data_inicio e data_fim são obrigatórios' 
    });
  }

  try {
    const [rows] = await pool.query(`
      SELECT 
        d.id as departamento_id,
        d.nome as departamento_nome,
        COUNT(*) as total_visitas,
        SUM(CASE WHEN v.status = 'aguardando' THEN 1 ELSE 0 END) as aguardando,
        SUM(CASE WHEN v.status = 'chamado' THEN 1 ELSE 0 END) as em_atendimento,
        SUM(CASE WHEN v.status = 'finalizado' THEN 1 ELSE 0 END) as finalizados,
        ROUND(AVG(CASE 
          WHEN v.status IN ('chamado', 'finalizado') 
          THEN TIMESTAMPDIFF(MINUTE, v.hora_chegada, v.hora_chamada) 
        END)) as tempo_medio_espera_minutos
      FROM visitas v
      INNER JOIN departamentos d ON v.departamento_id = d.id
      WHERE DATE(v.hora_chegada) BETWEEN ? AND ?
      GROUP BY d.id, d.nome
      ORDER BY total_visitas DESC
    `, [data_inicio, data_fim]);
    
    res.json(rows);
  } catch (err) {
    console.error('❌ Erro ao buscar relatório por departamento:', err);
    res.status(500).json({ error: 'Erro ao buscar relatório' });
  }
});

// ============================================
// CHAMADAS RECENTES (PAINEL TV)
// ============================================
app.get('/api/visitas/chamadas-recentes', async (req, res) => {
  try {
    const [chamadas] = await pool.query(`
      SELECT 
        v.id as visita_id,
        v.hora_chamada,
        vi.nome as visitante_nome,
        vi.matricula as visitante_matricula,
        d.nome as departamento_nome,
        d.id as departamento_id
      FROM visitas v
      JOIN visitantes vi ON v.visitante_id = vi.id
      JOIN departamentos d ON v.departamento_id = d.id
      WHERE v.status = 'chamado'
        AND v.hora_chamada IS NOT NULL
        AND v.hora_chamada >= NOW() - INTERVAL 2 MINUTE
      ORDER BY v.hora_chamada ASC
    `);    
    res.json(chamadas);
  } catch (error) {
    console.error('Erro ao buscar chamadas recentes:', error);
    res.status(500).json({ error: 'Erro ao buscar chamadas' });
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
// ENCERRAMENTO LIMPO
// ============================================
process.on('SIGINT', () => {
  console.log('\n🛑 Recebido SIGINT — encerrando...');
  pararStreamCamera();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Recebido SIGTERM — encerrando...');
  pararStreamCamera();
  process.exit(0);
});

// ============================================
// INICIALIZAÇÃO DO SERVIDOR HTTP
// ============================================
app.listen(port, '0.0.0.0', async () => {
  console.log('================================================');
  console.log('🚀 SISTEMA DE RECEPÇÃO EMPRESARIAL');
  console.log('   VERSÃO HTTP + STREAMING DE CÂMERA');
  console.log('================================================');
  console.log(`✅ Servidor HTTP rodando na porta ${port}`);
  console.log(`⏰ Iniciado em: ${new Date().toLocaleString('pt-BR')}`);
  
  try {
    await pool.query('SELECT 1');
    console.log('✅ Banco de dados conectado');
    console.log('✅ bcrypt habilitado para validação de senhas');
  } catch (err) {
    console.error('❌ Erro ao conectar ao banco:', err.message);
  }

  // Inicia o streaming da câmera (se configurado no .env)
  iniciarStreamCamera();

  console.log('================================================');
});