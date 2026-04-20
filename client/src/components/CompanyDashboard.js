import React, { useState, useEffect, useCallback } from 'react';
import ToastContainer, { useToast } from './Toast';
import ActionLog from './ActionLog';
import PipelineBoard from './PipelineBoard';
import { companyAPI, jobAPI, applicationAPI } from '../services/api';

function CompanyDashboard() {
    const { toasts, toast, removeToast } = useToast();
    const [companies, setCompanies] = useState([]);
    const [selectedCompany, setSelectedCompany] = useState(null);
    const [jobs, setJobs] = useState([]);
    const [selectedJob, setSelectedJob] = useState(null);
    const [pipeline, setPipeline] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [copied, setCopied] = useState(false);
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
            toast.success('Company created successfully!', 'Done');
        } catch (err) {
            setError('Failed to create company');
            toast.error('Failed to create company', 'Error');
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
            toast.success('Job opening created!', 'Done');
        } catch (err) {
            setError('Failed to create job');
            toast.error('Failed to create job', 'Error');
        }
    };

    const handleExit = async (appId, reason, applicantName) => {
        try {
            setLoading(true);
            await applicationAPI.exit(appId, reason);
            loadPipeline(selectedJob);

            if (reason === 'hired') {
                toast.hired(
                    `${applicantName} has been hired! 🎉`,
                    'Candidate Hired'
                );
            } else if (reason === 'rejected') {
                toast.rejected(
                    `${applicantName} has been rejected.`,
                    'Application Rejected'
                );
            } else if (reason === 'withdrawn') {
                toast.warning(
                    `${applicantName} has withdrawn.`,
                    'Application Withdrawn'
                );
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to update');
            toast.error(
                err.response?.data?.error || 'Failed to update',
                'Error'
            );
        } finally {
            setLoading(false);
        }
    };

    const handleCopyJobId = (jobId) => {
        navigator.clipboard.writeText(jobId);
        setCopied(true);
        toast.info('Job ID copied to clipboard!', 'Copied');
        setTimeout(() => setCopied(false), 2000);
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

                    {companies.length === 0 ? (
                        <div style={{
                            padding: '20px',
                            textAlign: 'center',
                            color: '#9ca3af',
                            border: '2px dashed #e5e7eb',
                            borderRadius: '8px',
                        }}>
                            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🏢</div>
                            <div>No companies yet</div>
                            <div style={{ fontSize: '12px' }}>
                                Add your first company above
                            </div>
                        </div>
                    ) : (
                        companies.map((c) => (
                            <div
                                key={c.id}
                                onClick={() => handleSelectCompany(c.id)}
                                style={{
                                    padding: '10px',
                                    cursor: 'pointer',
                                    borderRadius: '4px',
                                    marginBottom: '4px',
                                    backgroundColor:
                                        selectedCompany === c.id
                                            ? '#eff6ff' : 'transparent',
                                    borderLeft:
                                        selectedCompany === c.id
                                            ? '3px solid #3b82f6'
                                            : '3px solid transparent',
                                }}
                            >
                                {c.name}
                            </div>
                        ))
                    )}
                </div>

                {/* Jobs */}
                {selectedCompany && (
                    <div style={{ ...s.card, flex: 1 }}>
                        <h3>Job Openings</h3>
                        <form
                            onSubmit={handleCreateJob}
                            style={{ marginBottom: '12px' }}
                        >
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
                                    <label style={{
                                        fontSize: '12px', color: '#6b7280',
                                    }}>
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
                                    <label style={{
                                        fontSize: '12px', color: '#6b7280',
                                    }}>
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

                        {jobs.length === 0 ? (
                            <div style={{
                                padding: '20px',
                                textAlign: 'center',
                                color: '#9ca3af',
                                border: '2px dashed #e5e7eb',
                                borderRadius: '8px',
                            }}>
                                <div style={{ fontSize: '32px', marginBottom: '8px' }}>
                                    💼
                                </div>
                                <div>No job openings yet</div>
                                <div style={{ fontSize: '12px' }}>
                                    Create your first job above
                                </div>
                            </div>
                        ) : (
                            jobs.map((j) => (
                                <div
                                    key={j.id}
                                    onClick={() => handleSelectJob(j.id)}
                                    style={{
                                        padding: '10px',
                                        cursor: 'pointer',
                                        borderRadius: '4px',
                                        marginBottom: '4px',
                                        backgroundColor:
                                            selectedJob === j.id
                                                ? '#f0fdf4' : 'transparent',
                                        borderLeft:
                                            selectedJob === j.id
                                                ? '3px solid #22c55e'
                                                : '3px solid transparent',
                                    }}
                                >
                                    <strong>{j.title}</strong>
                                    <div style={{
                                        fontSize: '12px', color: '#6b7280',
                                    }}>
                                        Capacity: {j.active_capacity} |
                                        Active: {j.active_count} |
                                        Waitlisted: {j.waitlisted_count} |
                                        Total: {j.total_applications || 0}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            {/* Pipeline */}
            {pipeline && (
                <div style={s.card}>

                    {/* Pipeline Header */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '20px',
                    }}>
                        <div>
                            <h2 style={{ margin: 0 }}>
                                {pipeline.job.title} — Pipeline
                            </h2>
                            <div style={{
                                fontSize: '12px',
                                color: '#6b7280',
                                marginTop: '6px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                            }}>
                                <span>Job ID: {pipeline.job.id}</span>
                                <button
                                    onClick={() => handleCopyJobId(pipeline.job.id)}
                                    style={{
                                        padding: '2px 8px',
                                        fontSize: '11px',
                                        background: copied ? '#dcfce7' : '#f3f4f6',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        color: copied ? '#16a34a' : '#374151',
                                    }}
                                >
                                    {copied ? '✅ Copied!' : '📋 Copy ID'}
                                </button>
                                <span style={{
                                    fontSize: '11px', color: '#9ca3af',
                                }}>
                                    (Share with applicants)
                                </span>
                            </div>
                        </div>
                        <div style={{
                            display: 'flex', gap: '8px', alignItems: 'center',
                        }}>
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
                                style={{
                                    ...s.btnBlue,
                                    background: '#6b7280',
                                    padding: '6px 12px',
                                }}
                            >
                                🔄 Refresh
                            </button>
                        </div>
                    </div>

                    {/* Stats Row */}
                    <div style={{
                        display: 'flex',
                        gap: '12px',
                        marginBottom: '24px',
                        flexWrap: 'wrap',
                    }}>
                        {[
                            {
                                label: 'Active',
                                value: pipeline.stats.activeCount,
                                color: '#22c55e',
                            },
                            {
                                label: 'Pending Ack',
                                value: pipeline.stats.pendingCount,
                                color: '#f59e0b',
                            },
                            {
                                label: 'Waitlisted',
                                value: pipeline.stats.waitlistedCount,
                                color: '#3b82f6',
                            },
                            {
                                label: 'Spots Open',
                                value: pipeline.stats.spotsAvailable,
                                color: '#8b5cf6',
                            },
                            {
                                label: 'Total Apps',
                                value: pipeline.stats.totalApplications,
                                color: '#6b7280',
                            },
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
                                <div style={{
                                    fontSize: '12px', color: '#6b7280',
                                }}>
                                    {stat.label}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Pipeline Board — Visual Cards */}
                    <PipelineBoard
                        pipeline={pipeline}
                        onHire={(id, name) => handleExit(id, 'hired', name)}
                        onReject={(id, name) => handleExit(id, 'rejected', name)}
                        loading={loading}
                    />

                    {/* Action Log */}
                    <ActionLog jobId={selectedJob} />

                </div>
            )}

            <ToastContainer toasts={toasts} onRemove={removeToast} />
        </div>
    );
}

export default CompanyDashboard;