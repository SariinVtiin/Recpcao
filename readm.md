# 📘 Guia de Uso - Sistema de Recepção Empresarial

## 🎯 Visão Geral

Sistema completo de gestão de visitantes para recepção empresarial, desenvolvido em **Node.js + React + MySQL** conforme documentação oficial.

---

## 🚀 Instalação e Configuração

### **Pré-requisitos**
- Node.js 16+ instalado
- MySQL 8.0+ instalado
- Navegador moderno (Chrome, Edge, Firefox)

### **Passo 1: Configurar o Banco de Dados**

```bash
# Entrar no MySQL
mysql -u root -p

# Executar o script SQL
source sistema_recepcao.sql
```

### **Passo 2: Instalar Dependências do Backend**

```bash
npm install express cors mysql2
```

### **Passo 3: Iniciar o Servidor**

```bash
node server.js
```

Você verá:
```
🚀 SISTEMA DE RECEPÇÃO EMPRESARIAL
✅ Servidor rodando em http://192.167.2.41:3001
✅ Banco de dados conectado
```

### **Passo 4: Configurar o Frontend React**

Copie o código do `App.js` para seu projeto React e inicie:

```bash
npm start
```

---

## 👥 Usuários Padrão

| Usuário | Senha | Perfil | Acesso |
|---------|-------|--------|--------|
| `admin` | `123456` | Recepcionista | Registro de visitantes |
| `dp1` | `123456` | Departamento | Gerenciar filas (Depto. Pessoal) |
| `op1` | `123456` | Departamento | Gerenciar filas (Operacional) |
| `painel` | `123456` | Painel TV | Visualização pública |

---

## 📋 Fluxo de Uso

### **1️⃣ Recepcionista (Login: admin)**

**Função:** Registrar visitantes que chegam

**Passo a passo:**
1. Faça login com `admin` / `123456`
2. Preencha os dados do visitante:
   - Nome completo
   - CPF (formato automático: 000.000.000-00)
   - Motivo da visita (opcional)
   - Observação (opcional)
3. Selecione o departamento de destino
4. Clique em "Registrar Visitante"
5. Visualize estatísticas em tempo real no topo

**Recursos:**
- ✅ Formatação automática de CPF
- ✅ Validação de campos obrigatórios
- ✅ Estatísticas do dia por departamento
- ✅ Feedback visual de sucesso/erro

---

### **2️⃣ Operador de Departamento (Login: dp1 ou op1)**

**Função:** Gerenciar fila de visitantes e chamar para atendimento

**Passo a passo:**
1. Faça login com seu usuário (`dp1` ou `op1`)
2. Visualize a lista de visitantes aguardando
3. Veja informações de cada visitante:
   - Nome
   - Tempo de espera
   - Motivo da visita
   - Observações
   - Hora de chegada
4. Clique em "Chamar" para chamar o visitante
5. Confirme a chamada no popup
6. Acesse a aba "Histórico" para ver atendimentos

**Recursos:**
- ✅ Atualização automática a cada 3 segundos
- ✅ Indicador de tempo de espera
- ✅ Notificação sonora quando novo visitante chega
- ✅ Confirmação antes de chamar
- ✅ Histórico dos últimos 10 atendimentos
- ✅ Informações detalhadas (chegada, chamada, atendimento)

---

### **3️⃣ Painel TV (Login: painel)**

**Função:** Exibir chamadas em tela grande para visitantes

**Passo a passo:**
1. Faça login com `painel` / `123456`
2. Deixe rodando em fullscreen (F11)
3. O painel atualiza automaticamente
4. Mostra a última chamada realizada

**Recursos:**
- ✅ Atualização automática a cada 2 segundos
- ✅ Síntese de voz (fala o nome do visitante)
- ✅ Design otimizado para TV/projetor
- ✅ Relógio em tempo real
- ✅ Cores por departamento (azul/verde)
- ✅ Exibe observações importantes

---

## 🎨 Características do Sistema

### **Design e UX**
- Interface moderna com gradientes e animações suaves
- Responsivo para diferentes tamanhos de tela
- Feedback visual imediato em todas as ações
- Ícones intuitivos (Lucide React)
- Cores diferenciadas por departamento
- Animações de loading e transições

### **Funcionalidades Técnicas**
- Atualização em tempo real sem refresh
- Formatação automática de CPF
- Validação de dados no frontend e backend
- Tratamento completo de erros
- Logs de todas as operações
- Timestamps automáticos (triggers MySQL)
- Stored procedures para operações complexas

### **Segurança**
- Autenticação obrigatória
- Perfis de acesso diferenciados
- Proteção contra SQL injection
- Validação de dados
- Logs de auditoria

---

## 🔧 APIs Disponíveis

### **Autenticação**

```http
POST /api/auth/login
Content-Type: application/json

{
  "usuario": "admin",
  "senha": "123456"
}
```

**Resposta:**
```json
{
  "id": 1,
  "nome": "Administrador",
  "login": "admin",
  "perfil": "recepcionista",
  "departamento_id": null,
  "departamento_nome": null
}
```

---

### **Registrar Visita**

```http
POST /api/visitas
Content-Type: application/json

{
  "nome": "João Silva",
  "cpf": "12345678901",
  "departamento_id": 1,
  "motivo": "Entrega de documentos",
  "observacao": "Levar pasta azul",
  "usuario_id": 1
}
```

---

### **Listar Visitantes Aguardando**

```http
GET /api/visitas/aguardando/1
```

**Resposta:**
```json
[
  {
    "visita_id": 1,
    "visitante_nome": "JOÃO SILVA",
    "visitante_cpf": "12345678901",
    "departamento_nome": "Departamento Operacional",
    "motivo": "Entrega de documentos",
    "observacao": "Levar pasta azul",
    "hora_chegada": "2025-10-13T10:30:00.000Z",
    "status": "aguardando"
  }
]
```

---

### **Chamar Visitante**

```http
PUT /api/visitas/1/chamar
```

---

### **Última Chamada (Painel)**

```http
GET /api/visitas/ultima
```

**Resposta:**
```json
{
  "visita_id": 1,
  "visitante_nome": "JOÃO SILVA",
  "departamento_nome": "Departamento Operacional",
  "motivo": "Entrega de documentos",
  "observacao": "Levar pasta azul",
  "hora_chamada": "2025-10-13T10:35:00.000Z"
}
```

---

### **Estatísticas do Dia**

```http
GET /api/relatorios/dia
```

**Resposta:**
```json
[
  {
    "departamento_nome": "Departamento Operacional",
    "total_visitas": 15,
    "atendidos": 12,
    "chamados": 1,
    "aguardando": 2
  }
]
```

---

## 📊 Estrutura do Banco de Dados

### **Tabela: visitantes**
Cadastro único por CPF
```sql
id, nome, cpf, data_cadastro, ativo
```

### **Tabela: visitas**
Histórico de cada visita
```sql
id, visitante_id, departamento_id, usuario_id,
motivo, status, hora_chegada, hora_chamada, hora_saida, observacao
```

### **Tabela: usuarios**
Operadores do sistema
```sql
id, nome, login, senha, perfil, departamento_id, ativo
```

### **Tabela: departamentos**
```sql
id, nome
```

---

## 🎯 Casos de Uso Comuns

### **Caso 1: Visitante Novo**
1. Recepcionista registra pela primeira vez
2. Sistema cria registro em `visitantes` e `visitas`
3. Visita fica com status "aguardando"
4. Aparece na fila do departamento escolhido

### **Caso 2: Visitante Recorrente**
1. Recepcionista digita CPF já cadastrado
2. Sistema reutiliza cadastro do visitante
3. Cria apenas nova visita
4. Mantém histórico de todas as visitas anteriores

### **Caso 3: Chamada de Visitante**
1. Operador vê lista de aguardando
2. Clica em "Chamar"
3. Confirma no popup
4. Status muda para "chamado"
5. Trigger MySQL atualiza `hora_chamada` automaticamente
6. Painel TV exibe imediatamente
7. Síntese de voz fala o nome

### **Caso 4: Finalização de Atendimento**
1. Sistema pode marcar como "atendido"
2. Trigger atualiza `hora_saida`
3. Visita sai da fila
4. Entra no histórico

---

## 🔍 Consultas SQL Úteis

### **Ver todas as visitas de hoje**
```sql
SELECT * FROM visitas_completas 
WHERE DATE(hora_chegada) = CURDATE()
ORDER BY hora_chegada DESC;
```

### **Visitantes mais frequentes**
```sql
SELECT 
  vi.nome,
  vi.cpf,
  COUNT(*) as total_visitas
FROM visitas v
JOIN visitantes vi ON v.visitante_id = vi.id
GROUP BY vi.id, vi.nome, vi.cpf
ORDER BY total_visitas DESC
LIMIT 10;
```

### **Tempo médio de espera por departamento**
```sql
SELECT 
  d.nome,
  AVG(TIMESTAMPDIFF(MINUTE, hora_chegada, hora_chamada)) as tempo_medio_minutos
FROM visitas v
JOIN departamentos d ON v.departamento_id = d.id
WHERE hora_chamada IS NOT NULL
  AND DATE(hora_chegada) = CURDATE()
GROUP BY d.id, d.nome;
```

### **Relatório de produtividade**
```sql
SELECT 
  u.nome as operador,
  d.nome as departamento,
  COUNT(*) as visitas_atendidas,
  DATE(v.hora_chegada) as data
FROM visitas v
JOIN usuarios u ON v.usuario_id = u.id
JOIN departamentos d ON v.departamento_id = d.id
WHERE v.status = 'atendido'
  AND DATE(v.hora_chegada) BETWEEN '2025-10-01' AND '2025-10-31'
GROUP BY u.id, d.id, DATE(v.hora_chegada)
ORDER BY data DESC, visitas_atendidas DESC;
```

---

## 🐛 Troubleshooting

### **Problema: Erro de conexão com servidor**
**Solução:**
1. Verifique se o servidor está rodando: `node server.js`
2. Verifique o IP no código (padrão: 192.167.2.41:3001)
3. Teste: `curl http://192.167.2.41:3001/api/status`

### **Problema: Login não funciona**
**Solução:**
1. Verifique se o banco está rodando: `mysql -u root -p`
2. Teste query: `SELECT * FROM usuarios WHERE ativo = 1;`
3. Verifique senha no banco (não tem hash ainda)

### **Problema: Painel não atualiza**
**Solução:**
1. Verifique console do navegador (F12)
2. Confirme que o servidor está respondendo
3. Teste endpoint: `GET /api/visitas/ultima`

### **Problema: CPF não formata**
**Solução:**
1. Digite apenas números
2. Formato aparece automaticamente ao digitar
3. Aceita até 11 dígitos

### **Problema: Áudio não toca no painel**
**Solução:**
1. Clique na tela antes (navegadores bloqueiam áudio sem interação)
2. Verifique volume do sistema
3. Teste em outro navegador

---

## 🚀 Melhorias Futuras Sugeridas

### **Segurança**
- [ ] Implementar hash de senhas (bcrypt)
- [ ] JWT tokens para autenticação
- [ ] HTTPS para produção
- [ ] Rate limiting nas APIs
- [ ] Timeout de sessão

### **Funcionalidades**
- [ ] Upload de foto do visitante
- [ ] Impressão de crachá
- [ ] SMS/Email de notificação
- [ ] Agendamento de visitas
- [ ] QR Code para check-in rápido
- [ ] Dashboard gerencial completo
- [ ] Exportação de relatórios (PDF/Excel)
- [ ] Integração com catracas
- [ ] App mobile para visitantes

### **UX**
- [ ] Dark mode
- [ ] Temas personalizáveis
- [ ] Multi-idioma
- [ ] PWA (Progressive Web App)
- [ ] Notificações push
- [ ] Atalhos de teclado

---

## 📞 Suporte

### **Logs do Sistema**
Os logs aparecem no console do servidor:
```bash
[2025-10-13T10:30:00.000Z] POST /api/visitas
Login bem-sucedido: Administrador (recepcionista)
Nova visita registrada: JOÃO SILVA -> Departamento Operacional
Chamada realizada: JOÃO SILVA
```

### **Verificar Status**
```bash
curl http://192.167.2.41:3001/api/status
```

Resposta esperada:
```json
{
  "status": "online",
  "message": "Servidor e banco de dados conectados",
  "usuarios": 4,
  "timestamp": "2025-10-13T13:30:00.000Z"
}
```

---

## 📝 Requisitos Implementados

| Código | Requisito | Status |
|--------|-----------|--------|
| RF001 | Cadastro de Visitantes | ✅ |
| RF002 | Consulta em Espera | ✅ |
| RF003 | Chamada de Visitante | ✅ |
| RF004 | Atualização Automática | ✅ |
| RF005 | Histórico de Visitas | ✅ |
| RF006 | Controle de Acesso | ✅ |
| RF007 | Perfis de Usuário | ✅ |
| RF008 | Encerramento | ✅ |
| RF009 | Relatórios | ✅ |
| RF010 | Cancelamento | ✅ |
| RNF001 | Desempenho (<3s) | ✅ |
| RNF002 | Disponibilidade | ✅ |
| RNF003 | Usabilidade | ✅ |
| RNF004 | Confiabilidade | ✅ |
| RNF005 | Manutenibilidade | ✅ |
| RNF006 | Portabilidade | ✅ |
| RNF007 | LGPD | ⚠️ Parcial |

---

## 📄 Licença e Créditos

**Sistema de Recepção Empresarial v2.0**

Desenvolvido com:
- Node.js + Express
- React + Tailwind CSS
- MySQL 8.0
- Lucide React (ícones)

Baseado na documentação oficial de requisitos.

---

## 🎓 Referências

- [Documentação MySQL](https://dev.mysql.com/doc/)
- [Express.js Guide](https://expressjs.com/)
- [React Documentation](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/)

---

**Última atualização:** 13 de outubro de 2025