// server.js - Backend API para Sistema de Chamadas (MySQL)
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');

const app = express();
const port = 3001;

// Configuração do pool de conexões MySQL
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'frd@ConfeMax@2025',
  database: 'sistema_chamadas',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

app.use(cors());
app.use(express.json());

// ADICIONE ESTAS LINHAS AQUI:
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Criar tabela se não existir
const initDB = async () => {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS chamadas (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nome VARCHAR(255) NOT NULL,
      descricao TEXT,
      setor VARCHAR(100) NOT NULL,
      data_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      status VARCHAR(50) DEFAULT 'chamando',
      INDEX idx_data_hora (data_hora DESC),
      INDEX idx_setor (setor),
      INDEX idx_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;
  
  try {
    await pool.query(createTableQuery);
    console.log('Tabela criada/verificada com sucesso');
  } catch (err) {
    console.error('Erro ao criar tabela:', err);
  }
};

// Inicializar banco de dados
initDB();

// Rota para criar uma nova chamada
app.post('/api/chamadas', async (req, res) => {
  const { nome, descricao, setor } = req.body;
  
  try {
    const [result] = await pool.query(
      'INSERT INTO chamadas (nome, descricao, setor) VALUES (?, ?, ?)',
      [nome.toUpperCase(), descricao, setor]
    );
    
    const [rows] = await pool.query(
      'SELECT * FROM chamadas WHERE id = ?',
      [result.insertId]
    );
    
    res.json(rows[0]);
  } catch (err) {
    console.error('Erro ao criar chamada:', err);
    res.status(500).json({ error: 'Erro ao criar chamada' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { usuario, senha } = req.body;
  const [rows] = await pool.query(
    'SELECT id, nome, usuario, tipo_acesso FROM operadores WHERE usuario = ? AND senha = ? AND ativo = 1',
    [usuario, senha]
  );

  if (rows.length === 0) {
    return res.status(401).json({ error: 'Usuário ou senha inválidos' });
  }

  res.json(rows[0]);
});


// Rota para obter a última chamada (para o display)
app.get('/api/chamadas/ultima', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM chamadas ORDER BY data_hora DESC LIMIT 1'
    );
    
    res.json(rows[0] || null);
  } catch (err) {
    console.error('Erro ao buscar última chamada:', err);
    res.status(500).json({ error: 'Erro ao buscar chamada' });
  }
});

// Rota para obter histórico de chamadas
app.get('/api/chamadas', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM chamadas ORDER BY data_hora DESC LIMIT 50'
    );
    
    res.json(rows);
  } catch (err) {
    console.error('Erro ao buscar chamadas:', err);
    res.status(500).json({ error: 'Erro ao buscar chamadas' });
  }
});

// Rota para atualizar status da chamada
app.put('/api/chamadas/:id', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  try {
    await pool.query(
      'UPDATE chamadas SET status = ? WHERE id = ?',
      [status, id]
    );
    
    const [rows] = await pool.query(
      'SELECT * FROM chamadas WHERE id = ?',
      [id]
    );
    
    res.json(rows[0]);
  } catch (err) {
    console.error('Erro ao atualizar chamada:', err);
    res.status(500).json({ error: 'Erro ao atualizar chamada' });
  }
});

// Rota de teste de conexão
app.get('/api/status', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', message: 'Banco de dados conectado' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Erro na conexão' });
  }
});

app.listen(port, "0.0.0.0", () => {
  console.log("Servidor rodando em http://192.167.2.41:3001");
});

