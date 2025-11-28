import React, { useState, useEffect } from 'react';
import { Shield, LogOut, UserPlus, Edit2, Trash2, Eye, EyeOff, Check, X, BarChart3, Search, RefreshCw, XCircle, Users, UserX, AlertTriangle } from 'lucide-react';
import './PainelAdmin.css';

export default function PainelAdmin({ usuario, onLogout, onAbrirRelatorios }) {
  const [usuarios, setUsuarios] = useState([]);
  const [departamentos, setDepartamentos] = useState([]);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [editando, setEditando] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const [pesquisa, setPesquisa] = useState('');
  const [filtroAtivo, setFiltroAtivo] = useState('ativos'); // 'ativos', 'inativos', 'todos'

  const [nome, setNome] = useState('');
  const [login, setLogin] = useState('');
  const [senha, setSenha] = useState('');
  const [departamentoId, setDepartamentoId] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);

  // Estados para modal de confirmação
  const [modalAberto, setModalAberto] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    tipo: 'confirmar', // 'confirmar', 'excluir', 'input'
    titulo: '',
    mensagem: '',
    onConfirmar: null,
    onCancelar: null,
    textoConfirmar: 'Confirmar',
    textoCancelar: 'Cancelar',
    usuarioNome: '',
    precisaInput: false,
    textoInput: ''
  });

  useEffect(() => {
    buscarUsuarios();
    buscarDepartamentos();
  }, []);

  const buscarUsuarios = async () => {
    try {
      const response = await fetch('https://192.167.2.41:3001/api/usuarios');
      if (!response.ok) throw new Error('Erro ao buscar usuários');
      const data = await response.json();
      setUsuarios(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Erro:', error);
      setUsuarios([]);
      setMensagem('❌ Erro ao carregar usuários');
      setTimeout(() => setMensagem(''), 5000);
    }
  };

  const buscarDepartamentos = async () => {
    try {
      const response = await fetch('https://192.167.2.41:3001/api/departamentos');
      const data = await response.json();
      setDepartamentos(data);
    } catch (error) {
      console.error('Erro:', error);
    }
  };

  const limparFormulario = () => {
    setNome('');
    setLogin('');
    setSenha('');
    setDepartamentoId('');
    setEditando(null);
    setMostrarFormulario(false);
  };

  const abrirEdicao = (user) => {
    setEditando(user.id);
    setNome(user.nome);
    setLogin(user.login);
    setSenha('');
    setDepartamentoId(user.departamento_id || '');
    setMostrarFormulario(true);
  };

  const salvarUsuario = async () => {
    if (!nome.trim() || !login.trim() || !departamentoId || (!editando && !senha.trim())) {
      setMensagem('❌ Preencha todos os campos obrigatórios');
      setTimeout(() => setMensagem(''), 3000);
      return;
    }

    setCarregando(true);
    try {
      const dados = {
        nome: nome.trim(),
        login: login.trim(),
        perfil: 'departamento', // Perfil padrão para compatibilidade com backend
        departamento_id: departamentoId
      };

      if (senha.trim()) dados.senha = senha.trim();

      let response;
      if (editando) {
        response = await fetch(`https://192.167.2.41:3001/api/usuarios/${editando}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dados),
        });
      } else {
        dados.senha = senha.trim();
        response = await fetch('https://192.167.2.41:3001/api/usuarios', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dados),
        });
      }

      if (response.ok) {
        setMensagem(`✅ Usuário ${editando ? 'atualizado' : 'criado'} com sucesso!`);
        limparFormulario();
        buscarUsuarios();
        setTimeout(() => setMensagem(''), 3000);
      } else {
        const error = await response.json();
        setMensagem(`❌ ${error.error}`);
        setTimeout(() => setMensagem(''), 3000);
      }
    } catch (error) {
      console.error('Erro:', error);
      setMensagem('❌ Erro de conexão');
      setTimeout(() => setMensagem(''), 3000);
    } finally {
      setCarregando(false);
    }
  };

  const desativarUsuario = async (id, nomeUsuario) => {
    setModalConfig({
      tipo: 'desativar',
      titulo: '⚠️ Desativar Usuário',
      mensagem: 'O usuário não poderá mais fazer login, mas poderá ser reativado posteriormente.',
      usuarioNome: nomeUsuario,
      textoConfirmar: 'Desativar',
      textoCancelar: 'Cancelar',
      onConfirmar: async () => {
        try {
          const response = await fetch(`https://192.167.2.41:3001/api/usuarios/${id}`, {
            method: 'DELETE',
          });

          if (response.ok) {
            setMensagem('✅ Usuário desativado com sucesso!');
            buscarUsuarios();
            setTimeout(() => setMensagem(''), 3000);
          } else {
            const error = await response.json();
            setMensagem(`❌ ${error.error}`);
            setTimeout(() => setMensagem(''), 3000);
          }
        } catch (error) {
          console.error('Erro:', error);
          setMensagem('❌ Erro ao desativar usuário');
          setTimeout(() => setMensagem(''), 3000);
        }
      }
    });
    setModalAberto(true);
  };

  const reativarUsuario = async (id, nomeUsuario) => {
    setModalConfig({
      tipo: 'reativar',
      titulo: '🔄 Reativar Usuário',
      mensagem: 'O usuário poderá fazer login novamente no sistema.',
      usuarioNome: nomeUsuario,
      textoConfirmar: 'Reativar',
      textoCancelar: 'Cancelar',
      onConfirmar: async () => {
        try {
          const response = await fetch(`https://192.167.2.41:3001/api/usuarios/${id}/reativar`, {
            method: 'PUT',
          });

          if (response.ok) {
            setMensagem('✅ Usuário reativado com sucesso!');
            buscarUsuarios();
            setTimeout(() => setMensagem(''), 3000);
          } else {
            const error = await response.json();
            setMensagem(`❌ ${error.error}`);
            setTimeout(() => setMensagem(''), 3000);
          }
        } catch (error) {
          console.error('Erro:', error);
          setMensagem('❌ Erro ao reativar usuário');
          setTimeout(() => setMensagem(''), 3000);
        }
      }
    });
    setModalAberto(true);
  };

  const excluirPermanentemente = async (id, nomeUsuario) => {
    // Primeira confirmação
    setModalConfig({
      tipo: 'excluir',
      titulo: '⚠️ ATENÇÃO: EXCLUSÃO PERMANENTE',
      mensagem: `Esta ação é IRREVERSÍVEL e irá:\n\n• Remover completamente o usuário do sistema\n• Apagar todos os dados associados\n• NÃO poderá ser desfeita`,
      usuarioNome: nomeUsuario,
      textoConfirmar: 'Continuar',
      textoCancelar: 'Cancelar',
      onConfirmar: () => {
        setModalAberto(false);
        // Segunda confirmação
        setTimeout(() => {
          setModalConfig({
            tipo: 'excluir',
            titulo: '🚨 ÚLTIMA CONFIRMAÇÃO',
            mensagem: 'Tem ABSOLUTA CERTEZA que deseja excluir este usuário?',
            usuarioNome: nomeUsuario,
            textoConfirmar: 'Sim, tenho certeza',
            textoCancelar: 'Não, cancelar',
            onConfirmar: () => {
              setModalAberto(false);
              // Terceira confirmação com input
              setTimeout(() => {
                setModalConfig({
                  tipo: 'excluir',
                  titulo: '🔒 CONFIRMAÇÃO FINAL',
                  mensagem: 'Para confirmar a exclusão permanente, digite OK no campo abaixo:',
                  usuarioNome: nomeUsuario,
                  precisaInput: true,
                  textoInput: 'OK',
                  textoConfirmar: 'Excluir Permanentemente',
                  textoCancelar: 'Cancelar',
                  onConfirmar: async () => {
                    setModalAberto(false);
                    try {
                      const response = await fetch(`https://192.167.2.41:3001/api/usuarios/${id}/excluir-permanente`, {
                        method: 'DELETE',
                      });

                      if (response.ok) {
                        setMensagem('✅ Usuário excluído permanentemente');
                        buscarUsuarios();
                        setTimeout(() => setMensagem(''), 3000);
                      } else {
                        const error = await response.json();
                        setMensagem(`❌ ${error.error}`);
                        setTimeout(() => setMensagem(''), 3000);
                      }
                    } catch (error) {
                      console.error('Erro:', error);
                      setMensagem('❌ Erro ao excluir usuário');
                      setTimeout(() => setMensagem(''), 3000);
                    }
                  }
                });
                setModalAberto(true);
              }, 150);
            }
          });
          setModalAberto(true);
        }, 150);
      }
    });
    setModalAberto(true);
  };

  // Função para mapear emojis aos departamentos
  const getDepartamentoEmoji = (nomeDepartamento) => {
    const nome = nomeDepartamento.toLowerCase();
    
    // Mapeamento de palavras-chave para emojis
    if (nome.includes('financ') || nome.includes('contab')) return '💰';
    if (nome.includes('rh') || nome.includes('recursos humanos') || nome.includes('pessoal')) return '👥';
    if (nome.includes('ti') || nome.includes('tecnologia') || nome.includes('informática')) return '💻';
    if (nome.includes('market') || nome.includes('vendas') || nome.includes('comercial')) return '📈';
    if (nome.includes('jur') || nome.includes('legal') || nome.includes('advocacia')) return '⚖️';
    if (nome.includes('admin') || nome.includes('gestão')) return '📋';
    if (nome.includes('operaç') || nome.includes('produç')) return '⚙️';
    if (nome.includes('qualidade') || nome.includes('compliance')) return '✅';
    if (nome.includes('logística') || nome.includes('supply')) return '🚚';
    if (nome.includes('compras') || nome.includes('suprimento')) return '🛒';
    if (nome.includes('atendimento') || nome.includes('sac') || nome.includes('cliente')) return '📞';
    if (nome.includes('comunicação') || nome.includes('marketing')) return '📢';
    if (nome.includes('pesquisa') || nome.includes('desenvolvimento') || nome.includes('p&d')) return '🔬';
    if (nome.includes('design') || nome.includes('criativ')) return '🎨';
    if (nome.includes('segurança') || nome.includes('vigilância')) return '🔒';
    if (nome.includes('manutenção') || nome.includes('facilities')) return '🔧';
    if (nome.includes('saúde') || nome.includes('médic') || nome.includes('enfermaria')) return '🏥';
    if (nome.includes('educação') || nome.includes('treinamento') || nome.includes('capacitação')) return '📚';
    if (nome.includes('diretoria') || nome.includes('presidência') || nome.includes('ceo')) return '👔';
    if (nome.includes('recepc') || nome.includes('portaria')) return '🎫';
    
    // Emoji padrão
    return '🏢';
  };

  // Filtrar usuários com base na pesquisa e filtro de status
  const usuariosFiltrados = usuarios
    .filter(u => {
      if (filtroAtivo === 'ativos') return u.ativo;
      if (filtroAtivo === 'inativos') return !u.ativo;
      return true; // 'todos'
    })
    .filter(u => {
      if (!pesquisa.trim()) return true;
      
      const termo = pesquisa.toLowerCase();
      const nome = u.nome.toLowerCase();
      const login = u.login.toLowerCase();
      const dept = (u.departamento_nome || '').toLowerCase();
      
      return nome.includes(termo) || 
             login.includes(termo) || 
             dept.includes(termo);
    })
    .sort((a, b) => {
      const deptA = a.departamento_nome || '';
      const deptB = b.departamento_nome || '';
      return deptA.localeCompare(deptB, 'pt-BR');
    });

  const contadores = {
    ativos: usuarios.filter(u => u.ativo).length,
    inativos: usuarios.filter(u => !u.ativo).length,
    todos: usuarios.length
  };

  // Componente Modal de Confirmação
  const Modal = () => {
    const [inputValue, setInputValue] = useState('');

    if (!modalAberto) return null;

    const handleConfirmar = () => {
      if (modalConfig.precisaInput && inputValue !== modalConfig.textoInput) {
        setMensagem('❌ Texto de confirmação incorreto');
        setTimeout(() => setMensagem(''), 3000);
        return;
      }
      
      if (modalConfig.onConfirmar) {
        modalConfig.onConfirmar();
      }
      setModalAberto(false);
      setInputValue('');
    };

    const handleCancelar = () => {
      if (modalConfig.onCancelar) {
        modalConfig.onCancelar();
      }
      setModalAberto(false);
      setInputValue('');
    };

    return (
      <div className="modal-overlay" onClick={handleCancelar}>
        <div className="modal-container" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <div className="modal-icon">
              {modalConfig.tipo === 'excluir' ? (
                <AlertTriangle size={32} className="modal-icon-danger" />
              ) : modalConfig.tipo === 'reativar' ? (
                <RefreshCw size={32} className="modal-icon-success" />
              ) : (
                <AlertTriangle size={32} className="modal-icon-warning" />
              )}
            </div>
            <h2 className="modal-titulo">{modalConfig.titulo}</h2>
          </div>

          <div className="modal-body">
            <p className="modal-mensagem">{modalConfig.mensagem}</p>
            
            {modalConfig.usuarioNome && (
              <div className="modal-usuario-destaque">
                <strong>{modalConfig.usuarioNome}</strong>
              </div>
            )}

            {modalConfig.precisaInput && (
              <div className="modal-input-container">
                <label className="modal-input-label">
                  Digite <strong>{modalConfig.textoInput}</strong> para confirmar:
                </label>
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  className="modal-input"
                  placeholder={modalConfig.textoInput}
                  autoFocus
                />
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button
              onClick={handleCancelar}
              className="modal-btn modal-btn-cancelar"
            >
              {modalConfig.textoCancelar}
            </button>
            <button
              onClick={handleConfirmar}
              className={`modal-btn ${modalConfig.tipo === 'excluir' ? 'modal-btn-danger' : 'modal-btn-confirmar'}`}
            >
              {modalConfig.textoConfirmar}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="painel-admin-container">
      <div className="painel-admin-background"></div>
      <div className="painel-admin-overlay"></div>

      <div className="painel-admin-content">
        <div className="painel-admin-card">
          {/* Header com Botões */}
          <div className="painel-admin-header">
            <div className="painel-admin-header-left">
              <div className="painel-admin-icon">
                <Shield className="text-white" size={24} />
              </div>
              <div>
                <h1 className="painel-admin-title">Painel Administrativo</h1>
                <p className="painel-admin-subtitle">{usuario.nome} • Gerenciar Usuários</p>
              </div>
            </div>
            <div className="painel-admin-header-actions">
              <button onClick={onAbrirRelatorios} className="painel-admin-btn-relatorios">
                <BarChart3 size={18} />
                Relatórios
              </button>
              <button onClick={onLogout} className="painel-admin-btn-logout">
                <LogOut size={18} />
                Sair
              </button>
            </div>
          </div>

          {/* Botão Novo */}
          {!mostrarFormulario && (
            <button onClick={() => setMostrarFormulario(true)} className="painel-admin-btn-new">
              <UserPlus size={20} />
              Novo Usuário
            </button>
          )}

          {/* Formulário */}
          {mostrarFormulario && (
            <div className="painel-admin-form">
              <div className="painel-admin-form-header">
                <h2 className="painel-admin-form-title">
                  {editando ? 'Editar Usuário' : 'Novo Usuário'}
                </h2>
                <button onClick={limparFormulario} className="painel-admin-btn-close">
                  <X size={24} />
                </button>
              </div>

              <div className="painel-admin-form-grid">
                <div className="painel-admin-form-group">
                  <label className="painel-admin-form-label">Nome Completo *</label>
                  <input
                    type="text"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Digite o nome completo"
                    className="painel-admin-form-input"
                  />
                </div>

                <div className="painel-admin-form-group">
                  <label className="painel-admin-form-label">Login *</label>
                  <input
                    type="text"
                    value={login}
                    onChange={(e) => setLogin(e.target.value)}
                    placeholder="usuário"
                    className="painel-admin-form-input"
                  />
                </div>

                <div className="painel-admin-form-group">
                  <label className="painel-admin-form-label">
                    Senha {editando ? '(deixe vazio para manter)' : '*'}
                  </label>
                  <div className="painel-admin-password-wrapper">
                    <input
                      type={mostrarSenha ? 'text' : 'password'}
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                      placeholder={editando ? 'Nova senha (opcional)' : 'Digite a senha'}
                      className="painel-admin-form-input"
                    />
                    <button
                      type="button"
                      onClick={() => setMostrarSenha(!mostrarSenha)}
                      className="painel-admin-btn-toggle-password"
                    >
                      {mostrarSenha ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                <div className="painel-admin-form-group">
                  <label className="painel-admin-form-label">Departamento *</label>
                  <select
                    value={departamentoId}
                    onChange={(e) => setDepartamentoId(e.target.value)}
                    className="painel-admin-form-select"
                  >
                    <option value="">Selecione um departamento</option>
                    {departamentos.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {getDepartamentoEmoji(dept.nome)} {dept.nome}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="painel-admin-form-actions">
                <button
                  onClick={salvarUsuario}
                  disabled={carregando}
                  className="painel-admin-btn-save"
                >
                  <Check size={20} />
                  {carregando ? 'Salvando...' : editando ? 'Atualizar' : 'Criar Usuário'}
                </button>
                <button onClick={limparFormulario} className="painel-admin-btn-cancel">
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Mensagem */}
          {mensagem && (
            <div className={`painel-admin-message ${mensagem.includes('✅') ? 'success' : 'error'}`}>
              {mensagem}
            </div>
          )}

          {/* Filtros de Status */}
          <div className="painel-admin-filters">
            <button
              onClick={() => setFiltroAtivo('ativos')}
              className={`painel-admin-filter-btn ${filtroAtivo === 'ativos' ? 'active' : ''}`}
            >
              <Users size={18} />
              Ativos ({contadores.ativos})
            </button>
            <button
              onClick={() => setFiltroAtivo('inativos')}
              className={`painel-admin-filter-btn ${filtroAtivo === 'inativos' ? 'active' : ''}`}
            >
              <UserX size={18} />
              Inativos ({contadores.inativos})
            </button>
            <button
              onClick={() => setFiltroAtivo('todos')}
              className={`painel-admin-filter-btn ${filtroAtivo === 'todos' ? 'active' : ''}`}
            >
              <Shield size={18} />
              Todos ({contadores.todos})
            </button>
          </div>

          {/* Barra de Pesquisa */}
          <div className="painel-admin-search-container">
            <div className="painel-admin-search-wrapper">
              <Search size={20} className="painel-admin-search-icon" />
              <input
                type="text"
                value={pesquisa}
                onChange={(e) => setPesquisa(e.target.value)}
                placeholder="Pesquisar por nome, login ou departamento..."
                className="painel-admin-search-input"
              />
              {pesquisa && (
                <button
                  onClick={() => setPesquisa('')}
                  className="painel-admin-search-clear"
                  title="Limpar pesquisa"
                >
                  <X size={18} />
                </button>
              )}
            </div>
          </div>

          {/* Lista */}
          <h2 className="painel-admin-list-title">
            {pesquisa ? 
              `Resultados da pesquisa (${usuariosFiltrados.length})` :
              `${filtroAtivo === 'ativos' ? 'Usuários Ativos' : filtroAtivo === 'inativos' ? 'Usuários Inativos' : 'Todos os Usuários'} (${usuariosFiltrados.length})`
            }
          </h2>

          <div className="painel-admin-user-list">
            {usuariosFiltrados.map((user) => {
              return (
                <div key={user.id} className={`painel-admin-user-card ${!user.ativo ? 'inactive' : ''}`}>
                  <div className="painel-admin-user-info">
                    <div className="painel-admin-user-header">
                      <div className="painel-admin-user-icon">
                        {user.departamento_nome ? getDepartamentoEmoji(user.departamento_nome) : '🏢'}
                      </div>
                      <div>
                        <div className="painel-admin-user-name">{user.nome}</div>
                        <div className="painel-admin-user-details">
                          @{user.login}
                          {user.departamento_nome && ` • ${user.departamento_nome}`}
                        </div>
                      </div>
                    </div>
                    <div className="painel-admin-user-badges">
                      {user.departamento_nome && (
                        <span className="painel-admin-badge department">
                          {getDepartamentoEmoji(user.departamento_nome)} {user.departamento_nome}
                        </span>
                      )}
                      {!user.ativo && (
                        <span className="painel-admin-badge inactive">
                          Desativado
                        </span>
                      )}
                      <span className="painel-admin-user-date">
                        Criado em {new Date(user.created_at).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>
                  <div className="painel-admin-user-actions">
                    {user.ativo ? (
                      <>
                        <button onClick={() => abrirEdicao(user)} className="painel-admin-btn-edit">
                          <Edit2 size={16} />
                          Editar
                        </button>
                        {user.login !== 'admin' && (
                          <button
                            onClick={() => desativarUsuario(user.id, user.nome)}
                            className="painel-admin-btn-delete"
                          >
                            <Trash2 size={16} />
                            Desativar
                          </button>
                        )}
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => reativarUsuario(user.id, user.nome)}
                          className="painel-admin-btn-reactivate"
                        >
                          <RefreshCw size={16} />
                          Reativar
                        </button>
                        <button
                          onClick={() => excluirPermanentemente(user.id, user.nome)}
                          className="painel-admin-btn-permanent-delete"
                        >
                          <XCircle size={16} />
                          Excluir
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {usuariosFiltrados.length === 0 && pesquisa && (
            <div className="painel-admin-empty">
              <p>Nenhum usuário encontrado para "{pesquisa}"</p>
              <button 
                onClick={() => setPesquisa('')}
                className="painel-admin-btn-clear-search"
              >
                Limpar pesquisa
              </button>
            </div>
          )}

          {usuariosFiltrados.length === 0 && !pesquisa && (
            <div className="painel-admin-empty">
              <p>Nenhum usuário {filtroAtivo === 'ativos' ? 'ativo' : filtroAtivo === 'inativos' ? 'inativo' : ''} cadastrado</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Confirmação */}
      <Modal />
    </div>
  );
}