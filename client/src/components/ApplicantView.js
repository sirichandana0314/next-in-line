import React, { useState } from 'react';
import { applicationAPI } from '../services/api';

function ApplicantView() {
    const [mode, setMode] = useState('lookup');
    const [email, setEmail] = useState('');
    const [applications, setApplications] = useState([]);
    const [selectedApp, setSelectedApp] = useState(null);
    const [history, setHistory] = useState([]);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [loading, setLoading] = useState(false);
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

    return (
        <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
            <h1>👤 Applicant Portal</h1>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                {['lookup', 'apply'].map((m) => (
                    <button
                        key={m}
                        onClick={() => {
                            setMode(m);
                            setSelectedApp(null);
                            setError(null);
                            setSuccess(null);
                        }}
                        style={{
                            padding: '8px 16px',
                            background:
                                mode === m || (mode === 'status' && m === 'lookup')
                                    ? '#3b82f6'
                                    : '#e5e7eb',
                            color:
                                mode === m || (mode === 'status' && m === 'lookup')
                                    ? 'white'
                                    : 'black',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                        }}
                    >
                        {m === 'lookup' ? 'Check Status' : 'Apply'}
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
                    padding: '10px',
                    borderRadius: '8px',
                    marginBottom: '16px',
                }}>
                    {success}
                </div>
            )}

            {/* LOOKUP */}
            {mode === 'lookup' && (
                <div style={s.card}>
                    <h3>Look Up Your Applications</h3>
                    <form
                        onSubmit={handleLookup}
                        style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}
                    >
                        <input
                            type="email"
                            placeholder="Enter your email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            style={{ ...s.input, marginBottom: 0, flex: 1 }}
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
                            }}
                        >
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                            }}>
                                <div>
                                    <strong>{app.job_title}</strong> at {app.company_name}
                                    <div style={{ fontSize: '13px', color: '#6b7280' }}>
                                        Applied: {new Date(app.applied_at).toLocaleDateString()}
                                    </div>
                                </div>
                                <div>
                                    {statusEmoji[app.status] || '❓'}{' '}
                                    {app.status.replace('_', ' ').toUpperCase()}
                                </div>
                            </div>
                            <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>
                                Click to view details →
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* APPLY */}
            {mode === 'apply' && (
                <div style={s.card}>
                    <h3>Submit Application</h3>
                    <form onSubmit={handleApply}>
                        <label style={s.label}>Job ID</label>
                        <input
                            type="text"
                            placeholder="Paste the Job ID here"
                            value={applyForm.jobId}
                            onChange={(e) =>
                                setApplyForm({ ...applyForm, jobId: e.target.value })
                            }
                            style={s.input}
                            required
                        />
                        <label style={s.label}>Your Name</label>
                        <input
                            type="text"
                            placeholder="Full name"
                            value={applyForm.applicantName}
                            onChange={(e) =>
                                setApplyForm({ ...applyForm, applicantName: e.target.value })
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
                                setApplyForm({ ...applyForm, applicantEmail: e.target.value })
                            }
                            style={s.input}
                            required
                        />
                        <button
                            type="submit"
                            disabled={loading}
                            style={{ ...s.btnPrimary, background: '#22c55e', fontWeight: 'bold' }}
                        >
                            {loading ? 'Submitting...' : 'Submit Application'}
                        </button>
                    </form>
                </div>
            )}

            {/* STATUS DETAIL */}
            {mode === 'status' && selectedApp && (
                <div style={s.card}>
                    <button
                        onClick={() => { setMode('lookup'); setSelectedApp(null); }}
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
                    }}>
                        <div><strong>Job:</strong> {selectedApp.jobTitle}</div>
                        <div><strong>Company:</strong> {selectedApp.companyName}</div>
                        <div><strong>Name:</strong> {selectedApp.applicantName}</div>
                        <div><strong>Email:</strong> {selectedApp.applicantEmail}</div>
                        <div>
                            <strong>Status:</strong>{' '}
                            {selectedApp.status.replace('_', ' ').toUpperCase()}
                        </div>
                        <div>
                            <strong>Applied:</strong>{' '}
                            {new Date(selectedApp.appliedAt).toLocaleString()}
                        </div>
                        {selectedApp.queuePosition && (
                            <div>
                                <strong>Queue Position:</strong>{' '}
                                {selectedApp.queuePosition} of {selectedApp.totalWaitlisted}
                            </div>
                        )}
                        {selectedApp.decayCount > 0 && (
                            <div>
                                <strong>Decay Count:</strong> ⚠️ {selectedApp.decayCount}
                            </div>
                        )}
                    </div>

                    {selectedApp.acknowledgmentDeadline && (
                        <div style={{
                            background: '#fffbeb',
                            padding: '12px',
                            borderRadius: '8px',
                            border: '1px solid #f59e0b',
                            marginBottom: '20px',
                        }}>
                            <strong>⏰ Acknowledge by:</strong>{' '}
                            {new Date(selectedApp.acknowledgmentDeadline).toLocaleString()}
                            <br />
                            <small>
                                You must acknowledge before this deadline or you will be
                                moved back in the waitlist.
                            </small>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                        {selectedApp.status === 'pending_acknowledgment' && (
                            <button
                                onClick={() => handleAcknowledge(selectedApp.id)}
                                disabled={loading}
                                style={{
                                    padding: '10px 24px',
                                    background: '#22c55e',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontWeight: 'bold',
                                    fontSize: '16px',
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
                                    padding: '10px 24px',
                                    background: '#ef4444',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                }}
                            >
                                Withdraw Application
                            </button>
                        )}
                    </div>

                    {/* Timeline */}
                    <h3>📋 Application Timeline</h3>
                    <div style={{ paddingLeft: '20px', borderLeft: '2px solid #e5e7eb' }}>
                        {history.map((entry, idx) => (
                            <div key={entry.id} style={{ marginBottom: '16px', position: 'relative' }}>
                                <div style={{
                                    position: 'absolute',
                                    left: '-26px',
                                    top: '4px',
                                    width: '12px',
                                    height: '12px',
                                    borderRadius: '50%',
                                    background:
                                        idx === history.length - 1 ? '#3b82f6' : '#d1d5db',
                                }} />
                                <div style={{ fontSize: '13px', color: '#6b7280' }}>
                                    {new Date(entry.created_at).toLocaleString()}
                                </div>
                                <div style={{ fontWeight: 'bold' }}>
                                    {entry.previous_status ? `${entry.previous_status} → ` : ''}
                                    {entry.new_status}
                                </div>
                                <div style={{ fontSize: '14px', color: '#4b5563' }}>
                                    {entry.reason}
                                </div>
                                {entry.metadata &&
                                    Object.keys(entry.metadata).length > 0 && (
                                    <div style={{
                                        fontSize: '12px',
                                        color: '#9ca3af',
                                        fontFamily: 'monospace',
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