// frontend/src/pages/AdminPanelPage.jsx
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import './AdminPanelPage.css';

const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
);
const CopyIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
);

// ─── Tipo de aviso → color ─────────────────────────────────────────────────────
const NOTICE_TYPES = [
    { value: 'info',        label: 'Informativo',  color: '#3b82f6', bg: '#eff6ff' },
    { value: 'warning',     label: 'Advertencia',  color: '#f59e0b', bg: '#fffbeb' },
    { value: 'maintenance', label: 'Mantención',   color: '#7c3aed', bg: '#f5f3ff' },
    { value: 'success',     label: 'Éxito',         color: '#22c55e', bg: '#f0fdf4' },
];
const noticeTypeMeta = (type) => NOTICE_TYPES.find(t => t.value === type) || NOTICE_TYPES[0];

// ─── Sección de Avisos del sistema ─────────────────────────────────────────────
function NoticesSection() {
    const queryClient = useQueryClient();
    const [showForm, setShowForm]   = useState(false);
    const [title, setTitle]         = useState('');
    const [message, setMessage]     = useState('');
    const [type, setType]           = useState('info');

    const { data: notices = [], isLoading } = useQuery({
        queryKey: ['notices'],
        queryFn: async () => (await api.get('/api/notices')).data,
    });

    const createMutation = useMutation({
        mutationFn: (data) => api.post('/api/notices', data),
        onSuccess: () => {
            queryClient.invalidateQueries(['notices']);
            setShowForm(false); setTitle(''); setMessage(''); setType('info');
        }
    });

    const toggleMutation = useMutation({
        mutationFn: ({ id, active }) => api.put(`/api/notices/${id}`, { active }),
        onSuccess: () => queryClient.invalidateQueries(['notices']),
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => api.delete(`/api/notices/${id}`),
        onSuccess: () => queryClient.invalidateQueries(['notices']),
    });

    return (
        <div className="admin-card" style={{marginTop:'1.5rem'}}>
            <div className="card-title">
                <span>Avisos del Sistema</span>
                <button className="btn btn-primary" onClick={() => setShowForm(o => !o)}>
                    {showForm ? 'Cancelar' : '+ Nuevo Aviso'}
                </button>
            </div>
            <p style={{margin:'-0.5rem 0 1rem',fontSize:'0.82rem',color:'#64748b'}}>
                Los avisos activos se muestran a todos los usuarios al iniciar sesión.
            </p>

            {/* Formulario nuevo aviso */}
            {showForm && (
                <div className="notice-form">
                    <div style={{display:'grid',gridTemplateColumns:'1fr auto',gap:'12px',marginBottom:'10px'}}>
                        <input
                            className="form-input" type="text" placeholder="Título del aviso..."
                            value={title} onChange={e => setTitle(e.target.value)}
                        />
                        <select className="form-input" value={type} onChange={e => setType(e.target.value)} style={{minWidth:140}}>
                            {NOTICE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                    </div>
                    <textarea
                        className="form-input" rows={3}
                        placeholder="Mensaje del aviso..."
                        value={message} onChange={e => setMessage(e.target.value)}
                        style={{resize:'vertical',marginBottom:'10px'}}
                    />
                    <div style={{display:'flex',justifyContent:'flex-end',gap:10}}>
                        <button className="btn btn-primary"
                            disabled={!title.trim() || !message.trim() || createMutation.isPending}
                            onClick={() => createMutation.mutate({ title, message, type })}
                        >
                            {createMutation.isPending ? 'Publicando...' : 'Publicar Aviso'}
                        </button>
                    </div>
                </div>
            )}

            {/* Lista de avisos */}
            {isLoading ? <p style={{textAlign:'center',padding:'1rem',color:'#94a3b8'}}>Cargando...</p>
                : notices.length === 0 ? <p style={{textAlign:'center',padding:'1.5rem',color:'#94a3b8'}}>Sin avisos publicados.</p>
                : notices.map(n => {
                    const meta = noticeTypeMeta(n.type);
                    return (
                        <div key={n._id} className={`notice-item ${!n.active ? 'notice-inactive' : ''}`}
                            style={{'--notice-color': meta.color, '--notice-bg': meta.bg}}>
                            <div className="notice-item-bar" />
                            <div className="notice-item-body">
                                <div className="notice-item-top">
                                    <span className="notice-item-title">{n.title}</span>
                                    <div className="notice-item-actions">
                                        {/* Toggle activo/inactivo */}
                                        <button
                                            className={`notice-toggle ${n.active ? 'on' : 'off'}`}
                                            onClick={() => toggleMutation.mutate({ id: n._id, active: !n.active })}
                                            title={n.active ? 'Desactivar' : 'Activar'}
                                        >
                                            <span className="notice-toggle-dot" />
                                            {n.active ? 'Activo' : 'Inactivo'}
                                        </button>
                                        <button className="btn-delete-icon"
                                            onClick={() => window.confirm('¿Eliminar este aviso?') && deleteMutation.mutate(n._id)}>
                                            <TrashIcon />
                                        </button>
                                    </div>
                                </div>
                                <p className="notice-item-msg">{n.message}</p>
                                <div className="notice-item-meta">
                                    <span className="notice-type-badge" style={{background:meta.bg,color:meta.color}}>{meta.label}</span>
                                    <span>{new Date(n.createdAt).toLocaleString('es-CL',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})}</span>
                                </div>
                            </div>
                        </div>
                    );
                })
            }
        </div>
    );
}

function AdminPanelPage() {
    const { user: currentUser } = useAuth();
    const queryClient = useQueryClient();
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [fullName, setFullName] = useState('');
    const [username, setUsername] = useState('');
    const [role, setRole] = useState('user');
    const [comuna, setComuna] = useState('');
    const [generatedLink, setGeneratedLink] = useState(null);
    const [formError, setFormError] = useState('');
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!fullName) { setUsername(''); return; }
        const cleanName = fullName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
        const parts = cleanName.split(/\s+/);
        setUsername(parts.length >= 2 ? `${parts[0].charAt(0)}.${parts[1]}` : cleanName);
    }, [fullName]);

    const { data: users = [], isLoading, isError } = useQuery({
        queryKey: ['users'],
        queryFn: async () => (await api.get('/api/users')).data
    });

    const inviteMutation = useMutation({
        mutationFn: (data) => api.post('/api/invitations/generate', data),
        onSuccess: (response) => {
            queryClient.invalidateQueries(['users']);
            setGeneratedLink(`${window.location.origin}/registro/${response.data.token}`);
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
    });

    const handleCopyLink = () => {
        navigator.clipboard.writeText(generatedLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false); setGeneratedLink(null);
        setFullName(''); setRole('user'); setComuna(''); setFormError('');
    };

    return (
        <div className="admin-page">
            <header className="page-header">
                <h1 className="page-title">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{width:'32px', color:'#ff9900'}}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                    </svg>
                    Gestión de Usuarios
                </h1>
                <p className="page-subtitle">Administra los accesos y roles del sistema.</p>
            </header>

            <div className="admin-card">
                <div className="card-title">
                    <span>Lista de Personal</span>
                    <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
                        + Nuevo Usuario
                    </button>
                </div>

                {isLoading ? <p style={{textAlign:'center', padding:'2rem'}}>Cargando usuarios...</p> : 
                 isError ? <div className="feedback-msg msg-error">Error al cargar datos.</div> : (
                    <div className="table-container">
                        <table className="modern-table">
                            <thead>
                                <tr>
                                    <th>Usuario</th>
                                    <th>Rol</th>
                                    <th>Jurisdicción</th>
                                    <th style={{textAlign:'right'}}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((u) => (
                                    <tr key={u._id} className={u._id === currentUser?.id ? 'current-user-row' : ''}>
                                        <td style={{fontWeight:'600'}}>
                                            {u.username}
                                            {u._id === currentUser?.id && <span className="badge-me">Tú</span>}
                                        </td>
                                        <td>
                                            <select 
                                                className="role-select"
                                                value={u.role}
                                                onChange={(e) => roleMutation.mutate({ id: u._id, newRole: e.target.value })}
                                                disabled={
                                                    u._id === currentUser?.id || // No puedes modificarte a ti mismo
                                                    (currentUser?.role !== 'superadmin' && u.role === 'superadmin') || // Solo superadmin puede tocar a otro superadmin
                                                    (currentUser?.role === 'admin' && ['admin', 'superadmin'].includes(u.role)) // Admin no puede tocar admins
                                                }
                                            >
                                                <option value="user">Técnico</option>
                                                <option value="municipalidad">Municipal</option>
                                                <option value="admin">Administrador</option>
                                                {/* Solo superadmin puede ver/asignar la opción superadmin */}
                                                {currentUser?.role === 'superadmin' && (
                                                    <option value="superadmin">Super Admin</option>
                                                )}
                                            </select>
                                        </td>
                                        <td>{u.comuna || '—'}</td>
                                        <td style={{textAlign: 'right'}}>
                                            <button 
                                                className="btn-delete-icon"
                                                onClick={() => window.confirm(`¿Eliminar a ${u.username}?`) && deleteMutation.mutate(u._id)}
                                                disabled={u._id === currentUser?.id}
                                            >
                                                <TrashIcon />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <NoticesSection />

            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-inner">
                            {!generatedLink ? (
                                <>
                                    <h2 style={{margin:'0 0 0.5rem 0', fontSize:'1.4rem'}}>Invitar Usuario</h2>
                                    <p style={{color:'#64748b', fontSize:'0.9rem', marginBottom:'1.5rem'}}>El usuario recibirá un link para crear su clave.</p>
                                    
                                    <form onSubmit={(e) => { e.preventDefault(); inviteMutation.mutate({ username, role, comuna }); }}>
                                        <div className="form-group">
                                            <label>Nombre Completo</label>
                                            <input className="form-input" type="text" value={fullName} onChange={e => setFullName(e.target.value)} required placeholder="Ej: Juan Perez" />
                                            {username && <div className="username-preview">ID Sugerido: {username}</div>}
                                        </div>
                                        
                                        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem'}}>
                                            <div className="form-group">
                                                <label>Rol</label>
                                                <select className="form-input" value={role} onChange={e => { setRole(e.target.value); if(e.target.value !== 'municipalidad') setComuna(''); }}>
                                                    <option value="user">Técnico</option>
                                                    <option value="municipalidad">Municipal</option>
                                                    <option value="admin">Administrador</option>
                                                </select>
                                            </div>
                                            {role === 'municipalidad' && (
                                                <div className="form-group">
                                                    <label>Comuna</label>
                                                    <input className="form-input" type="text" value={comuna} onChange={e => setComuna(e.target.value)} required placeholder="Ej: Renca" />
                                                </div>
                                            )}
                                        </div>

                                        {formError && <p style={{color:'#ef4444', fontSize:'0.85rem'}}>{formError}</p>}

                                        <div style={{marginTop:'1.5rem', display:'flex', gap:'10px', justifyContent:'flex-end'}}>
                                            <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>Cancelar</button>
                                            <button type="submit" className="btn btn-primary" disabled={inviteMutation.isPending || !username}>
                                                {inviteMutation.isPending ? 'Generando...' : 'Generar Link'}
                                            </button>
                                        </div>
                                    </form>
                                </>
                            ) : (
                                <div style={{textAlign:'center'}}>
                                    <div style={{background:'#dcfce7', color:'#16a34a', width:'50px', height:'50px', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 1rem auto'}}>✓</div>
                                    <h2 style={{margin:'0 0 1rem 0'}}>Link Generado</h2>
                                    <p style={{fontSize:'0.9rem', color:'#64748b'}}>Copia este enlace para <strong>{fullName}</strong>:</p>
                                    
                                    <div className="link-box">
                                        <input type="text" readOnly value={generatedLink} />
                                        <button onClick={handleCopyLink} className={`copy-btn ${copied ? 'copied' : ''}`}>
                                            {copied ? '✓' : <CopyIcon />}
                                        </button>
                                    </div>
                                    
                                    <button className="btn btn-primary" style={{width:'100%', justifyContent:'center'}} onClick={handleCloseModal}>Finalizar</button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AdminPanelPage;