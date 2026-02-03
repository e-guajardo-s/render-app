// frontend/src/pages/AdminPanelPage.jsx
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import './AdminPanelPage.css';

// --- Iconos SVG ---
const TrashIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
    <line x1="10" y1="11" x2="10" y2="17"></line>
    <line x1="14" y1="11" x2="14" y2="17"></line>
  </svg>
);

const PlusIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);

const UsersIcon = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
        <circle cx="9" cy="7" r="4"></circle>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
    </svg>
);

const CopyIcon = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
    </svg>
);

function AdminPanelPage() {
    const { user: currentUser } = useAuth();
    const queryClient = useQueryClient();
    
    // Estados del Modal y Formulario
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [fullName, setFullName] = useState('');
    const [username, setUsername] = useState('');
    const [role, setRole] = useState('user');
    const [comuna, setComuna] = useState('');
    
    // Estados para el resultado de la invitación
    const [generatedLink, setGeneratedLink] = useState(null);
    const [formError, setFormError] = useState('');
    const [copied, setCopied] = useState(false);

    // --- LÓGICA DE ESTANDARIZACIÓN DE USUARIO ---
    useEffect(() => {
        if (!fullName) {
            setUsername('');
            return;
        }
        const cleanName = fullName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
        const parts = cleanName.split(/\s+/);
        
        if (parts.length >= 2) {
            const generated = `${parts[0].charAt(0)}.${parts[1]}`;
            setUsername(generated);
        } else {
            setUsername(cleanName);
        }
    }, [fullName]);

    // --- Queries ---
    const { data: users = [], isLoading, isError } = useQuery({
        queryKey: ['users'],
        queryFn: async () => (await api.get('/api/users')).data
    });

    // --- Mutations ---
    const inviteMutation = useMutation({
        mutationFn: (data) => api.post('/api/invitations/generate', data),
        onSuccess: (response) => {
            queryClient.invalidateQueries(['users']);
            const token = response.data.token;
            const link = `${window.location.origin}/registro/${token}`;
            setGeneratedLink(link);
            setFormError('');
        },
        onError: (err) => setFormError(err.response?.data?.message || 'Error al generar invitación')
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => api.delete(`/api/users/${id}`),
        onSuccess: () => queryClient.invalidateQueries(['users']),
        onError: (err) => alert(err.response?.data?.message || 'No se pudo eliminar')
    });
    
    const roleMutation = useMutation({
        mutationFn: ({ id, newRole }) => api.put(`/api/users/${id}/role`, { role: newRole }),
        onSuccess: () => queryClient.invalidateQueries(['users']),
        onError: (err) => alert(err.response?.data?.message || 'No se pudo cambiar el rol')
    });

    // Handlers
    const handleRoleChange = (newRole) => {
        setRole(newRole);
        // Si cambia a algo que no es municipalidad, limpiamos la comuna
        if (newRole !== 'municipalidad') {
            setComuna('');
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setFormError('');
        inviteMutation.mutate({ username, role, comuna });
    };

    const handleCopyLink = () => {
        navigator.clipboard.writeText(generatedLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setGeneratedLink(null);
        setFullName('');
        setUsername('');
        setRole('user');
        setComuna('');
        setFormError('');
    };

    const handleDelete = (id, username) => { if (window.confirm(`¿Eliminar a "${username}"?`)) deleteMutation.mutate(id); };

    return (
        <div className="admin-pro-container">
            <header className="admin-pro-header">
                <div className="header-title-group">
                    <div className="header-icon-box">
                        <UsersIcon className="header-icon" />
                    </div>
                    <div>
                        <h1>Gestión de Usuarios</h1>
                        <p>Administración centralizada de accesos y roles.</p>
                    </div>
                </div>
                <button className="btn-pro-primary" onClick={() => setIsModalOpen(true)}>
                    <PlusIcon className="btn-icon-svg" /> Nuevo Usuario
                </button>
            </header>

            <div className="pro-table-card">
                {isLoading ? (
                    <div className="loading-state-pro">
                        <div className="spinner-orange"></div> Cargando usuarios...
                    </div>
                ) : isError ? (
                    <div className="error-state-pro">⚠️ Error al cargar. Verifica la conexión.</div>
                ) : (
                    <div className="table-responsive">
                        <table className="pro-users-table">
                            <thead>
                                <tr>
                                    <th>Usuario</th>
                                    <th>Rol</th>
                                    <th>Comuna Asignada</th>
                                    <th style={{textAlign: 'right'}}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((u) => (
                                    <tr key={u._id} className={u._id === currentUser?.id ? 'current-user-row-pro' : ''}>
                                        <td>
                                            <div className="user-info-pro">
                                                <div className="user-avatar-pro">{u.username.charAt(0).toUpperCase()}</div>
                                                <div className="user-details">
                                                    <span className="username-text">{u.username}</span>
                                                    {u._id === currentUser?.id && <span className="badge-me-pro">Tú</span>}
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <select 
                                                className={`role-select-pro role-${u.role}`}
                                                value={u.role}
                                                onChange={(e) => roleMutation.mutate({ id: u._id, newRole: e.target.value })}
                                                disabled={u._id === currentUser?.id || u.role === 'superadmin'}
                                            >
                                                <option value="user">Técnico</option>
                                                <option value="municipalidad">Municipal</option>
                                                <option value="admin">Administrador</option>
                                                <option value="superadmin">Super Admin</option>
                                            </select>
                                        </td>
                                        <td>
                                            <span className="comuna-text">{u.comuna || '—'}</span>
                                        </td>
                                        <td style={{textAlign: 'right'}}>
                                            <button 
                                                className="btn-icon-pro delete"
                                                onClick={() => handleDelete(u._id, u.username)}
                                                disabled={u._id === currentUser?.id || deleteMutation.isPending}
                                                title="Eliminar usuario"
                                            >
                                                <TrashIcon className="action-icon" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {isModalOpen && (
                <div className="modal-overlay-pro">
                    <div className="modal-content-pro animate-pop-in">
                        
                        {!generatedLink ? (
                            <>
                                <div className="modal-header-pro">
                                    <h2>Invitar Nuevo Usuario</h2>
                                    <p>Genera un enlace para que el usuario configure su contraseña.</p>
                                </div>
                                
                                <form onSubmit={handleSubmit}>
                                    <div className="form-group-pro">
                                        <label>Nombre y Apellido</label>
                                        <input 
                                            type="text" 
                                            value={fullName}
                                            onChange={e => setFullName(e.target.value)}
                                            required autoFocus 
                                            placeholder="Ej: Juan Perez"
                                        />
                                        {username && (
                                            <div className="username-preview">
                                                Usuario asignado: <strong>{username}</strong>
                                            </div>
                                        )}
                                    </div>
                                    
                                    {/* CONTENEDOR DE ROL Y COMUNA (CONDICIONAL) */}
                                    {/* Si es municipalidad usamos el Grid de 2 columnas, si no, bloque normal */}
                                    <div className={role === 'municipalidad' ? "form-row-pro" : ""}>
                                        <div className="form-group-pro">
                                            <label>Rol</label>
                                            <select 
                                                value={role}
                                                onChange={e => handleRoleChange(e.target.value)}
                                            >
                                                <option value="user">Técnico</option>
                                                <option value="municipalidad">Municipal</option>
                                                <option value="admin">Administrador</option>
                                            </select>
                                        </div>
                                        
                                        {/* SOLO MOSTRAMOS ESTO SI ES MUNICIPALIDAD */}
                                        {role === 'municipalidad' && (
                                            <div className="form-group-pro">
                                                <label>Comuna</label>
                                                <input 
                                                    type="text" 
                                                    value={comuna}
                                                    onChange={e => setComuna(e.target.value)}
                                                    required
                                                    placeholder="Ej: Santiago"
                                                />
                                            </div>
                                        )}
                                    </div>
                                    
                                    {formError && <div className="error-message-pro">
                                        {formError}
                                    </div>}

                                    <div className="modal-actions-pro">
                                        <button type="button" className="btn-pro-secondary" onClick={handleCloseModal}>Cancelar</button>
                                        <button type="submit" className="btn-pro-primary" disabled={inviteMutation.isPending || !username}>
                                            {inviteMutation.isPending ? 'Generando...' : 'Generar Enlace'}
                                        </button>
                                    </div>
                                </form>
                            </>
                        ) : (
                            <div className="invite-success-view">
                                <div className="success-icon-box">
                                    <svg className="success-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <h2>¡Invitación Creada!</h2>
                                <p>Copia el siguiente enlace y envíalo a <strong>{fullName}</strong> ({username}) para que complete su registro.</p>
                                
                                <div className="link-box">
                                    <input type="text" readOnly value={generatedLink} />
                                    <button onClick={handleCopyLink} className={copied ? 'copied' : ''}>
                                        {copied ? '¡Copiado!' : <CopyIcon className="action-icon" />}
                                    </button>
                                </div>
                                
                                <button className="btn-pro-primary full-width" onClick={handleCloseModal}>
                                    Entendido, cerrar
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default AdminPanelPage;