import React, { useState, useEffect } from 'react';
import { useTheme } from '../theme/ThemeContext';
import { applicationAPI, jobAPI, companyAPI } from '../services/api';
import CountdownTimer from './CountdownTimer';

function ApplicantView() {
    const { theme } = useTheme();
    const [mode, setMode] = useState('browse');
    const [email, setEmail] = useState('');
    const [applications, setApplications] = useState([]);
    const [selectedApp, setSelectedApp] = useState(null);
    const [history, setHistory] = useState([]);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [loading, setLoading] = useState(false);
    const [jobs, setJobs] = useState([]);
    const [applyForm, setApplyForm] = useState({
        jobId: '', applicantName: '', applicantEmail: '',
    });

    const statusEmoji = {
        active: '●', pending_acknowledgment: '◐',
        waitlisted: '○', hired: '◆',
        rejected: '◇', withdrawn: '—', applied: '·',
    };

    const statusColor = {
        active: theme.success, pending_acknowledgment: theme.warning,
        waitlisted: theme.blue, hired: theme.success,
        rejected: theme.danger, withdrawn: theme.textMuted,
    };

    useEffect(() => {
        if (mode === 'browse') loadJobs();
    }, [mode]);

    const loadJobs = async () => {
        setLoading(true);
        try {
            const companiesRes = await companyAPI.list();
            const allJobs = [];
            for (const company of companiesRes.data.data) {
                const jobsRes = await jobAPI.listByCompany(company.id);
                jobsRes.data.data.forEach((job) => {
                    if (job.status === 'open') {
                        allJobs.push({ ...job, companyName: company.name });
                    }
                });
            }
            setJobs(allJobs);
        } catch (err) { setError('Failed to load jobs'); }
        finally { setLoading(false); }
    };

    const handleSelectJob = (job) => {
        setApplyForm({ jobId: job.id, applicantName: '', applicantEmail: '' });
        setMode('apply'); setError(null); setSuccess(null);
    };

    const handleLookup = async (e) => {
        e.preventDefault(); setError(null); setLoading(true);
        try {
            const res = await applicationAPI.lookupByEmail(email);
            setApplications(res.data.data);
            if (res.data.data.length === 0) setError('No applications found');
        } catch (err) { setError('Failed to look up'); }
        finally { setLoading(false); }
    };

    const handleViewStatus = async (appId) => {
        setError(null);
        try {
            const [s, h] = await Promise.all([
                applicationAPI.getStatus(appId),
                applicationAPI.getHistory(appId),
            ]);
            setSelectedApp(s.data.data);
            setHistory(h.data.data);
            setMode('status');
        } catch (err) { setError('Failed to load details'); }
    };

    const handleApply = async (e) => {
        e.preventDefault(); setError(null); setSuccess(null); setLoading(true);
        try {
            const res = await applicationAPI.apply(applyForm);
            const app = res.data.data;
            setSuccess(`Applied! Status: ${app.status.toUpperCase()}. ID: ${app.id}`);
            setApplyForm({ jobId: '', applicantName: '', applicantEmail: '' });
        } catch (err) { setError(err.response?.data?.error || 'Failed'); }
        finally { setLoading(false); }
    };

    const handleAcknowledge = async (appId) => {
        setError(null); setLoading(true);
        try {
            await applicationAPI.acknowledge(appId);
            setSuccess('Acknowledged! You are now active.');
            handleViewStatus(appId);
        } catch (err) { setError(err.response?.data?.error || 'Failed'); }
        finally { setLoading(false); }
    };

    const handleWithdraw = async (appId) => {
        if (!window.confirm('Withdraw application?')) return;
        setError(null); setLoading(true);
        try {
            await applicationAPI.exit(appId, 'withdrawn');
            setSuccess('Withdrawn.'); handleViewStatus(appId);
        } catch (err) { setError(err.response?.data?.error || 'Failed'); }
        finally { setLoading(false); }
    };

    const s = {
        card: {
            background: theme.bgCard, border: `1px solid ${theme.border}`,
            borderRadius: '12px', padding: '20px', marginBottom: '14px',
            boxShadow: theme.shadow, transition: 'all 0.3s ease',
        },
        input: {
            width: '100%', padding: '11px 14px', borderRadius: '8px',
            border: `1px solid ${theme.inputBorder}`, boxSizing: 'border-box',
            marginBottom: '12px', background: theme.inputBg, color: theme.text,
            fontSize: '14px', transition: 'all 0.2s ease',
        },
        label: {
            fontWeight: '600', fontSize: '11px', display: 'block',
            marginBottom: '5px', color: theme.textSecondary,
            letterSpacing: '0.5px', textTransform: 'uppercase',
        },
        btnPrimary: {
            padding: '10px 20px', background: theme.accent,
            color: '#f5f0eb', border: 'none', borderRadius: '8px',
            cursor: 'pointer', fontWeight: '600', fontSize: '13px',
            transition: 'all 0.2s ease',
        },
    };

    return (
        <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>

            {/* Tabs */}
            <div style={{
                display: 'flex', gap: '2px', marginBottom: '24px',
                background: theme.bgSecondary, padding: '3px',
                borderRadius: '10px', border: `1px solid ${theme.border}`,
            }}>
                {[
                    { id: 'browse', label: 'Openings' },
                    { id: 'lookup', label: 'My Status' },
                ].map((t) => (
                    <button key={t.id}
                        onClick={() => {
                            setMode(t.id); setSelectedApp(null);
                            setError(null); setSuccess(null);
                        }}
                        style={{
                            flex: 1, padding: '8px 16px',
                            background: (mode === t.id || (mode === 'apply' && t.id === 'browse')
                                || (mode === 'status' && t.id === 'lookup'))
                                ? theme.accent : 'transparent',
                            color: (mode === t.id || (mode === 'apply' && t.id === 'browse')
                                || (mode === 'status' && t.id === 'lookup'))
                                ? '#f5f0eb' : theme.textMuted,
                            border: 'none', borderRadius: '8px',
                            cursor: 'pointer', fontWeight: '600',
                            fontSize: '12px', letterSpacing: '0.5px',
                            textTransform: 'uppercase',
                            transition: 'all 0.25s ease',
                        }}>
                        {t.label}
                    </button>
                ))}
            </div>

            {error && (
                <div style={{
                    background: theme.dangerLight, color: theme.danger,
                    padding: '10px 14px', borderRadius: '8px',
                    marginBottom: '14px', border: `1px solid ${theme.dangerBorder}`,
                    fontSize: '13px',
                }}>{error}</div>
            )}
            {success && (
                <div style={{
                    background: theme.successLight, color: theme.success,
                    padding: '10px 14px', borderRadius: '8px',
                    marginBottom: '14px', border: `1px solid ${theme.successBorder}`,
                    fontSize: '13px', fontWeight: '500',
                }}>{success}</div>
            )}

            {/* BROWSE */}
            {mode === 'browse' && (
                <div>
                    {loading ? (
                        <div style={{
                            textAlign: 'center', padding: '40px',
                            color: theme.textMuted, fontSize: '13px',
                        }}>Loading positions...</div>
                    ) : jobs.length === 0 ? (
                        <div style={{
                            textAlign: 'center', padding: '48px',
                            color: theme.textMuted,
                            border: `1px dashed ${theme.border}`,
                            borderRadius: '12px',
                        }}>
                            <div style={{ fontSize: '13px' }}>No open positions</div>
                        </div>
                    ) : (
                        jobs.map((job) => (
                            <div key={job.id} style={{
                                ...s.card,
                                display: 'flex', justifyContent: 'space-between',
                                alignItems: 'center',
                            }}>
                                <div>
                                    <div style={{
                                        fontWeight: '600', fontSize: '16px',
                                        color: theme.text, marginBottom: '4px',
                                    }}>{job.title}</div>
                                    <div style={{
                                        color: theme.textSecondary,
                                        fontSize: '13px', marginBottom: '8px',
                                    }}>{job.companyName}</div>
                                    {job.description && (
                                        <div style={{
                                            fontSize: '13px', color: theme.textMuted,
                                            marginBottom: '8px',
                                        }}>{job.description}</div>
                                    )}
                                    <div style={{
                                        display: 'flex', gap: '8px', fontSize: '11px',
                                    }}>
                                        <span style={{
                                            background: theme.successLight,
                                            color: theme.success,
                                            padding: '2px 8px', borderRadius: '10px',
                                            border: `1px solid ${theme.successBorder}`,
                                        }}>Open</span>
                                        <span style={{
                                            background: theme.accentLight,
                                            color: theme.accent,
                                            padding: '2px 8px', borderRadius: '10px',
                                        }}>Cap: {job.active_capacity}</span>
                                        <span style={{
                                            color: theme.textMuted,
                                            padding: '2px 8px',
                                        }}>{job.total_applications || 0} applied</span>
                                    </div>
                                </div>
                                <button onClick={() => handleSelectJob(job)}
                                    style={{
                                        ...s.btnPrimary, whiteSpace: 'nowrap',
                                        marginLeft: '16px',
                                    }}>
                                    Apply →
                                </button>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* APPLY */}
            {mode === 'apply' && (
                <div style={s.card}>
                    <button onClick={() => { setMode('browse'); setError(null); setSuccess(null); }}
                        style={{
                            marginBottom: '16px', padding: '5px 12px',
                            background: theme.bgHover, border: `1px solid ${theme.border}`,
                            borderRadius: '6px', cursor: 'pointer',
                            color: theme.textSecondary, fontSize: '12px',
                        }}>← Back</button>
                    <div style={{
                        background: theme.accentLight,
                        border: `1px solid ${theme.accent}30`,
                        borderRadius: '8px', padding: '8px 12px',
                        marginBottom: '16px', fontSize: '12px',
                        color: theme.accent,
                    }}>Applying for: {applyForm.jobId.slice(0, 12)}...</div>
                    <form onSubmit={handleApply}>
                        <label style={s.label}>Full Name</label>
                        <input type="text" placeholder="Your name"
                            value={applyForm.applicantName}
                            onChange={(e) => setApplyForm({ ...applyForm, applicantName: e.target.value })}
                            style={s.input} required />
                        <label style={s.label}>Email</label>
                        <input type="email" placeholder="email@example.com"
                            value={applyForm.applicantEmail}
                            onChange={(e) => setApplyForm({ ...applyForm, applicantEmail: e.target.value })}
                            style={s.input} required />
                        <button type="submit" disabled={loading}
                            style={{ ...s.btnPrimary, width: '100%', padding: '12px',
                                background: theme.success, fontSize: '14px',
                            }}>
                            {loading ? 'Submitting...' : 'Submit Application'}
                        </button>
                    </form>
                </div>
            )}

            {/* LOOKUP */}
            {mode === 'lookup' && (
                <div style={s.card}>
                    <form onSubmit={handleLookup}
                        style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                        <input type="email" placeholder="Your email address"
                            value={email} onChange={(e) => setEmail(e.target.value)}
                            style={{ ...s.input, marginBottom: 0, flex: 1 }}
                            required />
                        <button type="submit" disabled={loading} style={s.btnPrimary}>
                            {loading ? '...' : 'Find'}
                        </button>
                    </form>
                    {applications.length === 0 && !error && (
                        <div style={{
                            textAlign: 'center', padding: '28px',
                            color: theme.textMuted, fontSize: '12px',
                            border: `1px dashed ${theme.border}`,
                            borderRadius: '8px',
                        }}>Enter email to find applications</div>
                    )}
                    {applications.map((app) => (
                        <div key={app.id} onClick={() => handleViewStatus(app.id)}
                            style={{
                                padding: '12px', border: `1px solid ${theme.border}`,
                                borderRadius: '10px', marginBottom: '8px',
                                cursor: 'pointer', background: theme.bgSecondary,
                                transition: 'all 0.2s ease',
                            }}>
                            <div style={{
                                display: 'flex', justifyContent: 'space-between',
                                alignItems: 'center',
                            }}>
                                <div>
                                    <strong style={{ color: theme.text, fontSize: '14px' }}>
                                        {app.job_title}
                                    </strong>
                                    <span style={{
                                        color: theme.textMuted, fontSize: '13px',
                                    }}> · {app.company_name}</span>
                                </div>
                                <span style={{
                                    color: statusColor[app.status] || theme.textMuted,
                                    fontWeight: '600', fontSize: '12px',
                                }}>
                                    {statusEmoji[app.status]} {app.status.replace('_', ' ').toUpperCase()}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* STATUS */}
            {mode === 'status' && selectedApp && (
                <div style={s.card}>
                    <button onClick={() => { setMode('lookup'); setSelectedApp(null); }}
                        style={{
                            marginBottom: '16px', padding: '5px 12px',
                            background: theme.bgHover, border: `1px solid ${theme.border}`,
                            borderRadius: '6px', cursor: 'pointer',
                            color: theme.textSecondary, fontSize: '12px',
                        }}>← Back</button>

                    <div style={{
                        display: 'grid', gridTemplateColumns: '1fr 1fr',
                        gap: '10px', marginBottom: '20px',
                        background: theme.bgSecondary, padding: '16px',
                        borderRadius: '10px', border: `1px solid ${theme.border}`,
                    }}>
                        <div>
                            <span style={{ ...s.label, marginBottom: '2px' }}>Position</span>
                            <div style={{ color: theme.text, fontSize: '14px', fontWeight: '500' }}>
                                {selectedApp.jobTitle}
                            </div>
                        </div>
                        <div>
                            <span style={{ ...s.label, marginBottom: '2px' }}>Company</span>
                            <div style={{ color: theme.text, fontSize: '14px', fontWeight: '500' }}>
                                {selectedApp.companyName}
                            </div>
                        </div>
                        <div>
                            <span style={{ ...s.label, marginBottom: '2px' }}>Status</span>
                            <div style={{
                                color: statusColor[selectedApp.status],
                                fontSize: '14px', fontWeight: '600',
                            }}>
                                {statusEmoji[selectedApp.status]} {selectedApp.status.replace('_', ' ').toUpperCase()}
                            </div>
                        </div>
                        <div>
                            <span style={{ ...s.label, marginBottom: '2px' }}>Applied</span>
                            <div style={{ color: theme.text, fontSize: '13px' }}>
                                {new Date(selectedApp.appliedAt).toLocaleDateString()}
                            </div>
                        </div>
                        {selectedApp.queuePosition && (
                            <div>
                                <span style={{ ...s.label, marginBottom: '2px' }}>Queue</span>
                                <div style={{
                                    color: theme.blue, fontSize: '14px', fontWeight: '600',
                                }}>#{selectedApp.queuePosition} of {selectedApp.totalWaitlisted}</div>
                            </div>
                        )}
                        {selectedApp.decayCount > 0 && (
                            <div>
                                <span style={{ ...s.label, marginBottom: '2px' }}>Decays</span>
                                <div style={{
                                    color: theme.danger, fontSize: '14px', fontWeight: '600',
                                }}>↻ {selectedApp.decayCount}</div>
                            </div>
                        )}
                    </div>

                    {selectedApp.acknowledgmentDeadline && (
                        <CountdownTimer deadline={selectedApp.acknowledgmentDeadline} />
                    )}

                    <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                        {selectedApp.status === 'pending_acknowledgment' && (
                            <button onClick={() => handleAcknowledge(selectedApp.id)}
                                disabled={loading}
                                style={{
                                    flex: 1, padding: '12px', background: theme.success,
                                    color: '#f5f0eb', border: 'none', borderRadius: '8px',
                                    cursor: 'pointer', fontWeight: '600', fontSize: '14px',
                                }}>
                                Acknowledge Promotion
                            </button>
                        )}
                        {['active', 'waitlisted', 'pending_acknowledgment'].includes(selectedApp.status) && (
                            <button onClick={() => handleWithdraw(selectedApp.id)}
                                disabled={loading}
                                style={{
                                    padding: '12px 20px', background: theme.dangerLight,
                                    color: theme.danger, border: `1px solid ${theme.dangerBorder}`,
                                    borderRadius: '8px', cursor: 'pointer',
                                    fontWeight: '500', fontSize: '13px',
                                }}>
                                Withdraw
                            </button>
                        )}
                    </div>

                    {/* Timeline */}
                    <div style={{
                        fontSize: '12px', fontWeight: '600',
                        color: theme.textSecondary, marginBottom: '12px',
                        letterSpacing: '0.5px', textTransform: 'uppercase',
                    }}>Timeline</div>
                    <div style={{ paddingLeft: '16px', borderLeft: `2px solid ${theme.border}` }}>
                        {history.map((entry, idx) => (
                            <div key={entry.id} style={{
                                marginBottom: '14px', position: 'relative',
                            }}>
                                <div style={{
                                    position: 'absolute', left: '-21px', top: '4px',
                                    width: '10px', height: '10px', borderRadius: '50%',
                                    background: idx === history.length - 1
                                        ? theme.accent : theme.border,
                                }} />
                                <div style={{ fontSize: '11px', color: theme.textMuted }}>
                                    {new Date(entry.created_at).toLocaleString()}
                                </div>
                                <div style={{
                                    fontWeight: '600', fontSize: '13px', color: theme.text,
                                }}>
                                    {entry.previous_status ? `${entry.previous_status} → ` : ''}
                                    {entry.new_status}
                                </div>
                                <div style={{
                                    fontSize: '12px', color: theme.textSecondary,
                                }}>{entry.reason}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default ApplicantView;