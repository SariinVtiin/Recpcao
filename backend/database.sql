-- ============================================
-- SISTEMA DE RECEPÇÃO EMPRESARIAL
-- Banco de Dados - VERSÃO PRODUÇÃO
-- MySQL 8.0+
-- Backend: Node.js + Express
-- Versão: 2.0 Final
-- ============================================

-- Limpar banco existente (CUIDADO: Apaga todos os dados!)
DROP DATABASE IF EXISTS sistema_chamadas;

CREATE DATABASE sistema_chamadas 
    CHARACTER SET utf8mb4 
    COLLATE utf8mb4_unicode_ci;

USE sistema_chamadas;

-- ============================================
-- TABELA 1: departamentos
-- ============================================
CREATE TABLE departamentos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL UNIQUE COMMENT 'Nome do departamento',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_nome (nome)
) ENGINE=InnoDB COMMENT='Departamentos da empresa';

-- Dados fixos (obrigatórios)
INSERT INTO departamentos (nome) VALUES 
('Departamento Operacional'),
('Departamento Pessoal');

-- ============================================
-- TABELA 2: usuarios (operadores do sistema)
-- ============================================
CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(255) NOT NULL COMMENT 'Nome completo do operador',
    login VARCHAR(100) NOT NULL UNIQUE COMMENT 'Usuário de acesso',
    senha VARCHAR(255) NOT NULL COMMENT 'Senha (recomendado usar hash)',
    perfil ENUM('recepcionista', 'departamento', 'painel', 'administrador') NOT NULL 
        COMMENT 'Nível de acesso: administrador, recepcionista, departamento, painel',
    departamento_id INT NULL COMMENT 'FK para departamentos (se perfil = departamento)',
    ativo BOOLEAN DEFAULT TRUE COMMENT 'Usuário ativo no sistema',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (departamento_id) 
        REFERENCES departamentos(id) 
        ON DELETE SET NULL,
    
    INDEX idx_login (login),
    INDEX idx_perfil (perfil),
    INDEX idx_ativo (ativo)
) ENGINE=InnoDB COMMENT='Operadores do sistema';

-- Usuário administrador padrão (obrigatório)
INSERT INTO usuarios (nome, login, senha, perfil, departamento_id) VALUES
('Administrador', 'admin', '$2b$10$fYyg.lDczn/Zep7LvutcE.GY8Tx9ECeXGLszXwLuDyA9WfSmmjvB6', 'administrador', NULL);

-- ============================================
-- TABELA 3: visitantes
-- Cadastro único por CPF
-- ============================================
CREATE TABLE visitantes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(255) NOT NULL COMMENT 'Nome completo',
    cpf CHAR(11) NOT NULL UNIQUE COMMENT 'CPF sem pontuação (11 dígitos)',
    data_cadastro DATETIME DEFAULT CURRENT_TIMESTAMP,
    ativo BOOLEAN DEFAULT TRUE COMMENT 'Visitante ativo',
    
    INDEX idx_cpf (cpf),
    INDEX idx_nome (nome),
    INDEX idx_ativo (ativo)
) ENGINE=InnoDB COMMENT='Cadastro único de visitantes por CPF';

-- ============================================
-- TABELA 4: visitas
-- Histórico de cada visita realizada
-- ============================================
CREATE TABLE visitas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    
    -- Relacionamentos
    visitante_id INT NOT NULL COMMENT 'FK para visitantes',
    departamento_id INT NOT NULL COMMENT 'Departamento visitado',
    usuario_id INT NULL COMMENT 'Usuário que registrou',
    
    -- Informações da visita
    motivo TEXT COMMENT 'Motivo da visita',
    status ENUM('aguardando', 'atendido') 
        DEFAULT 'aguardando' 
        COMMENT 'aguardando = na fila | atendido = já foi chamado',
    
    -- Timestamps de controle
    hora_chegada DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT 'Data/hora de chegada',
    hora_chamada DATETIME NULL COMMENT 'Data/hora em que foi chamado',
    hora_saida DATETIME NULL COMMENT 'Data/hora de saída (se aplicável)',
    
    -- Observações
    observacao TEXT NULL COMMENT 'Observações extras',
    
    -- Chaves estrangeiras
    FOREIGN KEY (visitante_id) 
        REFERENCES visitantes(id) 
        ON DELETE CASCADE,
    FOREIGN KEY (departamento_id) 
        REFERENCES departamentos(id) 
        ON DELETE RESTRICT,
    FOREIGN KEY (usuario_id) 
        REFERENCES usuarios(id) 
        ON DELETE SET NULL,
    
    -- Índices para performance
    INDEX idx_status (status),
    INDEX idx_hora_chegada (hora_chegada DESC),
    INDEX idx_hora_chamada (hora_chamada DESC),
    INDEX idx_visitante (visitante_id),
    INDEX idx_departamento (departamento_id)
) ENGINE=InnoDB COMMENT='Registro de cada visita realizada';

-- ============================================
-- VIEW: visitas_completas
-- Facilita consultas com JOIN pré-resolvido
-- ============================================
CREATE VIEW visitas_completas AS
SELECT 
    -- Dados da visita
    v.id AS visita_id,
    v.status,
    v.motivo,
    v.observacao,
    v.hora_chegada,
    v.hora_chamada,
    v.hora_saida,
    
    -- Dados do visitante
    vi.id AS visitante_id,
    vi.nome AS visitante_nome,
    vi.cpf AS visitante_cpf,
    
    -- Dados do departamento
    d.id AS departamento_id,
    d.nome AS departamento_nome,
    
    -- Dados do usuário que registrou
    u.id AS usuario_id,
    u.nome AS usuario_nome,
    u.perfil AS usuario_perfil
    
FROM visitas v
INNER JOIN visitantes vi ON v.visitante_id = vi.id
INNER JOIN departamentos d ON v.departamento_id = d.id
LEFT JOIN usuarios u ON v.usuario_id = u.id
ORDER BY v.hora_chegada DESC;

-- ============================================
-- STORED PROCEDURE: Registrar Visita
-- Busca ou cria visitante por CPF
-- ============================================

DROP PROCEDURE IF EXISTS sp_registrar_visita;

DELIMITER $$

CREATE PROCEDURE sp_registrar_visita(
    IN p_cpf CHAR(11),
    IN p_nome VARCHAR(255),
    IN p_departamento_id INT,
    IN p_motivo TEXT,
    IN p_observacao TEXT,
    IN p_usuario_id INT,
    OUT p_visita_id INT,
    OUT p_visitante_id INT
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    START TRANSACTION;
    
    -- Busca visitante por CPF
    SELECT id INTO p_visitante_id 
    FROM visitantes 
    WHERE cpf = p_cpf;
    
    -- Se não existe, cria novo
    IF p_visitante_id IS NULL THEN
        INSERT INTO visitantes (nome, cpf) 
        VALUES (UPPER(p_nome), p_cpf);
        
        SET p_visitante_id = LAST_INSERT_ID();
    ELSE
        -- Atualiza nome se mudou
        UPDATE visitantes 
        SET nome = UPPER(p_nome), ativo = TRUE
        WHERE id = p_visitante_id;
    END IF;
    
    -- Cria a visita
    INSERT INTO visitas (
        visitante_id, 
        departamento_id, 
        motivo, 
        observacao,
        usuario_id,
        status
    ) VALUES (
        p_visitante_id, 
        p_departamento_id, 
        p_motivo,
        p_observacao,
        p_usuario_id,
        'aguardando'
    );
    
    SET p_visita_id = LAST_INSERT_ID();
    
    COMMIT;
END$$

DELIMITER ;

-- ============================================
-- TRIGGER: Atualização automática de timestamps
-- ============================================

DELIMITER $$

DROP TRIGGER IF EXISTS trg_visita_status_update$

CREATE TRIGGER trg_visita_status_update
BEFORE UPDATE ON visitas
FOR EACH ROW
BEGIN
    -- Quando status muda para 'atendido' (chamada)
    IF NEW.status = 'atendido' AND OLD.status = 'aguardando' THEN
        -- Define hora_chamada se ainda não foi definida
        IF NEW.hora_chamada IS NULL THEN
            SET NEW.hora_chamada = NOW();
        END IF;
    END IF;
    
    -- Quando volta para 'aguardando' (rechamada)
    IF NEW.status = 'aguardando' AND OLD.status = 'atendido' THEN
        -- Não altera hora_chamada (mantém histórico)
        -- hora_saida já foi limpa no UPDATE
    END IF;
END$

DELIMITER ;

-- ============================================
-- VERIFICAÇÃO DE INTEGRIDADE
-- ============================================

SELECT '============================================' as '';
SELECT 'VERIFICAÇÃO DO BANCO DE DADOS' as '';
SELECT '============================================' as '';
SELECT '' as '';

SELECT 'Departamentos cadastrados:' AS info, COUNT(*) AS total FROM departamentos;
SELECT 'Usuários ativos:' AS info, COUNT(*) AS total FROM usuarios WHERE ativo = 1;
SELECT 'Visitantes cadastrados:' AS info, COUNT(*) AS total FROM visitantes;
SELECT 'Visitas registradas:' AS info, COUNT(*) AS total FROM visitas;

SELECT '' as '';
SELECT '============================================' as '';
SELECT '✅ BANCO DE DADOS CRIADO COM SUCESSO!' as '';
SELECT '============================================' as '';
SELECT '' as '';

SELECT 'Credenciais padrão:' as '';
SELECT '  Login: admin' as '';
SELECT '  Senha: 123456' as '';
SELECT '  ⚠️  ALTERE A SENHA APÓS PRIMEIRO ACESSO!' as '';

SELECT '' as '';
SELECT 'Próximo passo: Iniciar backend (node server.js)' as '';
SELECT '============================================' as '';

-- ============================================
-- FIM DO SCRIPT
-- ============================================















































-----------------------------------------------
-----------------------------------------------

-- ============================================
-- SISTEMA DE RECEPÇÃO EMPRESARIAL
-- Banco de Dados Completo - 3 ESTADOS
-- MySQL 8.0+
-- Backend: Node.js + Express + Bcrypt
-- Versão: 2.0 Final
-- ============================================

-- Limpar banco existente (CUIDADO: Apaga todos os dados!)
DROP DATABASE IF EXISTS sistema_chamadas;

CREATE DATABASE sistema_chamadas 
    CHARACTER SET utf8mb4 
    COLLATE utf8mb4_unicode_ci;

USE sistema_chamadas;

-- ============================================
-- TABELA 1: departamentos
-- ============================================
CREATE TABLE departamentos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL UNIQUE COMMENT 'Nome do departamento',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_nome (nome)
) ENGINE=InnoDB COMMENT='Departamentos da empresa';

-- Dados fixos (obrigatórios)
INSERT INTO departamentos (nome) VALUES 
('Departamento Operacional'),
('Departamento Pessoal');

-- ============================================
-- TABELA 2: usuarios (operadores do sistema)
-- ============================================
CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(255) NOT NULL COMMENT 'Nome completo do operador',
    login VARCHAR(100) NOT NULL UNIQUE COMMENT 'Usuário de acesso',
    senha VARCHAR(255) NOT NULL COMMENT 'Senha com hash bcrypt',
    perfil ENUM('recepcionista', 'departamento', 'painel', 'administrador') NOT NULL 
        COMMENT 'Nível de acesso: administrador, recepcionista, departamento, painel',
    departamento_id INT NULL COMMENT 'FK para departamentos (se perfil = departamento)',
    ativo BOOLEAN DEFAULT TRUE COMMENT 'Usuário ativo no sistema',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (departamento_id) 
        REFERENCES departamentos(id) 
        ON DELETE SET NULL,
    
    INDEX idx_login (login),
    INDEX idx_perfil (perfil),
    INDEX idx_ativo (ativo)
) ENGINE=InnoDB COMMENT='Operadores do sistema';

-- Usuário administrador padrão (senha será migrada para hash pelo backend)
INSERT INTO usuarios (nome, login, senha, perfil, departamento_id) VALUES
('Administrador', 'admin', '$2b$10$fYyg.lDczn/Zep7LvutcE.GY8Tx9ECeXGLszXwLuDyA9WfSmmjvB6', 'administrador', NULL);

-- ============================================
-- TABELA 3: visitantes
-- Cadastro único por CPF
-- ============================================
CREATE TABLE visitantes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(255) NOT NULL COMMENT 'Nome completo',
    cpf CHAR(11) NOT NULL UNIQUE COMMENT 'CPF sem pontuação (11 dígitos)',
    data_cadastro DATETIME DEFAULT CURRENT_TIMESTAMP,
    ativo BOOLEAN DEFAULT TRUE COMMENT 'Visitante ativo',
    
    INDEX idx_cpf (cpf),
    INDEX idx_nome (nome),
    INDEX idx_ativo (ativo)
) ENGINE=InnoDB COMMENT='Cadastro único de visitantes por CPF';

-- ============================================
-- TABELA 4: visitas (COM 3 ESTADOS)
-- Histórico de cada visita realizada
-- ============================================
CREATE TABLE visitas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    
    -- Relacionamentos
    visitante_id INT NOT NULL COMMENT 'FK para visitantes',
    departamento_id INT NOT NULL COMMENT 'Departamento visitado',
    usuario_id INT NULL COMMENT 'Usuário que registrou',
    
    -- Informações da visita
    motivo TEXT COMMENT 'Motivo da visita',
    status ENUM('aguardando', 'chamado', 'atendido') 
        DEFAULT 'aguardando' 
        COMMENT 'aguardando = na fila | chamado = em atendimento | atendido = finalizado',
    
    -- Timestamps de controle
    hora_chegada DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT 'Data/hora de chegada',
    hora_chamada DATETIME NULL COMMENT 'Data/hora em que foi chamado',
    hora_saida DATETIME NULL COMMENT 'Data/hora de saída/finalização',
    
    -- Observações
    observacao TEXT NULL COMMENT 'Observações extras',
    
    -- Chaves estrangeiras
    FOREIGN KEY (visitante_id) 
        REFERENCES visitantes(id) 
        ON DELETE CASCADE,
    FOREIGN KEY (departamento_id) 
        REFERENCES departamentos(id) 
        ON DELETE RESTRICT,
    FOREIGN KEY (usuario_id) 
        REFERENCES usuarios(id) 
        ON DELETE SET NULL,
    
    -- Índices para performance
    INDEX idx_status (status),
    INDEX idx_hora_chegada (hora_chegada DESC),
    INDEX idx_hora_chamada (hora_chamada DESC),
    INDEX idx_visitante (visitante_id),
    INDEX idx_departamento (departamento_id)
) ENGINE=InnoDB COMMENT='Registro de cada visita realizada - 3 estados';

-- ============================================
-- VIEW: visitas_completas
-- Facilita consultas com JOIN pré-resolvido
-- ============================================
CREATE VIEW visitas_completas AS
SELECT 
    -- Dados da visita
    v.id AS visita_id,
    v.status,
    v.motivo,
    v.observacao,
    v.hora_chegada,
    v.hora_chamada,
    v.hora_saida,
    
    -- Dados do visitante
    vi.id AS visitante_id,
    vi.nome AS visitante_nome,
    vi.cpf AS visitante_cpf,
    
    -- Dados do departamento
    d.id AS departamento_id,
    d.nome AS departamento_nome,
    
    -- Dados do usuário que registrou
    u.id AS usuario_id,
    u.nome AS usuario_nome,
    u.perfil AS usuario_perfil
    
FROM visitas v
INNER JOIN visitantes vi ON v.visitante_id = vi.id
INNER JOIN departamentos d ON v.departamento_id = d.id
LEFT JOIN usuarios u ON v.usuario_id = u.id
ORDER BY v.hora_chegada DESC;

-- ============================================
-- STORED PROCEDURE: Registrar Visita
-- Busca ou cria visitante por CPF
-- ============================================

DROP PROCEDURE IF EXISTS sp_registrar_visita;

DELIMITER $$

CREATE PROCEDURE sp_registrar_visita(
    IN p_cpf CHAR(11),
    IN p_nome VARCHAR(255),
    IN p_departamento_id INT,
    IN p_motivo TEXT,
    IN p_observacao TEXT,
    IN p_usuario_id INT,
    OUT p_visita_id INT,
    OUT p_visitante_id INT
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    START TRANSACTION;
    
    -- Busca visitante por CPF
    SELECT id INTO p_visitante_id 
    FROM visitantes 
    WHERE cpf = p_cpf;
    
    -- Se não existe, cria novo
    IF p_visitante_id IS NULL THEN
        INSERT INTO visitantes (nome, cpf) 
        VALUES (UPPER(p_nome), p_cpf);
        
        SET p_visitante_id = LAST_INSERT_ID();
    ELSE
        -- Atualiza nome se mudou
        UPDATE visitantes 
        SET nome = UPPER(p_nome), ativo = TRUE
        WHERE id = p_visitante_id;
    END IF;
    
    -- Cria a visita com status 'aguardando'
    INSERT INTO visitas (
        visitante_id, 
        departamento_id, 
        motivo, 
        observacao,
        usuario_id,
        status
    ) VALUES (
        p_visitante_id, 
        p_departamento_id, 
        p_motivo,
        p_observacao,
        p_usuario_id,
        'aguardando'
    );
    
    SET p_visita_id = LAST_INSERT_ID();
    
    COMMIT;
END$$

DELIMITER ;

-- ============================================
-- TRIGGER: Atualização automática de timestamps
-- SUPORTA 3 ESTADOS
-- ============================================

DROP TRIGGER IF EXISTS trg_visita_status_update;

DELIMITER $$

CREATE TRIGGER trg_visita_status_update
BEFORE UPDATE ON visitas
FOR EACH ROW
BEGIN
    -- TRANSIÇÃO: aguardando → chamado (primeira chamada)
    IF NEW.status = 'chamado' AND OLD.status = 'aguardando' THEN
        IF NEW.hora_chamada IS NULL THEN
            SET NEW.hora_chamada = NOW();
        END IF;
    END IF;
    
    -- TRANSIÇÃO: chamado → atendido (finalização)
    IF NEW.status = 'atendido' AND OLD.status = 'chamado' THEN
        IF NEW.hora_saida IS NULL THEN
            SET NEW.hora_saida = NOW();
        END IF;
    END IF;
    
    -- TRANSIÇÃO: chamado → aguardando (rechamada - visitante não veio)
    IF NEW.status = 'aguardando' AND OLD.status = 'chamado' THEN
        -- Mantém hora_chamada (histórico)
        -- hora_saida deve ser NULL (limpa no UPDATE)
    END IF;
END$

DELIMITER ;

-- ============================================
-- VERIFICAÇÃO DE INTEGRIDADE
-- ============================================

SELECT '============================================' as '';
SELECT 'VERIFICAÇÃO DO BANCO DE DADOS' as '';
SELECT '============================================' as '';
SELECT '' as '';

SELECT 'Departamentos cadastrados:' AS info, COUNT(*) AS total FROM departamentos;
SELECT 'Usuários ativos:' AS info, COUNT(*) AS total FROM usuarios WHERE ativo = 1;
SELECT 'Visitantes cadastrados:' AS info, COUNT(*) AS total FROM visitantes;
SELECT 'Visitas registradas:' AS info, COUNT(*) AS total FROM visitas;

SELECT '' as '';
SELECT '============================================' as '';
SELECT 'VERIFICAÇÃO DA COLUNA STATUS (3 ESTADOS)' as '';
SELECT '============================================' as '';

SHOW COLUMNS FROM visitas LIKE 'status';

SELECT '' as '';
SELECT '============================================' as '';
SELECT '✅ BANCO DE DADOS CRIADO COM SUCESSO!' as '';
SELECT '============================================' as '';
SELECT '' as '';

SELECT 'Credenciais padrão:' as '';
SELECT '  Login: admin' as '';
SELECT '  Senha: 123456' as '';
SELECT '  ⚠️  Senha será convertida para hash bcrypt ao iniciar o backend!' as '';

SELECT '' as '';
SELECT '🎯 FLUXO DE 3 ESTADOS:' as '';
SELECT '   1. AGUARDANDO (laranja) - Visitante na fila' as '';
SELECT '   2. CHAMADO (azul) - Visitante em atendimento' as '';
SELECT '   3. ATENDIDO (verde) - Atendimento finalizado' as '';

SELECT '' as '';
SELECT 'Próximo passo: Iniciar backend' as '';
SELECT '   npm install bcrypt' as '';
SELECT '   npm start' as '';
SELECT '============================================' as '';

-- ============================================
-- QUERIES ÚTEIS PARA O SISTEMA
-- ============================================

-- Listar visitantes AGUARDANDO por departamento
-- SELECT * FROM visitas_completas 
-- WHERE status = 'aguardando' AND departamento_id = ?
-- ORDER BY hora_chegada ASC;

-- Listar visitantes CHAMADOS (em atendimento) por departamento
-- SELECT * FROM visitas_completas 
-- WHERE status = 'chamado' AND departamento_id = ?
-- ORDER BY hora_chamada DESC;

-- Última chamada (para painel TV)
-- SELECT * FROM visitas_completas 
-- WHERE status = 'chamado'
-- ORDER BY hora_chamada DESC 
-- LIMIT 1;

-- Histórico ATENDIDOS do dia
-- SELECT * FROM visitas_completas
-- WHERE status = 'atendido' 
--   AND DATE(hora_chegada) = CURDATE()
-- ORDER BY hora_saida DESC;

-- Estatísticas com 3 estados
-- SELECT 
--     departamento_nome,
--     COUNT(*) as total_visitas,
--     SUM(CASE WHEN status = 'atendido' THEN 1 ELSE 0 END) as atendidos,
--     SUM(CASE WHEN status = 'chamado' THEN 1 ELSE 0 END) as em_atendimento,
--     SUM(CASE WHEN status = 'aguardando' THEN 1 ELSE 0 END) as aguardando
-- FROM visitas_completas
-- WHERE DATE(hora_chegada) = CURDATE()
-- GROUP BY departamento_id, departamento_nome;

-- ============================================
-- FIM DO SCRIPT
-- ============================================

