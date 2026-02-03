import React from 'react';
import { STATUS_LEGEND } from '../utils/statusHelper';
import './MapFilterPanel.css';

// Icono para el filtro de tickets
const TicketIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>
);

// Tu componente original de Checkbox (ligeramente ajustado para flexibilidad)
const FilterCheckbox = ({ label, color, checked, onChange }) => (
    <div className={`filter-row ${!checked ? 'disabled' : ''}`} onClick={onChange}>
        <div className="filter-checkbox-wrapper">
            <input 
                type="checkbox" 
                className="filter-checkbox-input"
                checked={checked}
                readOnly
            />
            <span className="filter-checkbox-custom">
                <svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"></path></svg>
            </span>
        </div>
        <span className="filter-color-dot" style={{ backgroundColor: color, marginLeft: '10px', marginRight: '0' }}></span>
        <span className="filter-name" style={{ marginLeft: '10px' }}>{label}</span>
    </div>
);

function MapFilterPanel({ 
    stats, 
    filters, 
    onFilterChange, 
    comunas = [], 
    selectedComuna, 
    onComunaChange,
    showOnlyTickets,    // <--- PROP NUEVA
    onToggleOnlyTickets // <--- PROP NUEVA
}) { 
    return (
        <div className="filter-panel-content">
            <h3 className="panel-title">Filtros de Mapa</h3>
            
            {/* --- SECCIÓN 1: UBICACIÓN (Estilizado) --- */}
            <div className="filter-section">
                <label className="section-label">Ubicación</label>
                <div className="select-wrapper">
                    <select 
                        className="modern-select" 
                        value={selectedComuna} 
                        onChange={onComunaChange}
                    >
                        <option value="">Todas las Comunas</option>
                        {comunas.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <div className="select-arrow">▼</div>
                </div>
            </div>

            {/* --- SECCIÓN 2: FILTROS RÁPIDOS (Ticket Switch) --- */}
            <div className="filter-section">
                <label className="section-label">Filtros Rápidos</label>
                <div 
                    className={`quick-filter-row ${showOnlyTickets ? 'active' : ''}`}
                    onClick={onToggleOnlyTickets}
                >
                    <div className="quick-filter-icon"><TicketIcon /></div>
                    <span className="quick-filter-label">Solo Tickets Pendientes</span>
                    <div className="toggle-switch">
                        <div className="toggle-knob"></div>
                    </div>
                </div>
            </div>

            {/* --- SECCIÓN 3: ESTADÍSTICAS Y CAPAS --- */}
            <div className="filter-section">
                <label className="section-label">Estado Operativo</label>
                
                {/* Total General */}
                <div style={{ marginBottom: '15px', padding: '10px', background: '#f8fafc', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: '600', color: '#475569' }}>Total Semáforos</span>
                    <span style={{ fontWeight: '700', color: '#0f172a', fontSize: '1.1rem' }}>{stats.TOTAL}</span>
                </div>

                <div className="filter-list">
                    {STATUS_LEGEND.map((item) => {
                        const count = stats[item.key] || 0;
                        const isChecked = filters[item.key];

                        return (
                            <div key={item.key} style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'8px'}}>
                                {/* Usamos tu componente Checkbox */}
                                <FilterCheckbox 
                                    label={item.text}
                                    color={item.color}
                                    checked={isChecked}
                                    onChange={() => onFilterChange(item.key)}
                                />
                                {/* Agregamos el contador al lado */}
                                <span className="filter-count">{count}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

export default MapFilterPanel;