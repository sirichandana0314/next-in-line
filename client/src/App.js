import React, { useState } from 'react';
import { useTheme } from './theme/ThemeContext';
import CompanyDashboard from './components/CompanyDashboard';
import ApplicantView from './components/ApplicantView';

function App() {
    const [view, setView] = useState('company');
    const { theme } = useTheme();

    return (
        <div style={{
            fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            minHeight: '100vh',
            background: theme.bg,
            color: theme.text,
        }}>
            {/* Navbar */}
            <nav style={{
                background: theme.navBg,
                color: theme.navText,
                padding: '0 32px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                height: '54px',
                borderBottom: `1px solid ${theme.border}`,
                position: 'sticky',
                top: 0,
                zIndex: 100,
            }}>
                {/* Logo */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                }}>
                    <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '6px',
                        background: theme.accent,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '14px',
                        color: '#f5f0eb',
                        fontWeight: '800',
                    }}>◆</div>
                    <span style={{
                        fontWeight: '500',
                        fontSize: '15px',
                        letterSpacing: '0.5px',
                        opacity: 0.9,
                    }}>
                        NEXT IN LINE
                    </span>
                </div>

                {/* Nav Tabs */}
                <div style={{ display: 'flex', gap: '1px' }}>
                    {[
                        { id: 'company', label: 'Dashboard' },
                        { id: 'applicant', label: 'Careers' },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setView(tab.id)}
                            style={{
                                padding: '6px 20px',
                                background: view === tab.id
                                    ? theme.accent : 'transparent',
                                color: view === tab.id
                                    ? '#f5f0eb' : theme.navText,
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontWeight: view === tab.id ? '600' : '400',
                                fontSize: '12px',
                                opacity: view === tab.id ? 1 : 0.5,
                                transition: 'all 0.25s ease',
                                letterSpacing: '0.8px',
                                textTransform: 'uppercase',
                            }}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Status */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    fontSize: '11px',
                    opacity: 0.5,
                }}>
                    <div style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: theme.success,
                    }} />
                    online
                </div>
            </nav>

            {/* Content */}
            <div style={{ minHeight: 'calc(100vh - 54px - 36px)' }}>
                {view === 'company'
                    ? <CompanyDashboard />
                    : <ApplicantView />}
            </div>

            {/* Footer */}
            <footer style={{
                textAlign: 'center',
                padding: '10px',
                fontSize: '10px',
                color: theme.textMuted,
                borderTop: `1px solid ${theme.border}`,
                background: theme.bgSecondary,
                letterSpacing: '1.5px',
                textTransform: 'uppercase',
            }}>
                Next In Line · Hiring Pipeline
            </footer>
        </div>
    );
}

export default App;