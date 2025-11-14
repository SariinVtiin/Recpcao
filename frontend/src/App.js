// App.js - Sistema de Recepção Empresarial
// Integração de todos os componentes + Painel de Relatórios

import React, { useState } from 'react';
import TelaLogin from './components/TelaLogin';
import PainelRecepcao from './components/PainelRecepcao';
import PainelDepartamento from './components/PainelDepartamento';
import PainelAdmin from './components/PainelAdmin';
import PainelRelatorios from './components/PainelRelatorio';
import PainelTV from './components/PainelTV';

export default function App() {
  const [usuarioLogado, setUsuarioLogado] = useState(null);
  const [telaAtual, setTelaAtual] = useState('login'); // Controla qual tela mostrar

  const handleLogin = (usuario) => {
    setUsuarioLogado(usuario);
    console.log('Usuário logado:', usuario);
    
    // Define tela inicial baseada no perfil
    switch (usuario.perfil) {
      case 'administrador':
        setTelaAtual('admin');
        break;
      case 'recepcionista':
        setTelaAtual('recepcao');
        break;
      case 'departamento':
        setTelaAtual('departamento');
        break;
      case 'painel':
        setTelaAtual('tv');
        break;
      default:
        setTelaAtual('login');
    }
  };

  const handleLogout = () => {
    setUsuarioLogado(null);
    setTelaAtual('login');
  };

  const handleAbrirRelatorios = () => {
    setTelaAtual('relatorios');
  };

  const handleVoltarParaAdmin = () => {
    setTelaAtual('admin');
  };

  // Renderização baseada na tela atual
  switch (telaAtual) {
    case 'login':
      return <TelaLogin onLogin={handleLogin} />;

    case 'admin':
      return (
        <PainelAdmin
          usuario={usuarioLogado}
          onLogout={handleLogout}
          onAbrirRelatorios={handleAbrirRelatorios}
        />
      );

    case 'relatorios':
      return (
        <PainelRelatorios
          usuario={usuarioLogado}
          onVoltar={handleVoltarParaAdmin}
        />
      );

    case 'recepcao':
      return (
        <PainelRecepcao
          usuario={usuarioLogado}
          onLogout={handleLogout}
        />
      );

    case 'departamento':
      return (
        <PainelDepartamento
          usuario={usuarioLogado}
          onLogout={handleLogout}
        />
      );

    case 'tv':
      return <PainelTV />;

    default:
      return <TelaLogin onLogin={handleLogin} />;
  }
}