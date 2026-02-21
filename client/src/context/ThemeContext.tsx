import React, { createContext, useContext, useEffect, useState } from 'react';

export type ThemeKey = 'light' | 'dark';

const STORAGE_KEY = 'brainiax_theme';

const defaultTheme: ThemeKey = 'light';

type ThemeContextShape = {
  theme: ThemeKey;
  setTheme: (t: ThemeKey) => void;
  toggle: () => void;
};

const ThemeContext = createContext<ThemeContextShape>({
  theme: defaultTheme,
  setTheme: () => {},
  toggle: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeKey>(defaultTheme);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as ThemeKey | null;
      if (saved) setThemeState(saved);
    } catch (e) {}
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch (e) {}
  }, [theme]);

  const setTheme = (t: ThemeKey) => {
    setThemeState(t);
  };

  const toggle = () => setThemeState((s) => (s === 'light' ? 'dark' : 'light'));

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
};
