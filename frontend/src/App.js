// App.js - Sistema de Recepção Empresarial
// Integração de todos os componentes

import React, { useState } from 'react';
import TelaLogin from './components/TelaLogin';
import PainelRecepcao from './components/PainelRecepcao';
import PainelDepartamento from './components/PainelDepartamento';
import PainelAdmin from './components/PainelAdmin';
import PainelTV from './components/PainelTV';

export default function App() {
  const [usuarioLogado, setUsuarioLogado] = useState(null);

  const handleLogin = (usuario) => {
    setUsuarioLogado(usuario);
    console.log('Usuário logado:', usuario);
  };

  const handleLogout = () => {
    setUsuarioLogado(null);
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
      // Se perfil não reconhecido, volta para login
      return <TelaLogin onLogin={handleLogin} />;
  }
}