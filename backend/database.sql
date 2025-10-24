-- ============================================
-- SISTEMA DE RECEPÇÃO EMPRESARIAL
-- VERSÃO COM BCRYPT HASH (PRODUÇÃO)
-- MySQL 8.0+
-- CAMPO MATRÍCULA MOVIDO PARA TABELA VISITANTES
-- ============================================

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
    nome VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_nome (nome)
) ENGINE=InnoDB;

INSERT INTO departamentos (nome) VALUES 
('Administrator'),
('Departamento Operacional'),
('Departamento Pessoal'),
('Recepçao');


-- ============================================
-- TABELA 2: usuarios
-- ============================================
CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    login VARCHAR(100) NOT NULL UNIQUE,
    senha VARCHAR(255) NOT NULL,
    perfil ENUM('recepcionista', 'departamento', 'painel', 'administrador') NOT NULL,
    departamento_id INT NULL,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (departamento_id) REFERENCES departamentos(id) ON DELETE SET NULL,
    INDEX idx_login (login),
    INDEX idx_perfil (perfil),
    INDEX idx_ativo (ativo)
) ENGINE=InnoDB;

-- Usuários com senha em BCRYPT HASH
-- Todos com senha: 123456
-- Hash gerado com: bcrypt.hashSync('123456', 10)
INSERT INTO usuarios (nome, login, senha, perfil, departamento_id) VALUES
('Administrador', 'admin', '$2b$10$ZeoSeLKoxIxwbjLr3Oq7ceckrj44ldIsN8zv3jd0/MRVW3tnwGZum', 'administrador', 1),
('Operador Departamento Pessoal', 'dp1', '$2b$10$l99Oh15gAWMRSW0jpXpXaukSuZXbyeKn3lQxDU0EDc7jDZuUr7ncy', 'departamento', 3),
('Operador Departamento Operacional', 'op1', '$2b$10$l99Oh15gAWMRSW0jpXpXaukSuZXbyeKn3lQxDU0EDc7jDZuUr7ncy', 'departamento', 2),
('Painel TV', 'painel', '$2b$10$l99Oh15gAWMRSW0jpXpXaukSuZXbyeKn3lQxDU0EDc7jDZuUr7ncy', 'painel', 4),
('Recepção', 'recepcao', '$2b$10$l99Oh15gAWMRSW0jpXpXaukSuZXbyeKn3lQxDU0EDc7jDZuUr7ncy', 'recepcionista', 4);

-- NOTA: Para usar esta versão, você precisa modificar o server.js para usar bcrypt.compare()

-- ============================================
-- TABELA 3: visitantes (COM MATRÍCULA)
-- ============================================
CREATE TABLE visitantes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    cpf CHAR(11) NOT NULL UNIQUE,
    matricula VARCHAR(50) NULL,
    data_cadastro DATETIME DEFAULT CURRENT_TIMESTAMP,
    ativo BOOLEAN DEFAULT TRUE,
    
    INDEX idx_cpf (cpf),
    INDEX idx_nome (nome),
    INDEX idx_matricula (matricula),
    INDEX idx_ativo (ativo)
) ENGINE=InnoDB;

-- ============================================
-- TABELA 4: visitas (3 ESTADOS) - SEM OBSERVAÇÃO
-- ============================================
CREATE TABLE visitas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    visitante_id INT NOT NULL,
    departamento_id INT NOT NULL,
    usuario_id INT NULL,
    motivo TEXT,
    status ENUM('aguardando', 'chamado', 'finalizado') DEFAULT 'aguardando',
    hora_chegada DATETIME DEFAULT CURRENT_TIMESTAMP,
    hora_chamada DATETIME NULL,
    hora_saida DATETIME NULL,
    
    FOREIGN KEY (visitante_id) REFERENCES visitantes(id) ON DELETE CASCADE,
    FOREIGN KEY (departamento_id) REFERENCES departamentos(id) ON DELETE RESTRICT,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
    
    INDEX idx_status (status),
    INDEX idx_hora_chegada (hora_chegada DESC),
    INDEX idx_hora_chamada (hora_chamada DESC),
    INDEX idx_visitante (visitante_id),
    INDEX idx_departamento (departamento_id)
) ENGINE=InnoDB;

-- ============================================
-- VIEW: visitas_completas (COM MATRÍCULA)
-- ============================================
CREATE VIEW visitas_completas AS
SELECT 
    v.id AS visita_id,
    v.status,
    v.motivo,
    v.hora_chegada,
    v.hora_chamada,
    v.hora_saida,
    vi.id AS visitante_id,
    vi.nome AS visitante_nome,
    vi.cpf AS visitante_cpf,
    vi.matricula AS visitante_matricula,
    d.id AS departamento_id,
    d.nome AS departamento_nome,
    u.id AS usuario_id,
    u.nome AS usuario_nome,
    u.perfil AS usuario_perfil
FROM visitas v
INNER JOIN visitantes vi ON v.visitante_id = vi.id
INNER JOIN departamentos d ON v.departamento_id = d.id
LEFT JOIN usuarios u ON v.usuario_id = u.id
ORDER BY v.hora_chegada DESC;

-- ============================================
-- STORED PROCEDURE: Registrar Visita (ATUALIZADA)
-- ============================================
DROP PROCEDURE IF EXISTS sp_registrar_visita;

DELIMITER $$

CREATE PROCEDURE sp_registrar_visita(
    IN p_cpf CHAR(11),
    IN p_nome VARCHAR(255),
    IN p_matricula VARCHAR(50),
    IN p_departamento_id INT,
    IN p_motivo TEXT,
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
    
    -- Busca visitante pelo CPF
    SELECT id INTO p_visitante_id FROM visitantes WHERE cpf = p_cpf;
    
    -- Se não existe, cria novo visitante
    IF p_visitante_id IS NULL THEN
        INSERT INTO visitantes (nome, cpf, matricula) 
        VALUES (UPPER(p_nome), p_cpf, p_matricula);
        SET p_visitante_id = LAST_INSERT_ID();
    ELSE
        -- Se existe, atualiza os dados (incluindo matrícula)
        UPDATE visitantes 
        SET nome = UPPER(p_nome), 
            matricula = p_matricula,
            ativo = TRUE 
        WHERE id = p_visitante_id;
    END IF;
    
    -- Registra a visita (sem observacao)
    INSERT INTO visitas (visitante_id, departamento_id, motivo, usuario_id, status) 
    VALUES (p_visitante_id, p_departamento_id, p_motivo, p_usuario_id, 'aguardando');
    
    SET p_visita_id = LAST_INSERT_ID();
    COMMIT;
END$$

DELIMITER ;

-- ============================================
-- TRIGGER: Timestamps automáticos
-- ============================================
DROP TRIGGER IF EXISTS trg_visita_status_update;

DELIMITER $$

CREATE TRIGGER trg_visita_status_update
BEFORE UPDATE ON visitas
FOR EACH ROW
BEGIN
    IF NEW.status = 'chamado' AND OLD.status = 'aguardando' THEN
        IF NEW.hora_chamada IS NULL THEN
            SET NEW.hora_chamada = NOW();
        END IF;
    END IF;
    
    IF NEW.status = 'finalizado' AND OLD.status = 'chamado' THEN
        IF NEW.hora_saida IS NULL THEN
            SET NEW.hora_saida = NOW();
        END IF;
    END IF;
END$$

DELIMITER ;

-- ============================================
-- VERIFICAÇÃO
-- ============================================
SELECT 'Departamentos:' AS info, COUNT(*) AS total FROM departamentos;
SELECT 'Usuários:' AS info, COUNT(*) AS total FROM usuarios;

SELECT '=== CREDENCIAIS (BCRYPT) ===' AS '';
SELECT 'Todos os usuários têm senha: 123456' AS '';
SELECT login, perfil FROM usuarios;

SELECT '=== ESTRUTURA ATUALIZADA ===' AS '';
SELECT 'Campo MATRÍCULA agora está na tabela VISITANTES' AS '';
SELECT 'Campo OBSERVAÇÃO removido da tabela VISITAS' AS '';