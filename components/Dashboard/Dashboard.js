import React, { useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import './Dashboard.css';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const { setOnline } = useOnlineStatus();

  useEffect(() => {
    // Garante que está online ao carregar o dashboard
    setOnline();
  }, [setOnline]);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>Dashboard</h1>
        <div className="user-info">
          <span>Olá, {user?.email}</span>
          <button onClick={handleLogout} className="logout-button">
            Sair
          </button>
        </div>
      </header>
      
      <div className="dashboard-content">
        <div className="welcome-card">
          <h2>Bem-vindo ao VZero</h2>
          <p>Seu status está sendo gerenciado automaticamente:</p>
          <ul>
            <li>✅ Online quando o app está aberto</li>
            <li>⏳ Offline 30s após fechar o app</li>
            <li>🔒 Login persistente</li>
          </ul>
        </div>
        
        <div className="quick-actions">
          <h3>Ações Rápidas</h3>
          <div className="action-buttons">
            <button className="action-button">Chat</button>
            <button className="action-button">Contatos</button>
            <button className="action-button">Configurações</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;