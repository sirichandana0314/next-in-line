import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../theme/ThemeContext';
import { jobAPI } from '../services/api';

function ActionLog({ jobId }) {
    const { theme } = useTheme();
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    const loadLogs = useCallback(async () => {
        if (!jobId) return;
        try {
            const res = await jobAPI.getPipeline(jobId);
            const pipeline = res.data.data;
            const logEntries = [];

            pipeline.pipeline.exited.forEach((app) => {
                logEntries.push({
                    id: app.id + '_exited', type: app.status,
                    name: app.applicant_name, action: app.status.toUpperCase(),
                    time: new Date(app.updated_at),
                });
            });

            pipeline.pipeline.pendingAcknowledgment.forEach((app) => {
                logEntries.push({
                    id: app.id + '_promoted', type: 'promoted',
                    name: app.applicant_name, action: 'PROMOTED',
                    time: new Date(app.promoted_at),
                });
            });

            pipeline.pipeline.active.forEach((app) => {
                if (app.acknowledged_at) {
                    logEntries.push({
                        id: app.id + '_ack', type: 'success',
                        name: app.applicant_name, action: 'ACKNOWLEDGED',
                        time: new Date(app.acknowledged_at),
                    });
                }
            });

            logEntries.sort((a, b) => b.time - a.time);
            setLogs(logEntries.slice(0, 8));
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
            hired: '◆', rejected: '◇', withdrawn: '○',
            promoted: '▲', success: '●', decayed: '◎',
        };
        return icons[type] || '·';
    };

    const getColor = (type) => {
        const colors = {
            hired: theme.success, rejected: theme.danger,
            withdrawn: theme.textMuted, promoted: theme.accent,
            success: theme.success, decayed: theme.warning,
        };
        return colors[type] || theme.textSecondary;
    };

    const getTimeAgo = (date) => {
        const diff = Date.now() - date;
        const min = Math.floor(diff / 60000);
        const hrs = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        if (min < 1) return 'now';
        if (min < 60) return `${min}m`;
        if (hrs < 24) return `${hrs}h`;
        return `${days}d`;
    };

    if (!jobId) return null;

    return (
        <div style={{
            border: `1px solid ${theme.border}`,
            borderRadius: '12px',
            padding: '16px',
            marginTop: '20px',
            background: theme.bgSecondary,
            transition: 'all 0.3s ease',
        }}>
            <div style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', marginBottom: '12px',
            }}>
                <span style={{
                    fontSize: '12px', fontWeight: '600',
                    color: theme.textSecondary,
                    letterSpacing: '0.5px',
                    textTransform: 'uppercase',
                }}>
                    Activity
                </span>
                <span style={{
                    fontSize: '9px', color: theme.textMuted,
                    letterSpacing: '1px', textTransform: 'uppercase',
                }}>
                    Live
                </span>
            </div>

            {loading ? (
                <div style={{
                    textAlign: 'center', padding: '16px',
                    color: theme.textMuted, fontSize: '12px',
                }}>
                    Loading...
                </div>
            ) : logs.length === 0 ? (
                <div style={{
                    textAlign: 'center', padding: '20px',
                    color: theme.textMuted, fontSize: '12px',
                    border: `1px dashed ${theme.border}`,
                    borderRadius: '8px',
                }}>
                    No activity yet
                </div>
            ) : (
                logs.map((log, idx) => (
                    <div key={log.id} style={{
                        display: 'flex', alignItems: 'center',
                        gap: '10px', padding: '7px 8px',
                        borderRadius: '6px', marginBottom: '2px',
                        background: idx === 0 ? theme.cardHighlight : 'transparent',
                        transition: 'all 0.2s ease',
                    }}>
                        <span style={{
                            color: getColor(log.type),
                            fontSize: '12px', flexShrink: 0,
                            fontWeight: 'bold',
                        }}>
                            {getIcon(log.type)}
                        </span>
                        <span style={{ flex: 1, fontSize: '12px' }}>
                            <span style={{
                                fontWeight: '600', color: theme.text,
                            }}>
                                {log.name}
                            </span>
                            <span style={{ color: theme.textMuted }}> · </span>
                            <span style={{
                                color: getColor(log.type),
                                fontWeight: '500',
                                fontSize: '11px',
                            }}>
                                {log.action}
                            </span>
                        </span>
                        <span style={{
                            fontSize: '10px', color: theme.textMuted,
                            flexShrink: 0,
                        }}>
                            {getTimeAgo(log.time)}
                        </span>
                    </div>
                ))
            )}
        </div>
    );
}

export default ActionLog;