import React, { createContext, useContext } from 'react';

const ThemeContext = createContext();

const theme = {
    bg: '#f5f0eb',
    bgCard: '#fffdf8',
    bgSecondary: '#ede6dd',
    bgHover: '#e8dfd5',
    text: '#3d2e1e',
    textSecondary: '#6b5744',
    textMuted: '#9c8b7a',
    border: '#ddd2c4',
    borderLight: '#ede6dd',
    accent: '#8b6f4e',
    accentLight: '#8b6f4e15',
    accentHover: '#7a5f3e',
    success: '#6b8f5e',
    successLight: '#6b8f5e15',
    successBorder: '#6b8f5e40',
    warning: '#b8923a',
    warningLight: '#b8923a15',
    warningBorder: '#b8923a40',
    danger: '#a65c4f',
    dangerLight: '#a65c4f15',
    dangerBorder: '#a65c4f40',
    purple: '#8b7068',
    purpleLight: '#8b706815',
    blue: '#7a8a6e',
    blueLight: '#7a8a6e15',
    blueBorder: '#7a8a6e40',
    navBg: '#3d2e1e',
    navText: '#f5f0eb',
    inputBg: '#fffdf8',
    inputBorder: '#ddd2c4',
    shadow: '0 2px 8px rgba(61,46,30,0.06)',
    shadowLg: '0 4px 20px rgba(61,46,30,0.08)',
    cardHighlight: '#8b6f4e08',
    statusActive: '#f0ede5',
    statusPending: '#f5efe0',
    statusWaitlisted: '#eae8e0',
    statusExited: '#f0eae5',
};

export function ThemeProvider({ children }) {
    return (
        <ThemeContext.Provider value={{ theme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within ThemeProvider');
    }
    return context;
}

export default ThemeContext;