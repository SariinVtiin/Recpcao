-- MySQL dump
-- Estrutura do banco

CREATE DATABASE sistema_chamadas
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

-- ===================================================
-- SELECIONA O BANCO
-- ===================================================
USE sistema_chamadas;

-- ===================================================
-- TABELA: departamentos
-- ===================================================
DROP TABLE IF EXISTS `departamentos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `departamentos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nome` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `nome` (`nome`),
  KEY `idx_nome` (`nome`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `usuarios`
--

DROP TABLE IF EXISTS `usuarios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `usuarios` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nome` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `login` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `senha` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `perfil` enum('administrador','recepcionista','departamento','painel','relatorio') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'recepcionista',
  `departamento_id` int DEFAULT NULL,
  `ativo` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `login` (`login`),
  KEY `departamento_id` (`departamento_id`),
  KEY `idx_login` (`login`),
  KEY `idx_perfil` (`perfil`),
  KEY `idx_ativo` (`ativo`),
  CONSTRAINT `usuarios_ibfk_1` FOREIGN KEY (`departamento_id`) REFERENCES `departamentos` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=45 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `visitantes`
--

DROP TABLE IF EXISTS `visitantes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `visitantes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nome` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `cpf` char(11) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `matricula` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `data_cadastro` datetime DEFAULT CURRENT_TIMESTAMP,
  `ativo` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `cpf` (`cpf`),
  KEY `idx_cpf` (`cpf`),
  KEY `idx_nome` (`nome`),
  KEY `idx_matricula` (`matricula`),
  KEY `idx_ativo` (`ativo`)
) ENGINE=InnoDB AUTO_INCREMENT=1037 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `visitas`
--

DROP TABLE IF EXISTS `visitas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `visitas` (
  `id` int NOT NULL AUTO_INCREMENT,
  `visitante_id` int NOT NULL,
  `departamento_id` int NOT NULL,
  `usuario_cadastro_id` int DEFAULT NULL,
  `usuario_chamada_id` int DEFAULT NULL,
  `usuario_finalizacao_id` int DEFAULT NULL,
  `motivo` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `status` enum('aguardando','chamado','finalizado') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'aguardando',
  `hora_chegada` datetime DEFAULT CURRENT_TIMESTAMP,
  `hora_chamada` datetime DEFAULT NULL,
  `hora_saida` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_status` (`status`),
  KEY `idx_hora_chegada` (`hora_chegada` DESC),
  KEY `idx_hora_chamada` (`hora_chamada` DESC),
  KEY `idx_visitante` (`visitante_id`),
  KEY `idx_departamento` (`departamento_id`),
  KEY `fk_cadastro` (`usuario_cadastro_id`),
  KEY `fk_chamada` (`usuario_chamada_id`),
  KEY `fk_finalizacao` (`usuario_finalizacao_id`),
  CONSTRAINT `visitas_ibfk_1` FOREIGN KEY (`visitante_id`) REFERENCES `visitantes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `visitas_ibfk_2` FOREIGN KEY (`departamento_id`) REFERENCES `departamentos` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `visitas_ibfk_4` FOREIGN KEY (`usuario_cadastro_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL,
  CONSTRAINT `visitas_ibfk_5` FOREIGN KEY (`usuario_chamada_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL,
  CONSTRAINT `visitas_ibfk_6` FOREIGN KEY (`usuario_finalizacao_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=1687 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `trg_visita_status_update` BEFORE UPDATE ON `visitas` FOR EACH ROW BEGIN
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
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Temporary view structure for view `visitas_completas`
--

DROP TABLE IF EXISTS `visitas_completas`;
/*!50001 DROP VIEW IF EXISTS `visitas_completas`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `visitas_completas` AS SELECT 
 1 AS `visita_id`,
 1 AS `status`,
 1 AS `motivo`,
 1 AS `hora_chegada`,
 1 AS `hora_chamada`,
 1 AS `hora_saida`,
 1 AS `visitante_id`,
 1 AS `visitante_nome`,
 1 AS `visitante_cpf`,
 1 AS `visitante_matricula`,
 1 AS `departamento_id`,
 1 AS `departamento_nome`,
 1 AS `usuario_cadastro_id`,
 1 AS `usuario_cadastro_nome`,
 1 AS `usuario_chamada_id`,
 1 AS `usuario_chamada_nome`,
 1 AS `usuario_finalizacao_id`,
 1 AS `usuario_finalizacao_nome`*/;
SET character_set_client = @saved_cs_client;

--
-- Final view structure for view `visitas_completas`
--

/*!50001 DROP VIEW IF EXISTS `visitas_completas`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `visitas_completas` AS select `v`.`id` AS `visita_id`,`v`.`status` AS `status`,`v`.`motivo` AS `motivo`,`v`.`hora_chegada` AS `hora_chegada`,`v`.`hora_chamada` AS `hora_chamada`,`v`.`hora_saida` AS `hora_saida`,`vi`.`id` AS `visitante_id`,`vi`.`nome` AS `visitante_nome`,`vi`.`cpf` AS `visitante_cpf`,`vi`.`matricula` AS `visitante_matricula`,`d`.`id` AS `departamento_id`,`d`.`nome` AS `departamento_nome`,`u_cadastro`.`id` AS `usuario_cadastro_id`,`u_cadastro`.`nome` AS `usuario_cadastro_nome`,`u_chamada`.`id` AS `usuario_chamada_id`,`u_chamada`.`nome` AS `usuario_chamada_nome`,`u_finalizacao`.`id` AS `usuario_finalizacao_id`,`u_finalizacao`.`nome` AS `usuario_finalizacao_nome` from (((((`visitas` `v` join `visitantes` `vi` on((`v`.`visitante_id` = `vi`.`id`))) join `departamentos` `d` on((`v`.`departamento_id` = `d`.`id`))) left join `usuarios` `u_cadastro` on((`v`.`usuario_cadastro_id` = `u_cadastro`.`id`))) left join `usuarios` `u_chamada` on((`v`.`usuario_chamada_id` = `u_chamada`.`id`))) left join `usuarios` `u_finalizacao` on((`v`.`usuario_finalizacao_id` = `u_finalizacao`.`id`))) order by `v`.`hora_chegada` desc */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-03-02  9:41:06

INSERT INTO departamentos (id, nome, created_at) VALUES 
(1, 'Administrator', '2025-11-07 16:56:10'),
(2, 'Departamento Operacional', '2025-11-07 16:56:10'),
(3, 'Departamento Pessoal', '2025-11-07 16:56:10'),
(4, 'Recepcao', '2025-11-07 16:56:10'),
(6, 'departamento Financeiro', '2025-11-07 16:56:10'),
(7, 'Relatorio', '2025-11-07 16:56:10');



INSERT INTO usuarios 
(id, nome, login, senha, perfil, departamento_id, ativo, created_at, updated_at)
VALUES
(1,
 'ADMINISTRATOR',
 'administrator',
 '$2b$10$EUEHDjECAs1u93UO5HLRkOnUfjIrFm1/b1ed.52SIYNZ4XfQeJ.wm',
 'administrador',
 1,
 1,
 '2025-11-07 16:56:10',
 '2026-01-26 09:55:09'
);


DELIMITER $$

CREATE PROCEDURE sp_registrar_visita(
    IN p_cpf CHAR(11),
    IN p_nome VARCHAR(255),
    IN p_matricula VARCHAR(50),
    IN p_departamento_id INT,
    IN p_motivo TEXT,
    IN p_usuario_cadastro_id INT,
    OUT p_visita_id INT,
    OUT p_visitante_id INT
)
BEGIN
    DECLARE v_visitante_id INT;

    -- Verifica se visitante já existe pelo CPF
    SELECT id INTO v_visitante_id
    FROM visitantes
    WHERE cpf = p_cpf
    LIMIT 1;

    -- Se não existir, cria o visitante
    IF v_visitante_id IS NULL THEN
        INSERT INTO visitantes (nome, cpf, matricula, ativo)
        VALUES (p_nome, p_cpf, p_matricula, 1);

        SET v_visitante_id = LAST_INSERT_ID();
    END IF;

    -- Registra a visita
    INSERT INTO visitas
    (visitante_id, departamento_id, usuario_cadastro_id, motivo, status)
    VALUES
    (v_visitante_id, p_departamento_id, p_usuario_cadastro_id, p_motivo, 'aguardando');

    SET p_visita_id = LAST_INSERT_ID();
    SET p_visitante_id = v_visitante_id;
END$$

DELIMITER ;