-- ============================================
-- SISTEMA DE RECEPÇÃO EMPRESARIAL
-- Banco de Dados: MySQL 8.0+
-- Backend: Node.js + Express
-- Versão: Conforme Documentação Oficial
-- ============================================

DROP DATABASE IF EXISTS sistema_chamadas;
CREATE DATABASE sistema_chamadas 
    CHARACTER SET utf8mb4 
    COLLATE utf8mb4_unicode_ci;

USE sistema_chamadas;

-- ============================================
-- TABELA 1: departamentos
-- Seção 6 da Documentação
-- ============================================
CREATE TABLE departamentos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL UNIQUE COMMENT 'Operacional ou Pessoal',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_nome (nome)
) ENGINE=InnoDB COMMENT='Departamentos da empresa';

-- Dados fixos conforme documentação
INSERT INTO departamentos (nome) VALUES 
('Departamento Operacional'),
('Departamento Pessoal');

-- ============================================
-- TABELA 2: usuarios (operadores do sistema)
-- Seção 6 da Documentação - RF006, RF007
-- ============================================
CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(255) NOT NULL COMMENT 'Nome completo do operador',
    login VARCHAR(100) NOT NULL UNIQUE COMMENT 'Usuário de acesso',
    senha VARCHAR(255) NOT NULL COMMENT 'Senha (hash recomendado)',
    perfil ENUM('recepcionista', 'departamento', 'painel', 'administrador') NOT NULL 
        COMMENT 'Nível de acesso do usuário',
    departamento_id INT NULL COMMENT 'FK para departamentos (se aplicável)',
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (departamento_id) 
        REFERENCES departamentos(id) 
        ON DELETE SET NULL,
    
    INDEX idx_login (login),
    INDEX idx_perfil (perfil),
    INDEX idx_ativo (ativo)
) ENGINE=InnoDB COMMENT='Operadores do sistema';

-- Usuários padrão (RF006)
INSERT INTO usuarios (nome, login, senha, perfil, departamento_id) VALUES
('Administrador', 'admin', '123456', 'administrador', NULL),
('Operador Departamento Pessoal', 'dp1', '123456', 'departamento', 2),
('Operador Departamento Operacional', 'op1', '123456', 'departamento', 1),
('Painel TV', 'painel', '123456', 'painel', NULL);

-- ============================================
-- TABELA 3: visitantes
-- Seção 6 da Documentação - RF001
-- Cadastro único por CPF
-- ============================================
CREATE TABLE visitantes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(255) NOT NULL COMMENT 'Nome completo',
    cpf CHAR(11) NOT NULL UNIQUE COMMENT 'CPF sem pontuação',
    data_cadastro DATETIME DEFAULT CURRENT_TIMESTAMP,
    ativo BOOLEAN DEFAULT TRUE COMMENT 'Visitante ativo no sistema',
    
    INDEX idx_cpf (cpf),
    INDEX idx_nome (nome),
    INDEX idx_ativo (ativo)
) ENGINE=InnoDB COMMENT='Cadastro de visitantes (único por CPF)';

-- ============================================
-- TABELA 4: visitas
-- Seção 6 da Documentação - RF001, RF005
-- Cada visita realizada pelo visitante
-- ============================================
CREATE TABLE visitas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    
    -- Relacionamentos
    visitante_id INT NOT NULL COMMENT 'FK para visitantes',
    departamento_id INT NOT NULL COMMENT 'Departamento visitado',
    usuario_id INT NULL COMMENT 'Usuário que registrou a visita',
    
    -- Informações da visita
    motivo TEXT COMMENT 'Motivo da visita',
    status ENUM('aguardando', 'chamado', 'atendido') 
        DEFAULT 'aguardando' 
        COMMENT 'Estado atual da visita',
    
    -- Timestamps de controle (RF005)
    hora_chegada DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT 'Data/hora de chegada',
    hora_chamada DATETIME NULL COMMENT 'Data/hora em que foi chamado',
    hora_saida DATETIME NULL COMMENT 'Data/hora de encerramento',
    
    -- Observações adicionais
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
    INDEX idx_visitante (visitante_id),
    INDEX idx_departamento (departamento_id)
) ENGINE=InnoDB COMMENT='Registro de cada visita realizada';

-- ============================================
-- VIEW: visitas_completas
-- Facilita consultas com JOIN já resolvido
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
-- RF001 - Cadastro automatizado
-- ============================================
DELIMITER //

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
    
    -- Busca ou cria visitante
    SELECT id INTO p_visitante_id 
    FROM visitantes 
    WHERE cpf = p_cpf;
    
    IF p_visitante_id IS NULL THEN
        -- Cria novo visitante
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
END //

DELIMITER ;

-- ============================================
-- TRIGGER: Atualização automática de timestamps
-- RF004, RF008 - Controle automático
-- ============================================
DELIMITER //

CREATE TRIGGER trg_visita_status_update
BEFORE UPDATE ON visitas
FOR EACH ROW
BEGIN
    -- Quando status muda para 'chamado'
    IF NEW.status = 'chamado' AND OLD.status = 'aguardando' THEN
        SET NEW.hora_chamada = NOW();
    END IF;
    
    -- Quando status muda para 'atendido'
    IF NEW.status = 'atendido' AND OLD.status IN ('aguardando', 'chamado') THEN
        IF NEW.hora_chamada IS NULL THEN
            SET NEW.hora_chamada = NOW();
        END IF;
        SET NEW.hora_saida = NOW();
    END IF;
END //

DELIMITER ;

-- ============================================
-- DADOS DE TESTE (Opcional - pode remover)
-- ============================================
INSERT INTO visitantes (nome, cpf) VALUES 
('JOÃO SILVA', '12345678901'),
('MARIA SANTOS', '98765432109'),
('PEDRO OLIVEIRA', '11122233344');

INSERT INTO visitas (visitante_id, departamento_id, motivo, usuario_id, status) VALUES 
(1, 1, 'Entrega de documentos', 1, 'aguardando'),
(2, 2, 'Consulta sobre benefícios', 1, 'aguardando'),
(3, 1, 'Reunião agendada', 1, 'chamado');

-- Simula uma chamada
UPDATE visitas SET status = 'chamado' WHERE id = 3;

-- ============================================
-- QUERIES ÚTEIS PARA O BACKEND
-- ============================================

-- RF002: Listar visitantes aguardando por departamento
-- SELECT * FROM visitas_completas 
-- WHERE status = 'aguardando' AND departamento_id = ?
-- ORDER BY hora_chegada ASC;

-- RF003: Última chamada (para painel)
-- SELECT * FROM visitas_completas 
-- WHERE status = 'chamado'
-- ORDER BY hora_chamada DESC 
-- LIMIT 1;

-- RF009: Relatório por período
-- SELECT * FROM visitas_completas
-- WHERE DATE(hora_chegada) BETWEEN ? AND ?
-- ORDER BY hora_chegada DESC;

-- RF009: Histórico de visitante por CPF
-- SELECT * FROM visitas_completas
-- WHERE visitante_cpf = ?
-- ORDER BY hora_chegada DESC;

-- Estatísticas do dia
-- SELECT 
--     departamento_nome,
--     COUNT(*) as total_visitas,
--     SUM(CASE WHEN status = 'atendido' THEN 1 ELSE 0 END) as atendidos,
--     SUM(CASE WHEN status = 'aguardando' THEN 1 ELSE 0 END) as aguardando
-- FROM visitas_completas
-- WHERE DATE(hora_chegada) = CURDATE()
-- GROUP BY departamento_id, departamento_nome;

-- ============================================
-- VERIFICAÇÃO DE INTEGRIDADE
-- ============================================
SELECT 'Departamentos cadastrados:' AS info, COUNT(*) AS total FROM departamentos;
SELECT 'Usuários cadastrados:' AS info, COUNT(*) AS total FROM usuarios;
SELECT 'Visitantes cadastrados:' AS info, COUNT(*) AS total FROM visitantes;
SELECT 'Visitas registradas:' AS info, COUNT(*) AS total FROM visitas;

-- ============================================
-- FIM DO SCRIPT
-- ============================================