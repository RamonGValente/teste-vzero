import { useEffect } from 'react';
import { App } from '@capacitor/app';

export const useAndroidBackButton = (onBackButton?: () => void) => {
  useEffect(() => {
    const handleBackButton = () => {
      if (onBackButton) {
        onBackButton();
      } else {
        // Default behavior - close the app
        App.exitApp();
      }
    };

    // Listen for back button on Android
    let listener: any;
    App.addListener('backButton', handleBackButton).then((handle) => {
      listener = handle;
    });

    return () => {
      if (listener) {
        listener.remove();
      }
    };
  }, [onBackButton]);
};