import React, { useState } from 'react';
import api from '../api';
import './ReportFailureModal.css';

// Iconos SVG simples
const Icons = {
    Alert: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>,
    Close: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>,
    MapPin: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
};

function ReportFailureModal({ semaphore, onClose }) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState('Alta'); 
    const [loading, setLoading] = useState(false);

    if (!semaphore) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post('/api/tickets', {
                title: title,
                description: description,
                cruceId: semaphore.cruceId,
                origin: 'map_report',
                priority: priority
            });
            
            alert(`✅ Reporte enviado correctamente.`);
            onClose();
        } catch (error) {
            console.error("Error:", error);
            alert("Error al enviar el reporte.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="report-modal-backdrop" onClick={onClose}>
            <div className="report-modal-container" onClick={e => e.stopPropagation()}>
                
                {/* HEADER CON GRADIENTE DE ALERTA */}
                <div className="report-modal-header">
                    <div className="header-title">
                        <div className="icon-badge"><Icons.Alert /></div>
                        <h3>Reportar Falla en Mapa</h3>
                    </div>
                    <button className="btn-close-icon" onClick={onClose}><Icons.Close /></button>
                </div>
                
                <div className="report-modal-body">
                    {/* CONTEXTO DEL SEMÁFORO */}
                    <div className="semaphore-context-card">
                        <div className="context-icon"><Icons.MapPin /></div>
                        <div className="context-info">
                            <span className="context-label">Ubicación del Incidente</span>
                            <strong className="context-value">{semaphore.cruce}</strong>
                            <span className="context-id">ID: {semaphore.cruceId}</span>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="report-form">
                        <div className="form-group">
                            <label>Asunto de la Falla</label>
                            <input 
                                type="text" 
                                className="modal-input" 
                                placeholder="Ej: Semáforo apagado por choque..."
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                required
                                autoFocus
                            />
                        </div>

                        <div className="form-group">
                            <label>Prioridad</label>
                            <div className="select-wrapper">
                                <select 
                                    className="modal-select"
                                    value={priority}
                                    onChange={(e) => setPriority(e.target.value)}
                                >
                                    <option value="Media">Media (Falla parcial)</option>
                                    <option value="Alta">Alta (Riesgo vial)</option>
                                    <option value="Critica">Crítica (Urgencia inmediata)</option>
                                </select>
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Descripción Detallada</label>
                            <textarea 
                                className="modal-textarea" 
                                rows="4"
                                placeholder="Describa la situación actual del cruce..."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                required
                            />
                        </div>

                        <div className="report-modal-footer">
                            <button type="button" className="btn-ghost" onClick={onClose} disabled={loading}>
                                Cancelar
                            </button>
                            <button type="submit" className="btn-primary-danger" disabled={loading}>
                                {loading ? 'Enviando...' : 'Generar Ticket'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default ReportFailureModal;