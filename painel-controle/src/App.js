// painel de controle
import React, { useState } from 'react';
import { Send, User, Building2, LogOut, AlertCircle } from 'lucide-react';

export default function PainelControle() {
  const [operadorLogado, setOperadorLogado] = useState(null);
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [erroLogin, setErroLogin] = useState('');
  const [carregandoLogin, setCarregandoLogin] = useState(false);

  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [setor, setSetor] = useState('');
  const [mensagem, setMensagem] = useState('');

  const fazerLogin = async () => {
    setErroLogin('');
    setCarregandoLogin(true);

    try {
      const response = await fetch('http://192.167.2.41:3001/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ usuario, senha }),
      });

      if (response.ok) {
        const data = await response.json();
        setOperadorLogado(data);
        
        // Definir setor automaticamente baseado no tipo de acesso
        if (data.tipo_acesso === 'dp') {
          setSetor('Departamento Pessoal');
        } else if (data.tipo_acesso === 'op') {
          setSetor('Departamento Operacional');
        }
      } else {
        const error = await response.json();
        setErroLogin(error.error || 'Erro ao fazer login');
      }
    } catch (error) {
      console.error('Erro:', error);
      setErroLogin('Erro de conexão com o servidor');
    } finally {
      setCarregandoLogin(false);
    }
  };

  const fazerLogout = () => {
    setOperadorLogado(null);
    setUsuario('');
    setSenha('');
    setSetor('');
  };

  const handleKeyPressLogin = (e) => {
    if (e.key === 'Enter') {
      fazerLogin();
    }
  };

  const chamarCliente = async () => {
    if (!nome.trim() || !setor) {
      setMensagem('Por favor, preencha o nome e selecione o setor!');
      setTimeout(() => setMensagem(''), 3000);
      return;
    }

    try {
      const response = await fetch('http://192.167.2.41:3001/api/chamadas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nome: nome.trim(),
          descricao: descricao.trim(),
          setor: setor,
          operador_id: operadorLogado.id
        }),
      });

      if (response.ok) {
        setMensagem(`✓ ${nome.toUpperCase()} chamado(a) para ${setor}!`);
        setNome('');
        setDescricao('');
        setTimeout(() => setMensagem(''), 3000);
      } else {
        setMensagem('✗ Erro ao chamar cliente');
        setTimeout(() => setMensagem(''), 3000);
      }
    } catch (error) {
      console.error('Erro:', error);
      setMensagem('✗ Erro de conexão com o servidor');
      setTimeout(() => setMensagem(''), 3000);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      chamarCliente();
    }
  };

  const getTipoAcessoNome = (tipo) => {
    const tipos = {
      administrator: 'Administrador',
      dp: 'Departamento Pessoal',
      op: 'Departamento Operacional'
    };
    return tipos[tipo] || tipo;
  };

  // Tela de Login
  if (!operadorLogado) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-600 rounded-full mb-4 shadow-lg">
              <Send className="text-white" size={40} />
            </div>
            <h1 className="text-4xl font-bold text-gray-800 mb-2">
              Painel de Chamadas
            </h1>
            <p className="text-gray-600">Faça login para continuar</p>
          </div>

          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <div className="mb-6">
              <label className="flex items-center text-sm font-semibold text-gray-700 mb-2">
                <User size={18} className="mr-2 text-blue-600" />
                Usuário
              </label>
              <input
                type="text"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                onKeyPress={handleKeyPressLogin}
                placeholder="Digite seu usuário"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                disabled={carregandoLogin}
              />
            </div>

            <div className="mb-6">
              <label className="flex items-center text-sm font-semibold text-gray-700 mb-2">
                Senha
              </label>
              <input
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                onKeyPress={handleKeyPressLogin}
                placeholder="Digite sua senha"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                disabled={carregandoLogin}
              />
            </div>

            {erroLogin && (
              <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded">
                <div className="flex items-start">
                  <AlertCircle className="text-red-500 mr-2 flex-shrink-0 mt-0.5" size={20} />
                  <p className="text-red-800 text-sm">{erroLogin}</p>
                </div>
              </div>
            )}

            <button
              onClick={fazerLogin}
              disabled={carregandoLogin}
              className={`w-full py-4 rounded-lg font-bold text-lg text-white transition-all ${
                carregandoLogin
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg'
              }`}
            >
              {carregandoLogin ? 'Entrando...' : 'Entrar'}
            </button>

            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">
                <strong>Usuários padrão:</strong>
              </p>
              <div className="text-xs text-gray-500 space-y-1">
                <p>• admin / 123456 (Administrador)</p>
                <p>• dp1 / 123456 (Depto. Pessoal)</p>
                <p>• op1 / 123456 (Operacional)</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Painel de Chamadas (após login)
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* Header com informações do operador */}
          <div className="flex justify-between items-center mb-8 pb-6 border-b-2 border-gray-100">
            <div>
              <div className="flex items-center mb-2">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-600 rounded-full mr-3">
                  <Send className="text-white" size={24} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-800">
                    Painel de Chamadas
                  </h1>
                  <p className="text-sm text-gray-600">
                    {operadorLogado.nome} • {getTipoAcessoNome(operadorLogado.tipo_acesso)}
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={fazerLogout}
              className="flex items-center px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
            >
              <LogOut size={18} className="mr-2" />
              Sair
            </button>
          </div>

          {/* Formulário */}
          <div className="space-y-6">
            {/* Nome do Cliente */}
            <div>
              <label className="flex items-center text-sm font-semibold text-gray-700 mb-2">
                <User size={18} className="mr-2 text-blue-600" />
                Nome do Cliente
              </label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Digite o nome completo"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-lg"
              />
            </div>

            {/* Descrição (opcional) */}
            <div>
              <label className="flex items-center text-sm font-semibold text-gray-700 mb-2">
                Observação (opcional)
              </label>
              <input
                type="text"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ex: Levar documentos"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
              />
            </div>

            {/* Setor */}
            <div>
              <label className="flex items-center text-sm font-semibold text-gray-700 mb-2">
                <Building2 size={18} className="mr-2 text-blue-600" />
                Setor de Destino
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setSetor('Departamento Operacional')}
                  disabled={operadorLogado.tipo_acesso === 'dp'}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    setor === 'Departamento Operacional'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : operadorLogado.tipo_acesso === 'dp'
                      ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                  }`}
                >
                  <div className="font-semibold">Operacional</div>
                  <div className="text-sm opacity-80">Sala 1</div>
                </button>
                
                <button
                  onClick={() => setSetor('Departamento Pessoal')}
                  disabled={operadorLogado.tipo_acesso === 'op'}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    setor === 'Departamento Pessoal'
                      ? 'bg-green-600 text-white border-green-600'
                      : operadorLogado.tipo_acesso === 'op'
                      ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-green-400'
                  }`}
                >
                  <div className="font-semibold">Pessoal</div>
                  <div className="text-sm opacity-80">Sala 2</div>
                </button>
              </div>
            </div>

            {/* Botão Chamar */}
            <button
              onClick={chamarCliente}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 rounded-lg font-bold text-lg hover:from-blue-700 hover:to-indigo-700 transition-all transform hover:scale-105 shadow-lg"
            >
              Chamar Cliente
            </button>
          </div>

          {/* Mensagem de Feedback */}
          {mensagem && (
            <div className={`mt-6 p-4 rounded-lg text-center font-semibold ${
              mensagem.includes('✓') 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {mensagem}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}