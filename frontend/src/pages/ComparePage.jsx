// frontend/src/pages/ComparePage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import api from '../api';
import { format } from 'date-fns';
import './ComparePage.css';

const TYPE_COLOR = { info:'#22c55e', error:'#ef4444', warning:'#f59e0b', ups:'#3b82f6', offline:'#6c757d' };
const TYPE_LABEL = { info:'Normal', error:'Falla', warning:'Anomalía', ups:'UPS', offline:'Sin Señal' };

function ComparePage() {
    const [semaphores, setSemaphores] = useState([]);
    const [selected,   setSelected]   = useState([]); // max 5 cruceIds
    const [days,       setDays]       = useState(7);
    const [data,       setData]       = useState(null);
    const [loading,    setLoading]    = useState(false);

    useEffect(() => {
        api.get('/api/semaphores').then(r => setSemaphores(r.data)).catch(() => {});
    }, []);

    const toggleCruce = (cruceId) => {
        setSelected(prev =>
            prev.includes(cruceId)
                ? prev.filter(id => id !== cruceId)
                : prev.length < 5 ? [...prev, cruceId] : prev
        );
    };

    const handleCompare = useCallback(async () => {
        if (selected.length < 2) return;
        setLoading(true);
        try {
            const res = await api.get(`/api/statuslog/compare?ids=${selected.join(',')}&days=${days}`);
            setData(res.data);
        } catch { alert('Error al comparar'); }
        finally { setLoading(false); }
    }, [selected, days]);

    return (
        <div className="page-content compare-page">
            <div className="page-header">
                <h2 className="page-title">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="#ff9900" style={{width:32}}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                    </svg>
                    Comparativa de Cruces
                </h2>
                <p className="page-subtitle">Compara el historial de fallas de hasta 5 cruces simultáneamente.</p>
            </div>

            {/* Controles */}
            <div className="compare-controls">
                <div className="compare-selector">
                    <label className="compare-label">Selecciona cruces (mín. 2, máx. 5)</label>
                    <div className="cruce-pills">
                        {semaphores.map(s => (
                            <button
                                key={s.cruceId}
                                className={`cruce-pill ${selected.includes(s.cruceId) ? 'active' : ''}`}
                                onClick={() => toggleCruce(s.cruceId)}
                                disabled={!selected.includes(s.cruceId) && selected.length >= 5}
                            >
                                {s.cruceId}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="compare-actions">
                    <select className="compare-select" value={days} onChange={e => setDays(Number(e.target.value))}>
                        <option value={1}>Hoy</option>
                        <option value={3}>3 días</option>
                        <option value={7}>7 días</option>
                    </select>
                    <button
                        className="compare-btn"
                        onClick={handleCompare}
                        disabled={selected.length < 2 || loading}
                    >
                        {loading ? 'Comparando...' : 'Comparar'}
                    </button>
                    {selected.length > 0 && (
                        <button className="compare-btn-ghost" onClick={() => { setSelected([]); setData(null); }}>
                            Limpiar
                        </button>
                    )}
                </div>
            </div>

            {/* Resultados */}
            {data && (
                <div className="compare-results">
                    {/* Tarjetas resumen */}
                    <div className="compare-cards">
                        {selected.map(cruceId => {
                            const d = data[cruceId] || {};
                            const sem = semaphores.find(s => s.cruceId === cruceId);
                            return (
                                <div key={cruceId} className="compare-card">
                                    <div className="compare-card-header">
                                        <span className="compare-card-id">{cruceId}</span>
                                        <span className="compare-card-name">{sem?.cruce || ''}</span>
                                    </div>
                                    <div className="compare-card-stats">
                                        <div className="compare-stat">
                                            <span className="compare-stat-value" style={{color:'#ef4444'}}>{d.failures ?? '—'}</span>
                                            <span className="compare-stat-label">Fallas</span>
                                        </div>
                                        <div className="compare-stat">
                                            <span className="compare-stat-value" style={{color:'#22c55e'}}>{d.uptime !== null ? `${d.uptime}%` : '—'}</span>
                                            <span className="compare-stat-label">Uptime</span>
                                        </div>
                                        <div className="compare-stat">
                                            <span className="compare-stat-value" style={{color:'#64748b'}}>{d.total ?? 0}</span>
                                            <span className="compare-stat-label">Eventos</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Últimos eventos por cruce */}
                    <div className="compare-logs-grid">
                        {selected.map(cruceId => {
                            const d = data[cruceId] || {};
                            const recentLogs = (d.logs || []).slice(0, 10);
                            return (
                                <div key={cruceId} className="compare-log-col">
                                    <h4 className="compare-log-title">Últimos eventos — {cruceId}</h4>
                                    {recentLogs.length === 0
                                        ? <p style={{color:'#94a3b8',fontSize:'0.8rem',textAlign:'center',padding:'1rem'}}>Sin eventos en este período.</p>
                                        : recentLogs.map((l, i) => (
                                            <div key={i} className="compare-log-item">
                                                <span style={{
                                                    background: TYPE_COLOR[l.type] + '20',
                                                    color: TYPE_COLOR[l.type],
                                                    border: `1px solid ${TYPE_COLOR[l.type]}40`,
                                                    padding: '1px 7px', borderRadius: 10,
                                                    fontSize: '0.7rem', fontWeight: 700, whiteSpace: 'nowrap'
                                                }}>
                                                    {TYPE_LABEL[l.type] || l.type}
                                                </span>
                                                <span style={{fontSize:'0.72rem',color:'#94a3b8',whiteSpace:'nowrap'}}>
                                                    {format(new Date(l.timestamp), 'dd/MM HH:mm')}
                                                </span>
                                            </div>
                                        ))
                                    }
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

export default ComparePage;
