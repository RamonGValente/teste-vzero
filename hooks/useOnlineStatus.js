import { useEffect } from 'react';
import { onlineStatusService } from '../services/onlineStatusService';

export const useOnlineStatus = () => {
  useEffect(() => {
    // Garante que está online quando o hook é usado
    onlineStatusService.setOnline();

    return () => {
      // Cleanup é feito pelo serviço automaticamente
    };
  }, []);

  return {
    setOnline: () => onlineStatusService.setOnline(),
    setOffline: () => onlineStatusService.setOfflineImmediately(),
    forceOffline: () => onlineStatusService.forceOffline()
  };
};