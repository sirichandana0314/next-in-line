import React from 'react';

function ApplicantCard({ applicant, type, position, onHire, onReject, loading }) {
    const configs = {
        active: {
            bg: '#f0fdf4',
            border: '#86efac',
            badge: '#22c55e',
            badgeText: 'ACTIVE',
            emoji: '🟢',
        },
        pending: {
            bg: '#fffbeb',
            border: '#fcd34d',
            badge: '#f59e0b',
            badgeText: 'PENDING',
            emoji: '🟡',
        },
        waitlisted: {
            bg: '#eff6ff',
            border: '#93c5fd',
            badge: '#3b82f6',
            badgeText: `#${position}`,
            emoji: '🔵',
        },
        hired: {
            bg: '#f5f3ff',
            border: '#c4b5fd',
            badge: '#8b5cf6',
            badgeText: 'HIRED',
            emoji: '🎉',
        },
        rejected: {
            bg: '#fef2f2',
            border: '#fca5a5',
            badge: '#ef4444',
            badgeText: 'REJECTED',
            emoji: '❌',
        },
        withdrawn: {
            bg: '#f9fafb',
            border: '#d1d5db',
            badge: '#6b7280',
            badgeText: 'WITHDRAWN',
            emoji: '🚪',
        },
    };

    const config = configs[type] || configs.active;

    return (
        <div style={{
            background: config.bg,
            border: `1px solid ${config.border}`,
            borderRadius: '10px',
            padding: '12px',
            marginBottom: '8px',
            position: 'relative',
        }}>
            {/* Badge */}
            <div style={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                background: config.badge,
                color: 'white',
                fontSize: '10px',
                fontWeight: 'bold',
                padding: '2px 6px',
                borderRadius: '10px',
            }}>
                {config.badgeText}
            </div>

            {/* Name */}
            <div style={{
                fontWeight: 'bold',
                fontSize: '15px',
                marginBottom: '4px',
                paddingRight: '60px',
            }}>
                {config.emoji} {applicant.applicant_name}
            </div>

            {/* Email */}
            <div style={{
                fontSize: '12px',
                color: '#6b7280',
                marginBottom: '6px',
            }}>
                {applicant.applicant_email}
            </div>

            {/* Extra Info */}
            {type === 'pending' && applicant.promoted_at && (
                <div style={{
                    fontSize: '11px',
                    color: '#d97706',
                    marginBottom: '6px',
                }}>
                    ⏰ Promoted: {new Date(applicant.promoted_at).toLocaleString()}
                </div>
            )}

            {type === 'waitlisted' && applicant.decay_count > 0 && (
                <div style={{
                    fontSize: '11px',
                    color: '#ef4444',
                    marginBottom: '6px',
                }}>
                    ⚠️ Decayed {applicant.decay_count} time(s)
                </div>
            )}

            {/* Actions for active */}
            {type === 'active' && (
                <div style={{
                    display: 'flex',
                    gap: '6px',
                    marginTop: '8px',
                }}>
                    <button
                        disabled={loading}
                        onClick={() => onHire(applicant.id, applicant.applicant_name)}
                        style={{
                            flex: 1,
                            padding: '5px',
                            background: '#8b5cf6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: 'bold',
                        }}
                    >
                        Hire
                    </button>
                    <button
                        disabled={loading}
                        onClick={() => onReject(applicant.id, applicant.applicant_name)}
                        style={{
                            flex: 1,
                            padding: '5px',
                            background: '#ef4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: 'bold',
                        }}
                    >
                        Reject
                    </button>
                </div>
            )}
        </div>
    );
}

function ColumnHeader({ title, count, color, emoji }) {
    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '12px',
            paddingBottom: '8px',
            borderBottom: `2px solid ${color}`,
        }}>
            <span style={{ fontSize: '18px' }}>{emoji}</span>
            <span style={{
                fontWeight: 'bold',
                fontSize: '14px',
                color: '#1f2937',
            }}>
                {title}
            </span>
            <span style={{
                marginLeft: 'auto',
                background: color,
                color: 'white',
                borderRadius: '12px',
                padding: '1px 8px',
                fontSize: '13px',
                fontWeight: 'bold',
            }}>
                {count}
            </span>
        </div>
    );
}

function CapacityBar({ active, pending, capacity }) {
    const used = active + pending;
    const percentage = Math.min((used / capacity) * 100, 100);
    const color = percentage >= 100 ? '#ef4444' :
                  percentage >= 75 ? '#f59e0b' : '#22c55e';

    return (
        <div style={{ marginBottom: '20px' }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '13px',
                color: '#6b7280',
                marginBottom: '6px',
            }}>
                <span>Capacity Used</span>
                <span style={{ fontWeight: 'bold', color }}>
                    {used} / {capacity} slots
                </span>
            </div>
            <div style={{
                background: '#e5e7eb',
                borderRadius: '999px',
                height: '10px',
                overflow: 'hidden',
            }}>
                <div style={{
                    width: `${percentage}%`,
                    background: color,
                    height: '100%',
                    borderRadius: '999px',
                    transition: 'width 0.5s ease',
                }} />
            </div>
            <div style={{
                fontSize: '11px',
                color: '#9ca3af',
                marginTop: '4px',
            }}>
                {capacity - used > 0
                    ? `${capacity - used} spot(s) available`
                    : '🔴 Pipeline is at full capacity'}
            </div>
        </div>
    );
}

function PipelineBoard({ pipeline, onHire, onReject, loading }) {
    if (!pipeline) return null;

    const { active, pendingAcknowledgment, waitlisted, exited } = pipeline.pipeline;
    const { activeCapacity } = pipeline.job;

    return (
        <div>
            {/* Capacity Bar */}
            <CapacityBar
                active={active.length}
                pending={pendingAcknowledgment.length}
                capacity={activeCapacity}
            />

            {/* Board Columns */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '16px',
            }}>
                {/* Active Column */}
                <div style={{
                    background: 'white',
                    borderRadius: '10px',
                    padding: '14px',
                    border: '1px solid #e5e7eb',
                }}>
                    <ColumnHeader
                        title={`Active (${active.length}/${activeCapacity})`}
                        count={active.length}
                        color="#22c55e"
                        emoji="🟢"
                    />
                    {active.length === 0 ? (
                        <div style={{
                            textAlign: 'center',
                            padding: '20px',
                            color: '#9ca3af',
                            fontSize: '13px',
                            border: '2px dashed #e5e7eb',
                            borderRadius: '8px',
                        }}>
                            No active applicants
                        </div>
                    ) : (
                        active.map((a) => (
                            <ApplicantCard
                                key={a.id}
                                applicant={a}
                                type="active"
                                onHire={onHire}
                                onReject={onReject}
                                loading={loading}
                            />
                        ))
                    )}
                </div>

                {/* Pending Column */}
                <div style={{
                    background: 'white',
                    borderRadius: '10px',
                    padding: '14px',
                    border: '1px solid #e5e7eb',
                }}>
                    <ColumnHeader
                        title="Pending Ack"
                        count={pendingAcknowledgment.length}
                        color="#f59e0b"
                        emoji="🟡"
                    />
                    {pendingAcknowledgment.length === 0 ? (
                        <div style={{
                            textAlign: 'center',
                            padding: '20px',
                            color: '#9ca3af',
                            fontSize: '13px',
                            border: '2px dashed #e5e7eb',
                            borderRadius: '8px',
                        }}>
                            No pending acknowledgments
                        </div>
                    ) : (
                        pendingAcknowledgment.map((a) => (
                            <ApplicantCard
                                key={a.id}
                                applicant={a}
                                type="pending"
                            />
                        ))
                    )}
                </div>

                {/* Waitlisted Column */}
                <div style={{
                    background: 'white',
                    borderRadius: '10px',
                    padding: '14px',
                    border: '1px solid #e5e7eb',
                }}>
                    <ColumnHeader
                        title="Waitlisted"
                        count={waitlisted.length}
                        color="#3b82f6"
                        emoji="🔵"
                    />
                    {waitlisted.length === 0 ? (
                        <div style={{
                            textAlign: 'center',
                            padding: '20px',
                            color: '#9ca3af',
                            fontSize: '13px',
                            border: '2px dashed #e5e7eb',
                            borderRadius: '8px',
                        }}>
                            No waitlisted applicants
                        </div>
                    ) : (
                        waitlisted.map((a, idx) => (
                            <ApplicantCard
                                key={a.id}
                                applicant={a}
                                type="waitlisted"
                                position={idx + 1}
                            />
                        ))
                    )}
                </div>

                {/* Exited Column */}
                {exited.length > 0 && (
                    <div style={{
                        background: 'white',
                        borderRadius: '10px',
                        padding: '14px',
                        border: '1px solid #e5e7eb',
                    }}>
                        <ColumnHeader
                            title="Exited"
                            count={exited.length}
                            color="#6b7280"
                            emoji="⚫"
                        />
                        {exited.map((a) => (
                            <ApplicantCard
                                key={a.id}
                                applicant={a}
                                type={a.status}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default PipelineBoard;