-- ============================================
-- SISTEMA DE RECEPÇÃO EMPRESARIAL
-- Banco de Dados Completo e Atualizado
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

-- Dados fixos
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

-- Usuários padrão
INSERT INTO usuarios (nome, login, senha, perfil, departamento_id) VALUES
('Administrador', 'admin', '123456', 'administrador', NULL),
('Operador Departamento Pessoal', 'dp1', '123456', 'departamento', 2),
('Operador Departamento Operacional', 'op1', '123456', 'departamento', 1),
('Painel TV', 'painel', '123456', 'painel', NULL);

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
END$

DELIMITER ;

-- ============================================
-- TRIGGER: Atualização automática de timestamps
-- ============================================

DROP TRIGGER IF EXISTS trg_visita_status_update;

DELIMITER $$

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
-- DADOS DE TESTE (Opcional - pode remover)
-- ============================================

-- Visitantes de exemplo
INSERT INTO visitantes (nome, cpf) VALUES 
('JOÃO DA SILVA', '12345678901'),
('MARIA SANTOS', '98765432109'),
('PEDRO OLIVEIRA', '11122233344'),
('ANA COSTA', '44433322211');

-- Visitas de exemplo
INSERT INTO visitas (visitante_id, departamento_id, motivo, observacao, usuario_id, status) VALUES 
-- Aguardando
(1, 1, 'Entrega de documentos', 'Levar pasta azul', 1, 'aguardando'),
(2, 2, 'Consulta sobre benefícios', NULL, 1, 'aguardando'),

-- Já atendidos (histórico)
(3, 1, 'Reunião agendada', NULL, 1, 'atendido'),
(4, 2, 'Solicitação de férias', 'Urgente', 1, 'atendido');

-- Simular chamadas
UPDATE visitas SET status = 'atendido', hora_chamada = NOW() WHERE id IN (3, 4);

-- ============================================
-- QUERIES ÚTEIS PARA O BACKEND
-- ============================================

-- Listar visitantes aguardando por departamento
-- SELECT * FROM visitas_completas 
-- WHERE status = 'aguardando' AND departamento_id = ?
-- ORDER BY hora_chegada ASC;

-- Última chamada (para painel TV)
-- SELECT * FROM visitas_completas 
-- WHERE status = 'atendido' AND hora_chamada IS NOT NULL
-- ORDER BY hora_chamada DESC 
-- LIMIT 1;

-- Histórico do dia por departamento
-- SELECT * FROM visitas_completas
-- WHERE status = 'atendido' 
--   AND departamento_id = ?
--   AND DATE(hora_chegada) = CURDATE()
-- ORDER BY hora_chamada DESC;

-- Relatório por período
-- SELECT * FROM visitas_completas
-- WHERE DATE(hora_chegada) BETWEEN ? AND ?
-- ORDER BY hora_chegada DESC;

-- Histórico de visitante por CPF
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

-- Tempo médio de espera por departamento
-- SELECT 
--     d.nome as departamento,
--     AVG(TIMESTAMPDIFF(MINUTE, v.hora_chegada, v.hora_chamada)) as tempo_medio_minutos
-- FROM visitas v
-- INNER JOIN departamentos d ON v.departamento_id = d.id
-- WHERE v.hora_chamada IS NOT NULL
--   AND DATE(v.hora_chegada) = CURDATE()
-- GROUP BY d.id, d.nome;

-- Visitantes mais frequentes
-- SELECT 
--     vi.nome,
--     vi.cpf,
--     COUNT(*) as total_visitas,
--     MAX(v.hora_chegada) as ultima_visita
-- FROM visitas v
-- INNER JOIN visitantes vi ON v.visitante_id = vi.id
-- GROUP BY vi.id, vi.nome, vi.cpf
-- ORDER BY total_visitas DESC
-- LIMIT 10;

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
SELECT 'Visitas aguardando:' AS info, COUNT(*) AS total FROM visitas WHERE status = 'aguardando';
SELECT 'Visitas atendidas:' AS info, COUNT(*) AS total FROM visitas WHERE status = 'atendido';

SELECT '' as '';
SELECT '============================================' as '';
SELECT '✅ BANCO DE DADOS CRIADO COM SUCESSO!' as '';
SELECT '============================================' as '';
SELECT '' as '';

SELECT 'Usuários de teste:' as '';
SELECT login, perfil FROM usuarios WHERE ativo = 1;

SELECT '' as '';
SELECT 'Próximo passo: node server.js' as '';
SELECT '============================================' as '';

-- ============================================
-- COMANDOS ÚTEIS DE MANUTENÇÃO
-- ============================================

-- Limpar visitas antigas (manutenção)
-- DELETE FROM visitas WHERE DATE(hora_chegada) < DATE_SUB(CURDATE(), INTERVAL 90 DAY);

-- Desativar visitante
-- UPDATE visitantes SET ativo = 0 WHERE id = ?;

-- Resetar senha de usuário
-- UPDATE usuarios SET senha = '123456' WHERE login = 'admin';

-- Ver estrutura das tabelas
-- DESCRIBE departamentos;
-- DESCRIBE usuarios;
-- DESCRIBE visitantes;
-- DESCRIBE visitas;

-- Ver triggers
-- SHOW TRIGGERS;

-- Ver procedures
-- SHOW PROCEDURE STATUS WHERE Db = 'sistema_chamadas';

-- Backup rápido (executar no terminal, não no MySQL)
-- mysqldump -u root -p sistema_chamadas > backup_$(date +%Y%m%d).sql

-- Restaurar backup
-- mysql -u root -p sistema_chamadas < backup_20250101.sql

-- ============================================
-- FIM DO SCRIPT
-- ============================================