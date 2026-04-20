import React, { useState, useEffect, useCallback } from 'react';
import pool from '../services/api';
import { jobAPI } from '../services/api';

function ActionLog({ jobId }) {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    const loadLogs = useCallback(async () => {
        if (!jobId) return;
        try {
            const res = await jobAPI.getPipeline(jobId);
            const pipeline = res.data.data;

            // Combine all applications and their history
            const allApps = [
                ...pipeline.pipeline.active,
                ...pipeline.pipeline.pendingAcknowledgment,
                ...pipeline.pipeline.waitlisted,
                ...pipeline.pipeline.exited,
            ];

            // Build log entries from pipeline data
            const logEntries = [];

            pipeline.pipeline.exited.forEach((app) => {
                logEntries.push({
                    id: app.id + '_exited',
                    type: app.status,
                    name: app.applicant_name,
                    action: app.status.toUpperCase(),
                    time: new Date(app.updated_at),
                });
            });

            pipeline.pipeline.pendingAcknowledgment.forEach((app) => {
                logEntries.push({
                    id: app.id + '_promoted',
                    type: 'promoted',
                    name: app.applicant_name,
                    action: 'AUTO-PROMOTED',
                    time: new Date(app.promoted_at),
                });
            });

            pipeline.pipeline.active.forEach((app) => {
                if (app.acknowledged_at) {
                    logEntries.push({
                        id: app.id + '_acknowledged',
                        type: 'success',
                        name: app.applicant_name,
                        action: 'ACKNOWLEDGED',
                        time: new Date(app.acknowledged_at),
                    });
                }
            });

            // Sort by time descending
            logEntries.sort((a, b) => b.time - a.time);

            setLogs(logEntries.slice(0, 10));
        } catch (err) {
            console.error('Failed to load action log');
        } finally {
            setLoading(false);
        }
    }, [jobId]);

    useEffect(() => {
        loadLogs();
        const interval = setInterval(loadLogs, 10000);
        return () => clearInterval(interval);
    }, [loadLogs]);

    const getIcon = (type) => {
        const icons = {
            hired: '🎉',
            rejected: '❌',
            withdrawn: '🚪',
            promoted: '🚀',
            success: '✅',
            decayed: '⏰',
            info: '📋',
        };
        return icons[type] || '📋';
    };

    const getColor = (type) => {
        const colors = {
            hired: '#059669',
            rejected: '#dc2626',
            withdrawn: '#6b7280',
            promoted: '#8b5cf6',
            success: '#22c55e',
            decayed: '#f97316',
        };
        return colors[type] || '#3b82f6';
    };

    const getTimeAgo = (date) => {
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        return `${days}d ago`;
    };

    if (!jobId) return null;

    return (
        <div style={{
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '16px',
            marginTop: '20px',
            background: '#fafafa',
        }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '12px',
            }}>
                <h3 style={{ margin: 0, fontSize: '16px' }}>
                    📡 Live Action Log
                </h3>
                <span style={{
                    fontSize: '11px',
                    color: '#9ca3af',
                    background: '#f3f4f6',
                    padding: '2px 8px',
                    borderRadius: '12px',
                }}>
                    Auto-updates every 10s
                </span>
            </div>

            {loading ? (
                <div style={{
                    textAlign: 'center',
                    padding: '20px',
                    color: '#9ca3af',
                }}>
                    Loading...
                </div>
            ) : logs.length === 0 ? (
                <div style={{
                    textAlign: 'center',
                    padding: '20px',
                    color: '#9ca3af',
                    border: '2px dashed #e5e7eb',
                    borderRadius: '8px',
                }}>
                    <div style={{ fontSize: '24px' }}>📭</div>
                    <div style={{ marginTop: '8px', fontSize: '14px' }}>
                        No actions yet. Hire or reject applicants to see activity.
                    </div>
                </div>
            ) : (
                <div>
                    {logs.map((log, idx) => (
                        <div
                            key={log.id}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                padding: '8px 10px',
                                borderRadius: '6px',
                                marginBottom: '4px',
                                background: idx === 0 ? '#fff' : 'transparent',
                                border: idx === 0
                                    ? '1px solid #e5e7eb'
                                    : '1px solid transparent',
                            }}
                        >
                            <div style={{ fontSize: '18px', flexShrink: 0 }}>
                                {getIcon(log.type)}
                            </div>
                            <div style={{ flex: 1 }}>
                                <span style={{ fontWeight: 'bold' }}>
                                    {log.name}
                                </span>
                                {' was '}
                                <span style={{
                                    color: getColor(log.type),
                                    fontWeight: 'bold',
                                }}>
                                    {log.action}
                                </span>
                            </div>
                            <div style={{
                                fontSize: '12px',
                                color: '#9ca3af',
                                flexShrink: 0,
                            }}>
                                {getTimeAgo(log.time)}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default ActionLog;