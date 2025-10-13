CREATE DATABASE IF NOT EXISTS sistema_chamadas 
  DEFAULT CHARACTER SET utf8mb4 
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE sistema_chamadas;

CREATE TABLE IF NOT EXISTS operadores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    usuario VARCHAR(100) NOT NULL UNIQUE,
    senha VARCHAR(255) NOT NULL,
    tipo_acesso ENUM('administrator', 'dp', 'op') NOT NULL,
    ativo BOOLEAN DEFAULT TRUE,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ultimo_acesso TIMESTAMP NULL,
    INDEX idx_usuario (usuario),
    INDEX idx_tipo_acesso (tipo_acesso)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS chamadas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    setor VARCHAR(100) NOT NULL,
    operador_id INT NULL,
    data_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'chamando',
    INDEX idx_data_hora (data_hora DESC),
    INDEX idx_setor (setor),
    INDEX idx_operador (operador_id),
    FOREIGN KEY (operador_id) REFERENCES operadores(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO operadores (nome, usuario, senha, tipo_acesso) VALUES 
('Administrador do Sistema', 'admin', '123456', 'administrator'),
('Operador DP 1', 'dp1', '123456', 'dp'),
('Operador DP 2', 'dp2', '123456', 'dp'),
('Operador Operacional 1', 'op1', '123456', 'op'),
('Operador Operacional 2', 'op2', '123456', 'op');

SELECT * FROM operadores;