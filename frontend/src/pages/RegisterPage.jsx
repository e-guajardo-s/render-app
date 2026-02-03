import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import './LoginPage.css'; 

const LOGO_URL = '/logo.png';

function RegisterPage() {
    const { token } = useParams();
    const navigate = useNavigate();
    
    const [loading, setLoading] = useState(true);
    const [validInvite, setValidInvite] = useState(false);
    const [inviteData, setInviteData] = useState(null);
    
    // --- YA NO HAY ESTADO DE USERNAME EDITABLE ---
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        const validateToken = async () => {
            try {
                const res = await api.get(`/api/invitations/validate/${token}`);
                if (res.data.valid) {
                    setValidInvite(true);
                    setInviteData(res.data);
                }
            } catch (err) {
                setError(err.response?.data?.message || "Enlace inválido o expirado.");
            } finally {
                setLoading(false);
            }
        };
        validateToken();
    }, [token]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        
        if (password !== confirmPassword) {
            setError("Las contraseñas no coinciden.");
            return;
        }
        if (password.length < 6) {
            setError("La contraseña debe tener al menos 6 caracteres.");
            return;
        }

        try {
            // --- SOLO ENVIAMOS TOKEN Y PASSWORD ---
            await api.post('/api/invitations/register', {
                token,
                password
            });
            setSuccess("Cuenta activada exitosamente. Redirigiendo al login...");
            setTimeout(() => navigate('/login'), 3000);
        } catch (err) {
            setError(err.response?.data?.message || "Error al crear cuenta.");
        }
    };

    if (loading) return <div className="login-page-container"><div className="login-box"><p>Verificando enlace...</p></div></div>;

    if (!validInvite) {
        return (
            <div className="login-page-container">
                <div className="login-box">
                    <h2 className="login-title" style={{color: '#dc3545'}}>Enlace Inválido</h2>
                    <p className="login-subtitle">{error}</p>
                    <button className="login-button" onClick={() => navigate('/login')}>Ir al Login</button>
                </div>
            </div>
        );
    }

    return (
        <div className="login-page-container">
            <div className="login-box">
                <img src={LOGO_URL} alt="Logo" className="login-logo" />
                <h1 className="login-title">Activar Cuenta</h1>
                
                {/* --- MOSTRAMOS EL USUARIO ASIGNADO (Solo lectura) --- */}
                <div style={{backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '8px', margin: '20px 0', border: '1px solid #eee'}}>
                    <p style={{margin: '5px 0', color: '#555', fontSize: '0.9rem'}}>Te han asignado el usuario:</p>
                    <h3 style={{margin: '5px 0', color: '#333', fontSize: '1.4rem'}}>{inviteData?.username}</h3>
                    <span style={{fontSize: '0.8rem', background: '#ff9900', color: 'white', padding: '2px 8px', borderRadius: '10px'}}>
                        Rol: {inviteData?.role === 'user' ? 'Técnico' : inviteData?.role}
                        {inviteData?.comuna && ` (${inviteData.comuna})`}
                    </span>
                </div>
                {/* -------------------------------------------------- */}

                <p className="login-subtitle">Define tu contraseña para finalizar.</p>

                {!success ? (
                    <form onSubmit={handleSubmit} className="login-form">
                        {/* EL INPUT DE USUARIO YA NO EXISTE AQUÍ */}
                        <input
                            type="password"
                            className="login-input"
                            placeholder="Crea tu Contraseña"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                        <input
                            type="password"
                            className="login-input"
                            placeholder="Confirmar Contraseña"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                        />
                        
                        <button type="submit" className="login-button">Activar y Acceder</button>
                        {error && <p className="login-error">{error}</p>}
                    </form>
                ) : (
                    <div className="form-message success">
                        {success}
                    </div>
                )}
            </div>
        </div>
    );
}

export default RegisterPage;