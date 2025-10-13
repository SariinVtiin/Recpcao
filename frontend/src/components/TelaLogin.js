import React, { useState } from 'react';
import { User, Lock, AlertCircle, LogIn, Building2 } from 'lucide-react';

export default function TelaLogin({ onLogin }) {
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [erroLogin, setErroLogin] = useState('');
  const [carregando, setCarregando] = useState(false);

  const fazerLogin = async () => {
    setErroLogin('');
    
    if (!usuario.trim() || !senha.trim()) {
      setErroLogin('Preencha usuário e senha');
      return;
    }

    setCarregando(true);

    try {
      const response = await fetch('http://192.167.2.41:3001/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario: usuario.trim(), senha: senha.trim() }),
      });

      const data = await response.json();

      if (response.ok) {
        onLogin(data);
      } else {
        setErroLogin(data.error || 'Erro ao fazer login');
      }
    } catch (error) {
      console.error('Erro:', error);
      setErroLogin('Erro de conexão com o servidor');
    } finally {
      setCarregando(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') fazerLogin();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full mb-4 shadow-xl">
            <Building2 className="text-white" size={40} />
          </div>
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Sistema de Recepção</h1>
          <p className="text-gray-600">Faça login para acessar o sistema</p>
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
              onKeyPress={handleKeyPress}
              placeholder="Digite seu usuário"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none transition-colors"
              disabled={carregando}
            />
          </div>

          <div className="mb-6">
            <label className="flex items-center text-sm font-semibold text-gray-700 mb-2">
              <Lock size={18} className="mr-2 text-blue-600" />
              Senha
            </label>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Digite sua senha"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none transition-colors"
              disabled={carregando}
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
            disabled={carregando}
            className={`w-full py-4 rounded-lg font-bold text-lg text-white transition-all flex items-center justify-center ${
              carregando
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg'
            }`}
          >
            {carregando ? (
              <>
                <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Entrando...
              </>
            ) : (
              <>
                <LogIn size={20} className="mr-2" />
                Entrar
              </>
            )}
          </button>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-2"><strong>Usuários de teste:</strong></p>
            <div className="text-xs text-gray-500 space-y-1">
              <p>• admin / 123456 (Recepcionista)</p>
              <p>• dp1 / 123456 (Depto. Pessoal)</p>
              <p>• op1 / 123456 (Operacional)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}