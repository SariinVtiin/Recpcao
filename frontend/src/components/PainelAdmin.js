import React, { useState, useEffect } from 'react';
import { Shield, LogOut, UserPlus, Edit2, Trash2, Eye, EyeOff, Check, X } from 'lucide-react';
import './PainelAdmin.css';

export default function PainelAdmin({ usuario, onLogout }) {
  const [usuarios, setUsuarios] = useState([]);
  const [departamentos, setDepartamentos] = useState([]);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [editando, setEditando] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [mensagem, setMensagem] = useState('');

  const [nome, setNome] = useState('');
  const [login, setLogin] = useState('');
  const [senha, setSenha] = useState('');
  const [perfil, setPerfil] = useState('recepcionista');
  const [departamentoId, setDepartamentoId] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);

  useEffect(() => {
    buscarUsuarios();
    buscarDepartamentos();
  }, []);

  const buscarUsuarios = async () => {
    try {
      const response = await fetch('http://192.167.2.41:3001/api/usuarios');
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
      const response = await fetch('http://192.167.2.41:3001/api/departamentos');
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
    setPerfil('recepcionista');
    setDepartamentoId('');
    setEditando(null);
    setMostrarFormulario(false);
  };

  const abrirEdicao = (user) => {
    setEditando(user.id);
    setNome(user.nome);
    setLogin(user.login);
    setSenha('');
    setPerfil(user.perfil);
    setDepartamentoId(user.departamento_id || '');
    setMostrarFormulario(true);
  };

  const salvarUsuario = async () => {
    if (!nome.trim() || !login.trim() || (!editando && !senha.trim())) {
      setMensagem('❌ Preencha todos os campos obrigatórios');
      setTimeout(() => setMensagem(''), 3000);
      return;
    }

    setCarregando(true);
    try {
      const dados = {
        nome: nome.trim(),
        login: login.trim(),
        perfil: perfil,
        departamento_id: departamentoId || null
      };

      if (senha.trim()) dados.senha = senha.trim();

      let response;
      if (editando) {
        response = await fetch(`http://192.167.2.41:3001/api/usuarios/${editando}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dados),
        });
      } else {
        dados.senha = senha.trim();
        response = await fetch('http://192.167.2.41:3001/api/usuarios', {
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

  const deletarUsuario = async (id, nomeUsuario) => {
    if (!window.confirm(`Deseja desativar ${nomeUsuario}?`)) return;

    try {
      const response = await fetch(`http://192.167.2.41:3001/api/usuarios/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setMensagem('✅ Usuário desativado!');
        buscarUsuarios();
        setTimeout(() => setMensagem(''), 3000);
      } else {
        const error = await response.json();
        setMensagem(`❌ ${error.error}`);
        setTimeout(() => setMensagem(''), 3000);
      }
    } catch (error) {
      console.error('Erro:', error);
      setMensagem('❌ Erro ao desativar');
      setTimeout(() => setMensagem(''), 3000);
    }
  };

  const getPerfilInfo = (perfil) => {
    const perfis = {
      administrador: { label: 'Administrador', classe: 'admin', icone: '👑' },
      recepcionista: { label: 'Recepcionista', classe: 'receptionist', icone: '👤' },
      departamento: { label: 'Departamento', classe: 'department', icone: '🏢' },
      painel: { label: 'Painel TV', classe: 'panel', icone: '📺' }
    };
    return perfis[perfil] || perfis.recepcionista;
  };

  return (
    <div className="painel-admin-container">
      <div className="painel-admin-background"></div>
      <div className="painel-admin-overlay"></div>

      <div className="painel-admin-content">
        <div className="painel-admin-card">
          {/* Header */}
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
            <button onClick={onLogout} className="painel-admin-btn-logout">
              <LogOut size={18} className="mr-2" />
              Sair
            </button>
          </div>

          {/* Botão Novo */}
          {!mostrarFormulario && (
            <button onClick={() => setMostrarFormulario(true)} className="painel-admin-btn-new">
              <UserPlus size={20} className="mr-2" />
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
                  <label className="painel-admin-form-label">Perfil de Acesso *</label>
                  <select
                    value={perfil}
                    onChange={(e) => setPerfil(e.target.value)}
                    className="painel-admin-form-select"
                  >
                    <option value="administrador">👑 Administrador</option>
                    <option value="recepcionista">👤 Recepcionista</option>
                    <option value="departamento">🏢 Departamento</option>
                    <option value="painel">📺 Painel TV</option>
                  </select>
                </div>

                {perfil === 'departamento' && (
                  <div className="painel-admin-form-group full-width">
                    <label className="painel-admin-form-label">Departamento</label>
                    <select
                      value={departamentoId}
                      onChange={(e) => setDepartamentoId(e.target.value)}
                      className="painel-admin-form-select"
                    >
                      <option value="">Selecione um departamento</option>
                      {departamentos.map((dept) => (
                        <option key={dept.id} value={dept.id}>{dept.nome}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="painel-admin-form-actions">
                <button
                  onClick={salvarUsuario}
                  disabled={carregando}
                  className="painel-admin-btn-save"
                >
                  <Check size={20} className="mr-2" />
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

          {/* Lista */}
          <h2 className="painel-admin-list-title">
            Usuários Cadastrados ({usuarios.filter(u => u.ativo).length})
          </h2>

          <div className="painel-admin-user-list">
            {usuarios.filter(u => u.ativo).map((user) => {
              const perfilInfo = getPerfilInfo(user.perfil);
              return (
                <div key={user.id} className="painel-admin-user-card">
                  <div className="painel-admin-user-info">
                    <div className="painel-admin-user-header">
                      <div className="painel-admin-user-icon">{perfilInfo.icone}</div>
                      <div>
                        <div className="painel-admin-user-name">{user.nome}</div>
                        <div className="painel-admin-user-details">
                          @{user.login}
                          {user.departamento_nome && ` • ${user.departamento_nome}`}
                        </div>
                      </div>
                    </div>
                    <div className="painel-admin-user-badges">
                      <span className={`painel-admin-badge ${perfilInfo.classe}`}>
                        {perfilInfo.label}
                      </span>
                      <span className="painel-admin-user-date">
                        Criado em {new Date(user.created_at).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>
                  <div className="painel-admin-user-actions">
                    <button onClick={() => abrirEdicao(user)} className="painel-admin-btn-edit">
                      <Edit2 size={16} className="mr-1" />
                      Editar
                    </button>
                    {user.login !== 'admin' && (
                      <button
                        onClick={() => deletarUsuario(user.id, user.nome)}
                        className="painel-admin-btn-delete"
                      >
                        <Trash2 size={16} className="mr-1" />
                        Excluir
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {usuarios.filter(u => u.ativo).length === 0 && (
            <div className="painel-admin-empty">
              <p>Nenhum usuário cadastrado</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}