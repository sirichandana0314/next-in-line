import React, { useState, useEffect, useCallback } from 'react';

// Toast types and their styles
const toastStyles = {
    success: {
        background: '#22c55e',
        icon: '✅',
    },
    error: {
        background: '#ef4444',
        icon: '❌',
    },
    info: {
        background: '#3b82f6',
        icon: '🔔',
    },
    warning: {
        background: '#f59e0b',
        icon: '⚠️',
    },
    promoted: {
        background: '#8b5cf6',
        icon: '🚀',
    },
    hired: {
        background: '#059669',
        icon: '🎉',
    },
    rejected: {
        background: '#dc2626',
        icon: '❌',
    },
    decayed: {
        background: '#f97316',
        icon: '⏰',
    },
};

// Single Toast Item
function ToastItem({ toast, onRemove }) {
    const [visible, setVisible] = useState(false);
    const [leaving, setLeaving] = useState(false);

    useEffect(() => {
        // Slide in
        setTimeout(() => setVisible(true), 10);

        // Start leaving before removal
        const leaveTimer = setTimeout(() => {
            setLeaving(true);
        }, toast.duration - 400);

        // Remove
        const removeTimer = setTimeout(() => {
            onRemove(toast.id);
        }, toast.duration);

        return () => {
            clearTimeout(leaveTimer);
            clearTimeout(removeTimer);
        };
    }, [toast, onRemove]);

    const style = toastStyles[toast.type] || toastStyles.info;

    return (
        <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            background: style.background,
            color: 'white',
            padding: '12px 16px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            minWidth: '280px',
            maxWidth: '380px',
            transform: visible && !leaving
                ? 'translateX(0)'
                : 'translateX(120%)',
            opacity: visible && !leaving ? 1 : 0,
            transition: 'transform 0.3s ease, opacity 0.3s ease',
            marginBottom: '8px',
            cursor: 'pointer',
        }}
            onClick={() => onRemove(toast.id)}
        >
            <div style={{ fontSize: '20px', flexShrink: 0 }}>
                {style.icon}
            </div>
            <div style={{ flex: 1 }}>
                {toast.title && (
                    <div style={{
                        fontWeight: 'bold',
                        fontSize: '14px',
                        marginBottom: '2px',
                    }}>
                        {toast.title}
                    </div>
                )}
                <div style={{ fontSize: '13px', opacity: 0.95 }}>
                    {toast.message}
                </div>
            </div>
            <div style={{
                fontSize: '16px',
                opacity: 0.7,
                flexShrink: 0,
                marginTop: '1px',
            }}>
                ✕
            </div>
        </div>
    );
}

// Toast Container
function ToastContainer({ toasts, onRemove }) {
    return (
        <div style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column-reverse',
        }}>
            {toasts.map((toast) => (
                <ToastItem
                    key={toast.id}
                    toast={toast}
                    onRemove={onRemove}
                />
            ))}
        </div>
    );
}

// Custom Hook to use toasts anywhere
export function useToast() {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback((message, type = 'info', title = '', duration = 4000) => {
        const id = Date.now() + Math.random();
        setToasts((prev) => [...prev, { id, message, type, title, duration }]);
    }, []);

    const removeToast = useCallback((id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const toast = {
        success: (message, title) => addToast(message, 'success', title),
        error: (message, title) => addToast(message, 'error', title),
        info: (message, title) => addToast(message, 'info', title),
        warning: (message, title) => addToast(message, 'warning', title),
        promoted: (message, title) => addToast(message, 'promoted', title),
        hired: (message, title) => addToast(message, 'hired', title),
        rejected: (message, title) => addToast(message, 'rejected', title),
        decayed: (message, title) => addToast(message, 'decayed', title),
    };

    return { toasts, toast, removeToast };
}

export default ToastContainer;