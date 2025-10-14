import React, { useState, useEffect } from 'react';
import { Shield, LogOut, UserPlus, Edit2, Trash2, Eye, EyeOff, Check, X } from 'lucide-react';

export default function PainelAdmin({ usuario, onLogout }) {
  const [usuarios, setUsuarios] = useState([]);
  const [departamentos, setDepartamentos] = useState([]);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [editando, setEditando] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [mensagem, setMensagem] = useState('');

  // Formulário
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
      if (!response.ok) {
        throw new Error('Erro ao buscar usuários');
      }
      const data = await response.json();
      setUsuarios(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      setUsuarios([]); // Define array vazio em caso de erro
      setMensagem('❌ Erro ao carregar usuários. Verifique se o servidor está rodando.');
      setTimeout(() => setMensagem(''), 5000);
    }
  };

  const buscarDepartamentos = async () => {
    try {
      const response = await fetch('http://192.167.2.41:3001/api/departamentos');
      const data = await response.json();
      setDepartamentos(data);
    } catch (error) {
      console.error('Erro ao buscar departamentos:', error);
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
    setSenha(''); // Não preenche a senha por segurança
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

      // Só envia senha se preenchida
      if (senha.trim()) {
        dados.senha = senha.trim();
      }

      let response;
      if (editando) {
        // Atualizar
        response = await fetch(`http://192.167.2.41:3001/api/usuarios/${editando}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dados),
        });
      } else {
        // Criar novo
        dados.senha = senha.trim(); // Senha obrigatória para novo
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
    const confirmar = window.confirm(`Deseja realmente desativar o usuário ${nomeUsuario}?`);
    if (!confirmar) return;

    try {
      const response = await fetch(`http://192.167.2.41:3001/api/usuarios/${id}`, {
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
  };

  const getPerfilInfo = (perfil) => {
    const perfis = {
      administrador: { label: 'Administrador', cor: 'bg-purple-100 text-purple-800', icone: '👑' },
      recepcionista: { label: 'Recepcionista', cor: 'bg-blue-100 text-blue-800', icone: '👤' },
      departamento: { label: 'Departamento', cor: 'bg-green-100 text-green-800', icone: '🏢' },
      painel: { label: 'Painel TV', cor: 'bg-gray-100 text-gray-800', icone: '📺' }
    };
    return perfis[perfil] || perfis.recepcionista;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* Header */}
          <div className="flex justify-between items-center mb-8 pb-6 border-b-2 border-gray-100">
            <div className="flex items-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-600 rounded-full mr-3">
                <Shield className="text-white" size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Painel Administrativo</h1>
                <p className="text-sm text-gray-600">{usuario.nome} • Gerenciar Usuários</p>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="flex items-center px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
            >
              <LogOut size={18} className="mr-2" />
              Sair
            </button>
          </div>

          {/* Botão Novo Usuário */}
          {!mostrarFormulario && (
            <button
              onClick={() => setMostrarFormulario(true)}
              className="mb-6 flex items-center px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold shadow-lg"
            >
              <UserPlus size={20} className="mr-2" />
              Novo Usuário
            </button>
          )}

          {/* Formulário */}
          {mostrarFormulario && (
            <div className="mb-8 p-6 bg-purple-50 rounded-xl border-2 border-purple-200">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800">
                  {editando ? 'Editar Usuário' : 'Novo Usuário'}
                </h2>
                <button
                  onClick={limparFormulario}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Digite o nome completo"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Login *
                  </label>
                  <input
                    type="text"
                    value={login}
                    onChange={(e) => setLogin(e.target.value)}
                    placeholder="usuário"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Senha {editando ? '(deixe vazio para manter)' : '*'}
                  </label>
                  <div className="relative">
                    <input
                      type={mostrarSenha ? 'text' : 'password'}
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                      placeholder={editando ? 'Nova senha (opcional)' : 'Digite a senha'}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setMostrarSenha(!mostrarSenha)}
                      className="absolute right-3 top-3 text-gray-500 hover:text-gray-700"
                    >
                      {mostrarSenha ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Perfil de Acesso *
                  </label>
                  <select
                    value={perfil}
                    onChange={(e) => setPerfil(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
                  >
                    <option value="administrador">👑 Administrador</option>
                    <option value="recepcionista">👤 Recepcionista</option>
                    <option value="departamento">🏢 Departamento</option>
                    <option value="painel">📺 Painel TV</option>
                  </select>
                </div>

                {perfil === 'departamento' && (
                  <div className="col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Departamento
                    </label>
                    <select
                      value={departamentoId}
                      onChange={(e) => setDepartamentoId(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
                    >
                      <option value="">Selecione um departamento</option>
                      {departamentos.map((dept) => (
                        <option key={dept.id} value={dept.id}>
                          {dept.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={salvarUsuario}
                  disabled={carregando}
                  className="flex-1 flex items-center justify-center px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold disabled:bg-gray-400"
                >
                  <Check size={20} className="mr-2" />
                  {carregando ? 'Salvando...' : editando ? 'Atualizar' : 'Criar Usuário'}
                </button>
                <button
                  onClick={limparFormulario}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Mensagem */}
          {mensagem && (
            <div className={`mb-6 p-4 rounded-lg text-center font-semibold ${
              mensagem.includes('✅') 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {mensagem}
            </div>
          )}

          {/* Lista de Usuários */}
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Usuários Cadastrados ({usuarios.filter(u => u.ativo).length})
          </h2>

          <div className="space-y-3">
            {usuarios.filter(u => u.ativo).map((user) => {
              const perfilInfo = getPerfilInfo(user.perfil);
              return (
                <div key={user.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border-l-4 border-purple-500">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="text-2xl">{perfilInfo.icone}</div>
                      <div>
                        <div className="font-semibold text-gray-800 text-lg">
                          {user.nome}
                        </div>
                        <div className="text-sm text-gray-600">
                          @{user.login}
                          {user.departamento_nome && (
                            <span className="ml-2">• {user.departamento_nome}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${perfilInfo.cor}`}>
                        {perfilInfo.label}
                      </span>
                      <span className="text-xs text-gray-500">
                        Criado em {new Date(user.created_at).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => abrirEdicao(user)}
                      className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors font-semibold flex items-center"
                    >
                      <Edit2 size={16} className="mr-1" />
                      Editar
                    </button>
                    {user.login !== 'admin' && (
                      <button
                        onClick={() => deletarUsuario(user.id, user.nome)}
                        className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors font-semibold flex items-center"
                      >
                        <Trash2 size={16} className="mr-1" />
                        Desativar
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {usuarios.filter(u => u.ativo).length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <p>Nenhum usuário cadastrado</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}