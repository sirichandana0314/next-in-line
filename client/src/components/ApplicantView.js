import React, { useState, useEffect } from 'react';
import { applicationAPI, jobAPI, companyAPI } from '../services/api';
import CountdownTimer from './CountdownTimer';

function ApplicantView() {
    const [mode, setMode] = useState('browse');
    const [email, setEmail] = useState('');
    const [applications, setApplications] = useState([]);
    const [selectedApp, setSelectedApp] = useState(null);
    const [history, setHistory] = useState([]);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [loading, setLoading] = useState(false);
    const [jobs, setJobs] = useState([]);
    const [companies, setCompanies] = useState([]);
    const [applyForm, setApplyForm] = useState({
        jobId: '',
        applicantName: '',
        applicantEmail: '',
    });

    const statusEmoji = {
        active: '🟢',
        pending_acknowledgment: '🟡',
        waitlisted: '🔵',
        hired: '🎉',
        rejected: '🔴',
        withdrawn: '⚫',
        applied: '⚪',
    };

    const s = {
        card: {
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '20px',
            marginBottom: '16px',
        },
        input: {
            width: '100%',
            padding: '10px',
            borderRadius: '4px',
            border: '1px solid #d1d5db',
            boxSizing: 'border-box',
            marginBottom: '12px',
        },
        label: {
            fontWeight: 'bold',
            fontSize: '14px',
            display: 'block',
            marginBottom: '4px',
        },
        btnPrimary: {
            padding: '10px 20px',
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
        },
    };

    useEffect(() => {
        if (mode === 'browse') {
            loadJobs();
        }
    }, [mode]);

    const loadJobs = async () => {
        setLoading(true);
        try {
            const companiesRes = await companyAPI.list();
            const allCompanies = companiesRes.data.data;
            setCompanies(allCompanies);

            const allJobs = [];
            for (const company of allCompanies) {
                const jobsRes = await jobAPI.listByCompany(company.id);
                jobsRes.data.data.forEach((job) => {
                    if (job.status === 'open') {
                        allJobs.push({
                            ...job,
                            companyName: company.name,
                        });
                    }
                });
            }
            setJobs(allJobs);
        } catch (err) {
            setError('Failed to load jobs');
        } finally {
            setLoading(false);
        }
    };

    const handleSelectJob = (job) => {
        setApplyForm({
            jobId: job.id,
            applicantName: '',
            applicantEmail: '',
        });
        setMode('apply');
        setError(null);
        setSuccess(null);
    };

    const handleLookup = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            const res = await applicationAPI.lookupByEmail(email);
            setApplications(res.data.data);
            if (res.data.data.length === 0) {
                setError('No applications found for this email');
            }
        } catch (err) {
            setError('Failed to look up applications');
        } finally {
            setLoading(false);
        }
    };

    const handleViewStatus = async (appId) => {
        setError(null);
        try {
            const [statusRes, historyRes] = await Promise.all([
                applicationAPI.getStatus(appId),
                applicationAPI.getHistory(appId),
            ]);
            setSelectedApp(statusRes.data.data);
            setHistory(historyRes.data.data);
            setMode('status');
        } catch (err) {
            setError('Failed to load application details');
        }
    };

    const handleApply = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        setLoading(true);
        try {
            const res = await applicationAPI.apply(applyForm);
            const app = res.data.data;
            setSuccess(
                `Application submitted! Status: ${app.status.toUpperCase()}. ` +
                `Save this ID to check status later: ${app.id}`
            );
            setApplyForm({ jobId: '', applicantName: '', applicantEmail: '' });
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to submit');
        } finally {
            setLoading(false);
        }
    };

    const handleAcknowledge = async (appId) => {
        setError(null);
        setLoading(true);
        try {
            await applicationAPI.acknowledge(appId);
            setSuccess('Promotion acknowledged! You are now active.');
            handleViewStatus(appId);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to acknowledge');
        } finally {
            setLoading(false);
        }
    };

    const handleWithdraw = async (appId) => {
        if (!window.confirm('Are you sure you want to withdraw?')) return;
        setError(null);
        setLoading(true);
        try {
            await applicationAPI.exit(appId, 'withdrawn');
            setSuccess('Application withdrawn.');
            handleViewStatus(appId);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to withdraw');
        } finally {
            setLoading(false);
        }
    };

    const tabs = [
        { id: 'browse', label: '🔍 Browse Jobs' },
        { id: 'lookup', label: '📋 Check Status' },
    ];

    return (
        <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
            <h1>👤 Applicant Portal</h1>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                {tabs.map((t) => (
                    <button
                        key={t.id}
                        onClick={() => {
                            setMode(t.id);
                            setSelectedApp(null);
                            setError(null);
                            setSuccess(null);
                        }}
                        style={{
                            padding: '8px 16px',
                            background:
                                mode === t.id ||
                                (mode === 'apply' && t.id === 'browse') ||
                                (mode === 'status' && t.id === 'lookup')
                                    ? '#3b82f6'
                                    : '#e5e7eb',
                            color:
                                mode === t.id ||
                                (mode === 'apply' && t.id === 'browse') ||
                                (mode === 'status' && t.id === 'lookup')
                                    ? 'white'
                                    : 'black',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                        }}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {error && (
                <div style={{
                    background: '#fee2e2',
                    color: '#dc2626',
                    padding: '10px',
                    borderRadius: '8px',
                    marginBottom: '16px',
                }}>
                    {error}
                </div>
            )}

            {success && (
                <div style={{
                    background: '#dcfce7',
                    color: '#16a34a',
                    padding: '12px',
                    borderRadius: '8px',
                    marginBottom: '16px',
                    fontWeight: 'bold',
                }}>
                    {success}
                </div>
            )}

            {/* BROWSE JOBS */}
            {mode === 'browse' && (
                <div>
                    <h3 style={{ marginBottom: '16px' }}>
                        Open Positions
                    </h3>
                    {loading ? (
                        <div style={{
                            textAlign: 'center',
                            padding: '40px',
                            color: '#6b7280',
                        }}>
                            Loading jobs...
                        </div>
                    ) : jobs.length === 0 ? (
                        <div style={{
                            textAlign: 'center',
                            padding: '40px',
                            color: '#9ca3af',
                            border: '2px dashed #e5e7eb',
                            borderRadius: '8px',
                        }}>
                            <div style={{ fontSize: '48px', marginBottom: '8px' }}>
                                💼
                            </div>
                            <div>No open positions right now</div>
                            <div style={{ fontSize: '13px', marginTop: '4px' }}>
                                Check back later
                            </div>
                        </div>
                    ) : (
                        jobs.map((job) => (
                            <div key={job.id} style={{
                                ...s.card,
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                            }}>
                                <div>
                                    <div style={{
                                        fontWeight: 'bold',
                                        fontSize: '18px',
                                        marginBottom: '4px',
                                    }}>
                                        {job.title}
                                    </div>
                                    <div style={{
                                        color: '#6b7280',
                                        fontSize: '14px',
                                        marginBottom: '8px',
                                    }}>
                                        🏢 {job.companyName}
                                    </div>
                                    {job.description && (
                                        <div style={{
                                            fontSize: '14px',
                                            color: '#4b5563',
                                            marginBottom: '8px',
                                        }}>
                                            {job.description}
                                        </div>
                                    )}
                                    <div style={{
                                        display: 'flex',
                                        gap: '12px',
                                        fontSize: '13px',
                                    }}>
                                        <span style={{
                                            background: '#f0fdf4',
                                            color: '#16a34a',
                                            padding: '2px 8px',
                                            borderRadius: '12px',
                                            border: '1px solid #86efac',
                                        }}>
                                            ✅ Open
                                        </span>
                                        <span style={{
                                            background: '#eff6ff',
                                            color: '#3b82f6',
                                            padding: '2px 8px',
                                            borderRadius: '12px',
                                            border: '1px solid #93c5fd',
                                        }}>
                                            👥 Capacity: {job.active_capacity}
                                        </span>
                                        <span style={{
                                            background: '#fafafa',
                                            color: '#6b7280',
                                            padding: '2px 8px',
                                            borderRadius: '12px',
                                            border: '1px solid #e5e7eb',
                                        }}>
                                            📨 {job.total_applications || 0} applied
                                        </span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleSelectJob(job)}
                                    style={{
                                        padding: '10px 20px',
                                        background: '#22c55e',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontWeight: 'bold',
                                        fontSize: '14px',
                                        whiteSpace: 'nowrap',
                                        marginLeft: '16px',
                                    }}
                                >
                                    Apply Now →
                                </button>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* APPLY */}
            {mode === 'apply' && (
                <div style={s.card}>
                    <button
                        onClick={() => {
                            setMode('browse');
                            setError(null);
                            setSuccess(null);
                        }}
                        style={{
                            marginBottom: '16px',
                            padding: '6px 12px',
                            background: '#e5e7eb',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                        }}
                    >
                        ← Back to Jobs
                    </button>

                    <h3>Submit Application</h3>

                    <div style={{
                        background: '#f0fdf4',
                        border: '1px solid #86efac',
                        borderRadius: '8px',
                        padding: '10px 14px',
                        marginBottom: '16px',
                        fontSize: '14px',
                        color: '#16a34a',
                    }}>
                        ✅ Applying for Job ID: {applyForm.jobId}
                    </div>

                    <form onSubmit={handleApply}>
                        <label style={s.label}>Your Name</label>
                        <input
                            type="text"
                            placeholder="Full name"
                            value={applyForm.applicantName}
                            onChange={(e) =>
                                setApplyForm({
                                    ...applyForm,
                                    applicantName: e.target.value,
                                })
                            }
                            style={s.input}
                            required
                        />
                        <label style={s.label}>Your Email</label>
                        <input
                            type="email"
                            placeholder="email@example.com"
                            value={applyForm.applicantEmail}
                            onChange={(e) =>
                                setApplyForm({
                                    ...applyForm,
                                    applicantEmail: e.target.value,
                                })
                            }
                            style={s.input}
                            required
                        />
                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                ...s.btnPrimary,
                                background: '#22c55e',
                                fontWeight: 'bold',
                                width: '100%',
                                padding: '12px',
                                fontSize: '16px',
                            }}
                        >
                            {loading ? 'Submitting...' : '🚀 Submit Application'}
                        </button>
                    </form>
                </div>
            )}

            {/* LOOKUP */}
            {mode === 'lookup' && (
                <div style={s.card}>
                    <h3>Look Up Your Applications</h3>
                    <form
                        onSubmit={handleLookup}
                        style={{
                            display: 'flex',
                            gap: '8px',
                            marginBottom: '16px',
                        }}
                    >
                        <input
                            type="email"
                            placeholder="Enter your email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            style={{
                                ...s.input,
                                marginBottom: 0,
                                flex: 1,
                            }}
                            required
                        />
                        <button
                            type="submit"
                            disabled={loading}
                            style={s.btnPrimary}
                        >
                            {loading ? '...' : 'Search'}
                        </button>
                    </form>

                    {applications.length === 0 && !error && (
                        <div style={{
                            textAlign: 'center',
                            padding: '30px',
                            color: '#9ca3af',
                            border: '2px dashed #e5e7eb',
                            borderRadius: '8px',
                        }}>
                            <div style={{ fontSize: '32px' }}>📧</div>
                            <div style={{ marginTop: '8px' }}>
                                Enter your email to find your applications
                            </div>
                        </div>
                    )}

                    {applications.map((app) => (
                        <div
                            key={app.id}
                            onClick={() => handleViewStatus(app.id)}
                            style={{
                                padding: '12px',
                                border: '1px solid #e5e7eb',
                                borderRadius: '8px',
                                marginBottom: '8px',
                                cursor: 'pointer',
                                transition: 'background 0.2s',
                            }}
                        >
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                            }}>
                                <div>
                                    <strong>{app.job_title}</strong> at {app.company_name}
                                    <div style={{
                                        fontSize: '13px',
                                        color: '#6b7280',
                                    }}>
                                        Applied:{' '}
                                        {new Date(app.applied_at).toLocaleDateString()}
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div>
                                        {statusEmoji[app.status] || '❓'}{' '}
                                        <strong>
                                            {app.status.replace('_', ' ').toUpperCase()}
                                        </strong>
                                    </div>
                                    {app.status === 'waitlisted' && app.waitlist_position && (
                                        <div style={{
                                            fontSize: '12px',
                                            color: '#6b7280',
                                        }}>
                                            Position #{app.waitlist_position}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div style={{
                                fontSize: '11px',
                                color: '#9ca3af',
                                marginTop: '4px',
                            }}>
                                Click to view details →
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* STATUS DETAIL */}
            {mode === 'status' && selectedApp && (
                <div style={s.card}>
                    <button
                        onClick={() => {
                            setMode('lookup');
                            setSelectedApp(null);
                        }}
                        style={{
                            marginBottom: '16px',
                            padding: '6px 12px',
                            background: '#e5e7eb',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                        }}
                    >
                        ← Back
                    </button>

                    <h2>
                        {statusEmoji[selectedApp.status] || '❓'} Application Status
                    </h2>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '12px',
                        marginBottom: '20px',
                        background: '#f9fafb',
                        padding: '16px',
                        borderRadius: '8px',
                    }}>
                        <div><strong>Job:</strong> {selectedApp.jobTitle}</div>
                        <div><strong>Company:</strong> {selectedApp.companyName}</div>
                        <div><strong>Name:</strong> {selectedApp.applicantName}</div>
                        <div><strong>Email:</strong> {selectedApp.applicantEmail}</div>
                        <div>
                            <strong>Status:</strong>{' '}
                            <span style={{ fontWeight: 'bold' }}>
                                {statusEmoji[selectedApp.status]}{' '}
                                {selectedApp.status.replace('_', ' ').toUpperCase()}
                            </span>
                        </div>
                        <div>
                            <strong>Applied:</strong>{' '}
                            {new Date(selectedApp.appliedAt).toLocaleString()}
                        </div>
                        {selectedApp.queuePosition && (
                            <>
                                <div>
                                    <strong>Queue Position:</strong>{' '}
                                    <span style={{
                                        background: '#eff6ff',
                                        color: '#3b82f6',
                                        padding: '2px 8px',
                                        borderRadius: '12px',
                                        fontWeight: 'bold',
                                    }}>
                                        #{selectedApp.queuePosition} of {selectedApp.totalWaitlisted}
                                    </span>
                                </div>
                            </>
                        )}
                        {selectedApp.decayCount > 0 && (
                            <div>
                                <strong>Decay Count:</strong>{' '}
                                <span style={{
                                    background: '#fee2e2',
                                    color: '#dc2626',
                                    padding: '2px 8px',
                                    borderRadius: '12px',
                                }}>
                                    ⚠️ {selectedApp.decayCount}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Countdown Timer */}
                    {selectedApp.acknowledgmentDeadline && (
                        <CountdownTimer
                            deadline={selectedApp.acknowledgmentDeadline}
                        />
                    )}

                    {/* Action Buttons */}
                    <div style={{
                        display: 'flex',
                        gap: '8px',
                        marginBottom: '20px',
                    }}>
                        {selectedApp.status === 'pending_acknowledgment' && (
                            <button
                                onClick={() => handleAcknowledge(selectedApp.id)}
                                disabled={loading}
                                style={{
                                    padding: '12px 24px',
                                    background: '#22c55e',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontWeight: 'bold',
                                    fontSize: '16px',
                                    flex: 1,
                                }}
                            >
                                ✅ Acknowledge Promotion
                            </button>
                        )}
                        {['active', 'waitlisted', 'pending_acknowledgment'].includes(
                            selectedApp.status
                        ) && (
                            <button
                                onClick={() => handleWithdraw(selectedApp.id)}
                                disabled={loading}
                                style={{
                                    padding: '12px 24px',
                                    background: '#ef4444',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                }}
                            >
                                Withdraw
                            </button>
                        )}
                    </div>

                    {/* Timeline */}
                    <h3>📋 Application Timeline</h3>
                    <div style={{
                        paddingLeft: '20px',
                        borderLeft: '2px solid #e5e7eb',
                    }}>
                        {history.map((entry, idx) => (
                            <div
                                key={entry.id}
                                style={{
                                    marginBottom: '16px',
                                    position: 'relative',
                                }}
                            >
                                <div style={{
                                    position: 'absolute',
                                    left: '-26px',
                                    top: '4px',
                                    width: '12px',
                                    height: '12px',
                                    borderRadius: '50%',
                                    background:
                                        idx === history.length - 1
                                            ? '#3b82f6'
                                            : '#d1d5db',
                                }} />
                                <div style={{
                                    fontSize: '13px',
                                    color: '#6b7280',
                                }}>
                                    {new Date(entry.created_at).toLocaleString()}
                                </div>
                                <div style={{ fontWeight: 'bold' }}>
                                    {entry.previous_status
                                        ? `${entry.previous_status} → `
                                        : ''}
                                    {entry.new_status}
                                </div>
                                <div style={{
                                    fontSize: '14px',
                                    color: '#4b5563',
                                }}>
                                    {entry.reason}
                                </div>
                                {entry.metadata &&
                                    Object.keys(entry.metadata).length > 0 && (
                                    <div style={{
                                        fontSize: '12px',
                                        color: '#9ca3af',
                                        fontFamily: 'monospace',
                                        background: '#f9fafb',
                                        padding: '4px 8px',
                                        borderRadius: '4px',
                                        marginTop: '4px',
                                    }}>
                                        {JSON.stringify(entry.metadata)}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default ApplicantView;