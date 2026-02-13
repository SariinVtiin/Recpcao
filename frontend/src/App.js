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
  const [telaAtual, setTelaAtual] = useState('login');

  const handleLogin = (usuario) => {
    setUsuarioLogado(usuario);
    
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
      case 'relatorio':  // CORRIGIDO: singular como está no BD
        setTelaAtual('relatorios');
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
    if (usuarioLogado?.perfil === 'administrador') {
      setTelaAtual('admin');
    } else if (usuarioLogado?.perfil === 'relatorio') {  // CORRIGIDO: singular
      handleLogout();
    } else {
      handleLogout();
    }
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