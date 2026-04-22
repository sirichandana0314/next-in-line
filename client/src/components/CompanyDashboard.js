import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../theme/ThemeContext';
import ToastContainer, { useToast } from './Toast';
import ActionLog from './ActionLog';
import PipelineBoard from './PipelineBoard';
import { companyAPI, jobAPI, applicationAPI } from '../services/api';

function CompanyDashboard() {
    const { theme } = useTheme();
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

    useEffect(() => { loadCompanies(); }, []);

    const loadPipeline = useCallback(async (jobId) => {
        try {
            const res = await jobAPI.getPipeline(jobId);
            setPipeline(res.data.data);
        } catch (err) { setError('Failed to load pipeline'); }
    }, []);

    useEffect(() => {
        if (!selectedJob || !autoRefresh) return;
        const interval = setInterval(() => loadPipeline(selectedJob), 10000);
        return () => clearInterval(interval);
    }, [selectedJob, autoRefresh, loadPipeline]);

    const loadCompanies = async () => {
        try { const res = await companyAPI.list(); setCompanies(res.data.data); }
        catch (err) { setError('Failed to load companies'); }
    };

    const loadJobs = async (companyId) => {
        try { const res = await jobAPI.listByCompany(companyId); setJobs(res.data.data); }
        catch (err) { setError('Failed to load jobs'); }
    };

    const handleSelectCompany = (id) => {
        setSelectedCompany(id); setSelectedJob(null); setPipeline(null); loadJobs(id);
    };

    const handleSelectJob = (id) => { setSelectedJob(id); loadPipeline(id); };

    const handleCreateCompany = async (e) => {
        e.preventDefault();
        try {
            await companyAPI.create({ name: newCompanyName });
            setNewCompanyName(''); loadCompanies();
            toast.success('Company created!', 'Done');
        } catch (err) { setError('Failed to create company'); }
    };

    const handleCreateJob = async (e) => {
        e.preventDefault();
        try {
            await jobAPI.create({
                companyId: selectedCompany, ...newJob,
                activeCapacity: parseInt(newJob.activeCapacity),
                decayWindowMinutes: parseInt(newJob.decayWindowMinutes),
            });
            setNewJob({ title: '', description: '', activeCapacity: 5, decayWindowMinutes: 1440 });
            loadJobs(selectedCompany);
            toast.success('Job created!', 'Done');
        } catch (err) { setError('Failed to create job'); }
    };

    const handleExit = async (appId, reason, name) => {
        try {
            setLoading(true);
            await applicationAPI.exit(appId, reason);
            loadPipeline(selectedJob);
            if (reason === 'hired') toast.hired(`${name} has been hired! 🎉`, 'Hired');
            else if (reason === 'rejected') toast.rejected(`${name} rejected.`, 'Rejected');
        } catch (err) {
            setError(err.response?.data?.error || 'Failed');
            toast.error(err.response?.data?.error || 'Failed', 'Error');
        } finally { setLoading(false); }
    };

    const handleCopyJobId = (jobId) => {
        navigator.clipboard.writeText(jobId);
        setCopied(true);
        toast.info('Job ID copied!', 'Copied');
        setTimeout(() => setCopied(false), 2000);
    };

    const s = {
        card: {
            background: theme.bgCard,
            border: `1px solid ${theme.border}`,
            borderRadius: '12px',
            padding: '18px',
            boxShadow: theme.shadow,
            transition: 'all 0.3s ease',
        },
        input: {
            width: '100%',
            padding: '10px 12px',
            borderRadius: '8px',
            border: `1px solid ${theme.inputBorder}`,
            boxSizing: 'border-box',
            marginBottom: '10px',
            background: theme.inputBg,
            color: theme.text,
            fontSize: '14px',
            transition: 'all 0.2s ease',
        },
        btnAccent: {
            padding: '8px 18px',
            background: theme.accent,
            color: '#f5f0e8',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '13px',
            transition: 'all 0.2s ease',
        },
        btnSuccess: {
            padding: '8px 18px',
            background: theme.success,
            color: '#f5f0e8',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '13px',
        },
    };

    return (
        <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>

            {error && (
                <div style={{
                    background: theme.dangerLight,
                    color: theme.danger,
                    padding: '12px 16px',
                    borderRadius: '10px',
                    marginBottom: '16px',
                    border: `1px solid ${theme.dangerBorder}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                }}>
                    <span>{error}</span>
                    <button onClick={() => setError(null)} style={{
                        background: 'none', border: 'none',
                        color: theme.danger, cursor: 'pointer',
                        fontWeight: 'bold', fontSize: '16px',
                    }}>✕</button>
                </div>
            )}

            <div style={{ display: 'flex', gap: '20px', marginBottom: '24px' }}>

                {/* Companies */}
                <div style={{ ...s.card, flex: 1 }}>
                    <h3 style={{ color: theme.text, marginBottom: '14px', fontSize: '15px' }}>
                        Companies
                    </h3>
                    <form onSubmit={handleCreateCompany}
                        style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                        <input type="text" placeholder="Company name"
                            value={newCompanyName}
                            onChange={(e) => setNewCompanyName(e.target.value)}
                            style={{ ...s.input, marginBottom: 0, flex: 1 }}
                            required />
                        <button type="submit" style={s.btnAccent}>Add</button>
                    </form>
                    {companies.length === 0 ? (
                        <div style={{
                            padding: '24px', textAlign: 'center',
                            color: theme.textMuted,
                            border: `2px dashed ${theme.border}`,
                            borderRadius: '10px',
                        }}>
                            <div style={{ fontSize: '28px', marginBottom: '6px' }}>🏢</div>
                            <div style={{ fontSize: '13px' }}>No companies yet</div>
                        </div>
                    ) : (
                        companies.map((c) => (
                            <div key={c.id}
                                onClick={() => handleSelectCompany(c.id)}
                                style={{
                                    padding: '10px 12px', cursor: 'pointer',
                                    borderRadius: '8px', marginBottom: '4px',
                                    background: selectedCompany === c.id
                                        ? theme.accentLight : 'transparent',
                                    borderLeft: selectedCompany === c.id
                                        ? `3px solid ${theme.accent}`
                                        : '3px solid transparent',
                                    color: theme.text,
                                    transition: 'all 0.2s ease',
                                    fontSize: '14px',
                                }}>
                                {c.name}
                            </div>
                        ))
                    )}
                </div>

                {/* Jobs */}
                {selectedCompany && (
                    <div style={{ ...s.card, flex: 1 }}>
                        <h3 style={{ color: theme.text, marginBottom: '14px', fontSize: '15px' }}>
                            Job Openings
                        </h3>
                        <form onSubmit={handleCreateJob} style={{ marginBottom: '14px' }}>
                            <input type="text" placeholder="Job title"
                                value={newJob.title}
                                onChange={(e) => setNewJob({ ...newJob, title: e.target.value })}
                                style={s.input} required />
                            <input type="text" placeholder="Description (optional)"
                                value={newJob.description}
                                onChange={(e) => setNewJob({ ...newJob, description: e.target.value })}
                                style={s.input} />
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ fontSize: '11px', color: theme.textMuted }}>
                                        Active Capacity
                                    </label>
                                    <input type="number" min="1"
                                        value={newJob.activeCapacity}
                                        onChange={(e) => setNewJob({
                                            ...newJob, activeCapacity: e.target.value,
                                        })}
                                        style={s.input} required />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ fontSize: '11px', color: theme.textMuted }}>
                                        Decay Window (min)
                                    </label>
                                    <input type="number" min="1"
                                        value={newJob.decayWindowMinutes}
                                        onChange={(e) => setNewJob({
                                            ...newJob, decayWindowMinutes: e.target.value,
                                        })}
                                        style={s.input} required />
                                </div>
                            </div>
                            <button type="submit" style={s.btnSuccess}>Create Job</button>
                        </form>
                        {jobs.length === 0 ? (
                            <div style={{
                                padding: '24px', textAlign: 'center',
                                color: theme.textMuted,
                                border: `2px dashed ${theme.border}`,
                                borderRadius: '10px',
                            }}>
                                <div style={{ fontSize: '28px', marginBottom: '6px' }}>💼</div>
                                <div style={{ fontSize: '13px' }}>No jobs yet</div>
                            </div>
                        ) : (
                            jobs.map((j) => (
                                <div key={j.id}
                                    onClick={() => handleSelectJob(j.id)}
                                    style={{
                                        padding: '10px 12px', cursor: 'pointer',
                                        borderRadius: '8px', marginBottom: '4px',
                                        background: selectedJob === j.id
                                            ? theme.successLight : 'transparent',
                                        borderLeft: selectedJob === j.id
                                            ? `3px solid ${theme.success}`
                                            : '3px solid transparent',
                                        transition: 'all 0.2s ease',
                                    }}>
                                    <strong style={{ color: theme.text, fontSize: '14px' }}>
                                        {j.title}
                                    </strong>
                                    <div style={{ fontSize: '11px', color: theme.textMuted }}>
                                        Capacity: {j.active_capacity} |
                                        Active: {j.active_count} |
                                        Wait: {j.waitlisted_count} |
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
                    <div style={{
                        display: 'flex', justifyContent: 'space-between',
                        alignItems: 'center', marginBottom: '20px',
                    }}>
                        <div>
                            <h2 style={{
                                margin: 0, color: theme.text,
                                fontSize: '18px', fontWeight: '600',
                            }}>
                                {pipeline.job.title}
                            </h2>
                            <div style={{
                                fontSize: '11px', color: theme.textMuted,
                                marginTop: '6px', display: 'flex',
                                alignItems: 'center', gap: '8px',
                            }}>
                                <span>ID: {pipeline.job.id.slice(0, 12)}...</span>
                                <button onClick={() => handleCopyJobId(pipeline.job.id)}
                                    style={{
                                        padding: '2px 8px', fontSize: '10px',
                                        background: copied
                                            ? theme.successLight : theme.bgSecondary,
                                        border: `1px solid ${theme.border}`,
                                        borderRadius: '4px', cursor: 'pointer',
                                        color: copied ? theme.success : theme.textSecondary,
                                    }}>
                                    {copied ? '✓ Copied' : 'Copy ID'}
                                </button>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <label style={{
                                fontSize: '12px', color: theme.textSecondary,
                                display: 'flex', alignItems: 'center', gap: '4px',
                            }}>
                                <input type="checkbox" checked={autoRefresh}
                                    onChange={(e) => setAutoRefresh(e.target.checked)} />
                                Auto
                            </label>
                            <button onClick={() => loadPipeline(selectedJob)}
                                style={{
                                    ...s.btnAccent, padding: '5px 12px',
                                    fontSize: '12px', background: theme.bgHover,
                                    color: theme.textSecondary,
                                }}>
                                ↻ Refresh
                            </button>
                        </div>
                    </div>

                    {/* Stats */}
                    <div style={{
                        display: 'flex', gap: '10px',
                        marginBottom: '24px', flexWrap: 'wrap',
                    }}>
                        {[
                            { label: 'Active', value: pipeline.stats.activeCount, color: theme.success },
                            { label: 'Pending', value: pipeline.stats.pendingCount, color: theme.warning },
                            { label: 'Waitlisted', value: pipeline.stats.waitlistedCount, color: theme.blue },
                            { label: 'Open', value: pipeline.stats.spotsAvailable, color: theme.purple },
                            { label: 'Total', value: pipeline.stats.totalApplications, color: theme.textMuted },
                        ].map((stat) => (
                            <div key={stat.label} style={{
                                padding: '10px 16px',
                                background: `${stat.color}12`,
                                borderRadius: '10px',
                                borderLeft: `3px solid ${stat.color}`,
                                flex: 1, minWidth: '80px',
                            }}>
                                <div style={{
                                    fontSize: '22px', fontWeight: '700', color: stat.color,
                                }}>
                                    {stat.value}
                                </div>
                                <div style={{
                                    fontSize: '11px', color: theme.textMuted,
                                }}>
                                    {stat.label}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Pipeline Board */}
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