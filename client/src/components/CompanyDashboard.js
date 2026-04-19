import React, { useState, useEffect, useCallback } from 'react';
import { companyAPI, jobAPI, applicationAPI } from '../services/api';

function CompanyDashboard() {
    const [companies, setCompanies] = useState([]);
    const [selectedCompany, setSelectedCompany] = useState(null);
    const [jobs, setJobs] = useState([]);
    const [selectedJob, setSelectedJob] = useState(null);
    const [pipeline, setPipeline] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [newCompanyName, setNewCompanyName] = useState('');
    const [newJob, setNewJob] = useState({
        title: '',
        description: '',
        activeCapacity: 5,
        decayWindowMinutes: 1440,
    });

    useEffect(() => {
        loadCompanies();
    }, []);

    const loadPipeline = useCallback(async (jobId) => {
        try {
            const res = await jobAPI.getPipeline(jobId);
            setPipeline(res.data.data);
        } catch (err) {
            setError('Failed to load pipeline');
        }
    }, []);

    useEffect(() => {
        if (!selectedJob || !autoRefresh) return;
        const interval = setInterval(
            () => loadPipeline(selectedJob), 10000
        );
        return () => clearInterval(interval);
    }, [selectedJob, autoRefresh, loadPipeline]);

    const loadCompanies = async () => {
        try {
            const res = await companyAPI.list();
            setCompanies(res.data.data);
        } catch (err) {
            setError('Failed to load companies');
        }
    };

    const loadJobs = async (companyId) => {
        try {
            const res = await jobAPI.listByCompany(companyId);
            setJobs(res.data.data);
        } catch (err) {
            setError('Failed to load jobs');
        }
    };

    const handleSelectCompany = (id) => {
        setSelectedCompany(id);
        setSelectedJob(null);
        setPipeline(null);
        loadJobs(id);
    };

    const handleSelectJob = (id) => {
        setSelectedJob(id);
        loadPipeline(id);
    };

    const handleCreateCompany = async (e) => {
        e.preventDefault();
        try {
            await companyAPI.create({ name: newCompanyName });
            setNewCompanyName('');
            loadCompanies();
        } catch (err) {
            setError('Failed to create company');
        }
    };

    const handleCreateJob = async (e) => {
        e.preventDefault();
        try {
            await jobAPI.create({
                companyId: selectedCompany,
                ...newJob,
                activeCapacity: parseInt(newJob.activeCapacity),
                decayWindowMinutes: parseInt(newJob.decayWindowMinutes),
            });
            setNewJob({
                title: '',
                description: '',
                activeCapacity: 5,
                decayWindowMinutes: 1440,
            });
            loadJobs(selectedCompany);
        } catch (err) {
            setError('Failed to create job');
        }
    };

    const handleExit = async (appId, reason) => {
        try {
            setLoading(true);
            await applicationAPI.exit(appId, reason);
            loadPipeline(selectedJob);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to update');
        } finally {
            setLoading(false);
        }
    };

    const s = {
        card: {
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '16px',
        },
        input: {
            width: '100%',
            padding: '8px',
            borderRadius: '4px',
            border: '1px solid #d1d5db',
            boxSizing: 'border-box',
            marginBottom: '8px',
        },
        btnBlue: {
            padding: '8px 16px',
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
        },
        btnGreen: {
            padding: '4px 8px',
            background: '#8b5cf6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
            marginRight: '4px',
        },
        btnRed: {
            padding: '4px 8px',
            background: '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
        },
        th: {
            padding: '8px',
            textAlign: 'left',
            borderBottom: '1px solid #e5e7eb',
        },
        td: {
            padding: '8px',
            borderBottom: '1px solid #f3f4f6',
        },
    };

    return (
        <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
            <h1>🏢 Company Dashboard</h1>

            {error && (
                <div style={{
                    background: '#fee2e2',
                    color: '#dc2626',
                    padding: '10px',
                    borderRadius: '8px',
                    marginBottom: '16px',
                }}>
                    {error}
                    <button
                        onClick={() => setError(null)}
                        style={{
                            marginLeft: '10px',
                            cursor: 'pointer',
                            background: 'none',
                            border: 'none',
                            color: '#dc2626',
                            fontWeight: 'bold',
                        }}
                    >✕</button>
                </div>
            )}

            <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>

                {/* Companies */}
                <div style={{ ...s.card, flex: 1 }}>
                    <h3>Companies</h3>
                    <form
                        onSubmit={handleCreateCompany}
                        style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}
                    >
                        <input
                            type="text"
                            placeholder="Company name"
                            value={newCompanyName}
                            onChange={(e) => setNewCompanyName(e.target.value)}
                            style={{ ...s.input, marginBottom: 0, flex: 1 }}
                            required
                        />
                        <button type="submit" style={s.btnBlue}>Add</button>
                    </form>
                    {companies.map((c) => (
                        <div
                            key={c.id}
                            onClick={() => handleSelectCompany(c.id)}
                            style={{
                                padding: '10px',
                                cursor: 'pointer',
                                borderRadius: '4px',
                                backgroundColor:
                                    selectedCompany === c.id ? '#eff6ff' : 'transparent',
                                borderLeft:
                                    selectedCompany === c.id
                                        ? '3px solid #3b82f6'
                                        : '3px solid transparent',
                            }}
                        >
                            {c.name}
                        </div>
                    ))}
                </div>

                {/* Jobs */}
                {selectedCompany && (
                    <div style={{ ...s.card, flex: 1 }}>
                        <h3>Job Openings</h3>
                        <form onSubmit={handleCreateJob} style={{ marginBottom: '12px' }}>
                            <input
                                type="text"
                                placeholder="Job title"
                                value={newJob.title}
                                onChange={(e) =>
                                    setNewJob({ ...newJob, title: e.target.value })
                                }
                                style={s.input}
                                required
                            />
                            <input
                                type="text"
                                placeholder="Description (optional)"
                                value={newJob.description}
                                onChange={(e) =>
                                    setNewJob({ ...newJob, description: e.target.value })
                                }
                                style={s.input}
                            />
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ fontSize: '12px', color: '#6b7280' }}>
                                        Active Capacity
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={newJob.activeCapacity}
                                        onChange={(e) =>
                                            setNewJob({
                                                ...newJob,
                                                activeCapacity: e.target.value,
                                            })
                                        }
                                        style={s.input}
                                        required
                                    />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ fontSize: '12px', color: '#6b7280' }}>
                                        Decay Window (min)
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={newJob.decayWindowMinutes}
                                        onChange={(e) =>
                                            setNewJob({
                                                ...newJob,
                                                decayWindowMinutes: e.target.value,
                                            })
                                        }
                                        style={s.input}
                                        required
                                    />
                                </div>
                            </div>
                            <button
                                type="submit"
                                style={{ ...s.btnBlue, background: '#22c55e' }}
                            >
                                Create Job
                            </button>
                        </form>
                        {jobs.map((j) => (
                            <div
                                key={j.id}
                                onClick={() => handleSelectJob(j.id)}
                                style={{
                                    padding: '10px',
                                    cursor: 'pointer',
                                    borderRadius: '4px',
                                    marginBottom: '4px',
                                    backgroundColor:
                                        selectedJob === j.id ? '#f0fdf4' : 'transparent',
                                    borderLeft:
                                        selectedJob === j.id
                                            ? '3px solid #22c55e'
                                            : '3px solid transparent',
                                }}
                            >
                                <strong>{j.title}</strong>
                                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                                    Capacity: {j.active_capacity} | 
                                    Apps: {j.total_applications || 0}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Pipeline */}
            {pipeline && (
                <div style={s.card}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '16px',
                    }}>
                        <h2 style={{ margin: 0 }}>
                            {pipeline.job.title} — Pipeline
                        </h2>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <label style={{ fontSize: '14px' }}>
                                <input
                                    type="checkbox"
                                    checked={autoRefresh}
                                    onChange={(e) => setAutoRefresh(e.target.checked)}
                                />{' '}
                                Auto-refresh (10s)
                            </label>
                            <button
                                onClick={() => loadPipeline(selectedJob)}
                                style={{ ...s.btnBlue, background: '#6b7280', padding: '6px 12px' }}
                            >
                                🔄 Refresh
                            </button>
                        </div>
                    </div>

                    {/* Stats */}
                    <div style={{
                        display: 'flex',
                        gap: '16px',
                        marginBottom: '20px',
                        flexWrap: 'wrap',
                    }}>
                        {[
                            { label: 'Active', value: pipeline.stats.activeCount, color: '#22c55e' },
                            { label: 'Pending Ack', value: pipeline.stats.pendingCount, color: '#f59e0b' },
                            { label: 'Waitlisted', value: pipeline.stats.waitlistedCount, color: '#3b82f6' },
                            { label: 'Spots Open', value: pipeline.stats.spotsAvailable, color: '#8b5cf6' },
                            { label: 'Total', value: pipeline.stats.totalApplications, color: '#6b7280' },
                        ].map((stat) => (
                            <div key={stat.label} style={{
                                padding: '12px 20px',
                                background: `${stat.color}15`,
                                borderRadius: '8px',
                                borderLeft: `3px solid ${stat.color}`,
                                minWidth: '100px',
                            }}>
                                <div style={{
                                    fontSize: '24px',
                                    fontWeight: 'bold',
                                    color: stat.color,
                                }}>
                                    {stat.value}
                                </div>
                                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                                    {stat.label}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Active */}
                    <h3>🟢 Active ({pipeline.pipeline.active.length}/{pipeline.job.activeCapacity})</h3>
                    {pipeline.pipeline.active.length === 0 ? (
                        <p style={{ color: '#9ca3af' }}>No active applications</p>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
                            <thead>
                                <tr style={{ background: '#f9fafb' }}>
                                    <th style={s.th}>Name</th>
                                    <th style={s.th}>Email</th>
                                    <th style={s.th}>Applied</th>
                                    <th style={s.th}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pipeline.pipeline.active.map((a) => (
                                    <tr key={a.id}>
                                        <td style={s.td}>{a.applicant_name}</td>
                                        <td style={s.td}>{a.applicant_email}</td>
                                        <td style={s.td}>
                                            {new Date(a.applied_at).toLocaleDateString()}
                                        </td>
                                        <td style={s.td}>
                                            <button
                                                disabled={loading}
                                                onClick={() => handleExit(a.id, 'hired')}
                                                style={s.btnGreen}
                                            >
                                                Hire
                                            </button>
                                            <button
                                                disabled={loading}
                                                onClick={() => handleExit(a.id, 'rejected')}
                                                style={s.btnRed}
                                            >
                                                Reject
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}

                    {/* Pending Acknowledgment */}
                    {pipeline.pipeline.pendingAcknowledgment.length > 0 && (
                        <>
                            <h3>🟡 Pending Acknowledgment ({pipeline.pipeline.pendingAcknowledgment.length})</h3>
                            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
                                <thead>
                                    <tr style={{ background: '#fffbeb' }}>
                                        <th style={s.th}>Name</th>
                                        <th style={s.th}>Promoted At</th>
                                        <th style={s.th}>Deadline</th>
                                        <th style={s.th}>Decays</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pipeline.pipeline.pendingAcknowledgment.map((a) => (
                                        <tr key={a.id}>
                                            <td style={s.td}>{a.applicant_name}</td>
                                            <td style={s.td}>
                                                {new Date(a.promoted_at).toLocaleString()}
                                            </td>
                                            <td style={s.td}>
                                                {a.deadline
                                                    ? new Date(a.deadline).toLocaleString()
                                                    : 'N/A'}
                                            </td>
                                            <td style={s.td}>{a.decay_count}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </>
                    )}

                    {/* Waitlisted */}
                    <h3>🔵 Waitlisted ({pipeline.pipeline.waitlisted.length})</h3>
                    {pipeline.pipeline.waitlisted.length === 0 ? (
                        <p style={{ color: '#9ca3af' }}>No waitlisted applications</p>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
                            <thead>
                                <tr style={{ background: '#eff6ff' }}>
                                    <th style={s.th}>#</th>
                                    <th style={s.th}>Name</th>
                                    <th style={s.th}>Email</th>
                                    <th style={s.th}>Decays</th>
                                    <th style={s.th}>Applied</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pipeline.pipeline.waitlisted.map((a, idx) => (
                                    <tr key={a.id}>
                                        <td style={s.td}>{idx + 1}</td>
                                        <td style={s.td}>{a.applicant_name}</td>
                                        <td style={s.td}>{a.applicant_email}</td>
                                        <td style={s.td}>
                                            {a.decay_count > 0 ? `⚠️ ${a.decay_count}` : '0'}
                                        </td>
                                        <td style={s.td}>
                                            {new Date(a.applied_at).toLocaleDateString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}

                    {/* Exited */}
                    {pipeline.pipeline.exited.length > 0 && (
                        <>
                            <h3>⚫ Exited ({pipeline.pipeline.exited.length})</h3>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ background: '#f9fafb' }}>
                                        <th style={s.th}>Name</th>
                                        <th style={s.th}>Status</th>
                                        <th style={s.th}>Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pipeline.pipeline.exited.map((a) => (
                                        <tr key={a.id}>
                                            <td style={s.td}>{a.applicant_name}</td>
                                            <td style={s.td}>
                                                <span style={{
                                                    backgroundColor:
                                                        a.status === 'hired' ? '#8b5cf6' :
                                                        a.status === 'rejected' ? '#ef4444' :
                                                        '#6b7280',
                                                    color: 'white',
                                                    padding: '2px 8px',
                                                    borderRadius: '12px',
                                                    fontSize: '12px',
                                                }}>
                                                    {a.status.toUpperCase()}
                                                </span>
                                            </td>
                                            <td style={s.td}>
                                                {new Date(a.updated_at).toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

export default CompanyDashboard;