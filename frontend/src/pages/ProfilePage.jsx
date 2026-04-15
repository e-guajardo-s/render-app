// frontend/src/pages/ProfilePage.jsx
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import './ProfilePage.css';

const ROLE_LABELS = {
    superadmin:   'Super Administrador',
    admin:        'Administrador',
    user:         'Técnico',
    municipalidad:'Municipalidad',
};

function ProfilePage() {
    const { user } = useAuth();

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword]         = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passMsg, setPassMsg]   = useState('');
    const [passErr, setPassErr]   = useState('');
    const [saving, setSaving]     = useState(false);

    const handleChangePassword = async (e) => {
        e.preventDefault();
        setPassMsg(''); setPassErr('');
        if (newPassword !== confirmPassword) return setPassErr('Las contraseñas nuevas no coinciden.');
        if (newPassword.length < 8) return setPassErr('Mínimo 8 caracteres.');
        setSaving(true);
        try {
            await api.put('/api/auth/change-password', { currentPassword, newPassword });
            setPassMsg('Contraseña actualizada correctamente.');
            setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
        } catch (err) {
            setPassErr(err.response?.data?.message || 'Error al actualizar contraseña.');
        } finally { setSaving(false); }
    };

    return (
        <div className="page-content profile-page">
            <div className="page-header">
                <h2 className="page-title">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="#ff9900" style={{width:32}}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Mi Perfil
                </h2>
                <p className="page-subtitle">Información de tu cuenta y configuración de seguridad.</p>
            </div>

            <div className="profile-grid">
                {/* Tarjeta de info */}
                <div className="profile-card">
                    <div className="profile-avatar">
                        {(user?.username || 'U')[0].toUpperCase()}
                    </div>
                    <div className="profile-info">
                        <h3 className="profile-username">{user?.username}</h3>
                        <span className="profile-role-badge">{ROLE_LABELS[user?.role] || user?.role}</span>
                        {user?.comuna && (
                            <p className="profile-detail"><strong>Comuna:</strong> {user.comuna}</p>
                        )}
                        <p className="profile-detail">
                            <strong>Miembro desde:</strong>{' '}
                            {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('es-CL') : '—'}
                        </p>
                    </div>
                </div>

                {/* Cambiar contraseña */}
                <div className="profile-card">
                    <h3 className="profile-section-title">Cambiar Contraseña</h3>
                    <form onSubmit={handleChangePassword} className="profile-form">
                        <div className="profile-field">
                            <label>Contraseña actual</label>
                            <input
                                type="password" className="profile-input"
                                value={currentPassword} onChange={e => setCurrentPassword(e.target.value)}
                                required placeholder="••••••••"
                            />
                        </div>
                        <div className="profile-field">
                            <label>Nueva contraseña</label>
                            <input
                                type="password" className="profile-input"
                                value={newPassword} onChange={e => setNewPassword(e.target.value)}
                                required placeholder="Mínimo 8 caracteres"
                            />
                        </div>
                        <div className="profile-field">
                            <label>Confirmar nueva contraseña</label>
                            <input
                                type="password" className="profile-input"
                                value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                                required placeholder="Repite la nueva contraseña"
                            />
                        </div>

                        {passErr && <div className="profile-msg profile-msg-error">{passErr}</div>}
                        {passMsg && <div className="profile-msg profile-msg-success">{passMsg}</div>}

                        <button type="submit" className="profile-btn" disabled={saving}>
                            {saving ? 'Guardando...' : 'Actualizar Contraseña'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default ProfilePage;
