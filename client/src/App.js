import React, { useState } from 'react';
import CompanyDashboard from './components/CompanyDashboard';
import ApplicantView from './components/ApplicantView';

function App() {
    const [view, setView] = useState('company');

    return (
        <div style={{
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}>
            <nav style={{
                background: '#1f2937',
                color: 'white',
                padding: '12px 20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
            }}>
                <div style={{ fontWeight: 'bold', fontSize: '18px' }}>
                    📋 Next In Line
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    {['company', 'applicant'].map((v) => (
                        <button
                            key={v}
                            onClick={() => setView(v)}
                            style={{
                                padding: '8px 16px',
                                background: view === v ? '#3b82f6' : 'transparent',
                                color: 'white',
                                border: '1px solid #4b5563',
                                borderRadius: '4px',
                                cursor: 'pointer',
                            }}
                        >
                            {v === 'company' ? '🏢 Company Dashboard' : '👤 Applicant Portal'}
                        </button>
                    ))}
                </div>
            </nav>

            {view === 'company' ? <CompanyDashboard /> : <ApplicantView />}
        </div>
    );
}

export default App;