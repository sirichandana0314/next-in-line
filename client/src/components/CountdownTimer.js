import React, { useState, useEffect } from 'react';

function CountdownTimer({ deadline }) {
    const [timeLeft, setTimeLeft] = useState(null);
    const [expired, setExpired] = useState(false);

    useEffect(() => {
        if (!deadline) return;

        const calculate = () => {
            const now = new Date().getTime();
            const end = new Date(deadline).getTime();
            const diff = end - now;

            if (diff <= 0) {
                setExpired(true);
                setTimeLeft(null);
                return;
            }

            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            setTimeLeft({ hours, minutes, seconds, diff });
        };

        // Calculate immediately
        calculate();

        // Then every second
        const interval = setInterval(calculate, 1000);
        return () => clearInterval(interval);

    }, [deadline]);

    if (!deadline) return null;

    if (expired) {
        return (
            <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: '#fee2e2',
                color: '#dc2626',
                padding: '6px 12px',
                borderRadius: '8px',
                fontWeight: 'bold',
                fontSize: '14px',
            }}>
                ❌ Deadline Passed — Awaiting Decay
            </div>
        );
    }

    if (!timeLeft) return null;

    // Turn red if under 1 hour
    const isUrgent = timeLeft.diff < 60 * 60 * 1000;
    // Turn orange if under 6 hours
    const isWarning = timeLeft.diff < 6 * 60 * 60 * 1000;

    const bgColor = isUrgent ? '#fee2e2' : isWarning ? '#fffbeb' : '#f0fdf4';
    const textColor = isUrgent ? '#dc2626' : isWarning ? '#d97706' : '#16a34a';
    const borderColor = isUrgent ? '#fca5a5' : isWarning ? '#fcd34d' : '#86efac';

    const pad = (n) => String(n).padStart(2, '0');

    return (
        <div style={{
            background: bgColor,
            border: `1px solid ${borderColor}`,
            borderRadius: '8px',
            padding: '12px 16px',
            marginBottom: '16px',
        }}>
            <div style={{
                fontSize: '12px',
                color: textColor,
                marginBottom: '6px',
                fontWeight: 'bold',
            }}>
                ⏰ Time remaining to acknowledge promotion:
            </div>
            <div style={{
                display: 'flex',
                gap: '8px',
                alignItems: 'center',
            }}>
                {[
                    { value: pad(timeLeft.hours), label: 'hours' },
                    { value: pad(timeLeft.minutes), label: 'min' },
                    { value: pad(timeLeft.seconds), label: 'sec' },
                ].map((unit, idx) => (
                    <React.Fragment key={unit.label}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{
                                fontSize: '28px',
                                fontWeight: 'bold',
                                color: textColor,
                                fontFamily: 'monospace',
                                background: 'white',
                                padding: '4px 10px',
                                borderRadius: '6px',
                                minWidth: '50px',
                            }}>
                                {unit.value}
                            </div>
                            <div style={{
                                fontSize: '10px',
                                color: textColor,
                                marginTop: '2px',
                            }}>
                                {unit.label}
                            </div>
                        </div>
                        {idx < 2 && (
                            <div style={{
                                fontSize: '24px',
                                fontWeight: 'bold',
                                color: textColor,
                                marginBottom: '12px',
                            }}>
                                :
                            </div>
                        )}
                    </React.Fragment>
                ))}
                {isUrgent && (
                    <div style={{
                        marginLeft: '8px',
                        fontSize: '13px',
                        color: '#dc2626',
                        fontWeight: 'bold',
                    }}>
                        ⚠️ Acknowledge NOW or you will decay back to waitlist!
                    </div>
                )}
            </div>
        </div>
    );
}

export default CountdownTimer;