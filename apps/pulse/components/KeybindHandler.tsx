'use client';

import { useEffect } from 'react';
import { useTheme } from '@/context/ThemeProvider';

const KeybindHandler = () => {
  const { isAdvancedMode, setAdvancedMode, customKeybind } = useTheme();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Toggle Advanced Mode with Shift + customKeybind
      if (event.shiftKey && event.key.toUpperCase() === customKeybind.toUpperCase()) {
        event.preventDefault();
        setAdvancedMode(!isAdvancedMode);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAdvancedMode, setAdvancedMode, customKeybind]);

  return null; // This component doesn't render anything
};

export default KeybindHandler;
