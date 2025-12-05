//Tela Login
import React, { useState } from 'react';
import { User, Lock, AlertCircle, LogIn, Building2 } from 'lucide-react';
import './TelaLogin.css';

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
    <div className="tela-login-container">
      {/* Fundo com Imagem */}
      <div className="tela-login-background"></div>
      
      {/* Overlay Gradiente */}
      <div className="tela-login-overlay"></div>

      {/* Elementos Decorativos */}
      <div className="tela-login-decoration tela-login-decoration-1"></div>
      <div className="tela-login-decoration tela-login-decoration-2"></div>

      {/* Conteúdo */}
      <div className="tela-login-content">
        {/* Header */}
        <div className="tela-login-header">
          <div className="tela-login-logo-wrapper">
            <Building2 className="tela-login-logo-icon" size={40} />
          </div>
          <h1 className="tela-login-title">Sistema de Recepção</h1>
          <p className="tela-login-subtitle">Faça login para acessar o sistema</p>
        </div>

        {/* Card de Login */}
        <div className="tela-login-card">
          {/* Campo Usuário */}
          <div className="tela-login-form-group">
            <label className="tela-login-label">
              <User size={18} className="tela-login-label-icon" />
              Usuário
            </label>
            <input
              type="text"
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Digite seu usuário"
              className="tela-login-input"
              disabled={carregando}
            />
          </div>

          {/* Campo Senha */}
          <div className="tela-login-form-group">
            <label className="tela-login-label">
              <Lock size={18} className="tela-login-label-icon" />
              Senha
            </label>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Digite sua senha"
              className="tela-login-input"
              disabled={carregando}
            />
          </div>

          {/* Mensagem de Erro */}
          {erroLogin && (
            <div className="tela-login-error">
              <div className="tela-login-error-content">
                <AlertCircle className="tela-login-error-icon" size={20} />
                <p className="tela-login-error-text">{erroLogin}</p>
              </div>
            </div>
          )}

          {/* Botão de Login */}
          <button
            onClick={fazerLogin}
            disabled={carregando}
            className="tela-login-btn"
          >
            {carregando ? (
              <>
                <div className="tela-login-spinner"></div>
                Entrando...
              </>
            ) : (
              <>
                <LogIn size={20} className="tela-login-btn-icon" />
                Entrar
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}