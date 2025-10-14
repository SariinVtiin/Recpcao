import React, { useState } from 'react';
import TelaLogin from './components/TelaLogin';
import PainelRecepcao from './components/PainelRecepcao';
import PainelDepartamento from './components/PainelDepartamento';
import PainelTV from './components/PainelTV';
import PainelAdmin from './components/PainelAdmin';
import './App.css';

export default function App() {
  const [usuarioLogado, setUsuarioLogado] = useState(null);

  const handleLogin = (usuario) => {
    setUsuarioLogado(usuario);
    console.log('Usuário logado:', usuario);
  };

  const handleLogout = () => {
    setUsuarioLogado(null);
    console.log('Logout realizado');
  };

  // Se não estiver logado, mostra tela de login
  if (!usuarioLogado) {
    return <TelaLogin onLogin={handleLogin} />;
  }

  // Roteamento baseado no perfil do usuário
  switch (usuarioLogado.perfil) {
    case 'administrador':
      return <PainelAdmin usuario={usuarioLogado} onLogout={handleLogout} />;
    
    case 'recepcionista':
      return <PainelRecepcao usuario={usuarioLogado} onLogout={handleLogout} />;
    
    case 'departamento':
      return <PainelDepartamento usuario={usuarioLogado} onLogout={handleLogout} />;
    
    case 'painel':
      return <PainelTV />;
    
    default:
      // Se perfil desconhecido, volta para login
      console.error('Perfil desconhecido:', usuarioLogado.perfil);
      return <TelaLogin onLogin={handleLogin} />;
  }
}