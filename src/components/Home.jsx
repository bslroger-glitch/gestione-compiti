import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { User, Lock, Plus, ArrowRight } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
const API_BASE = API_URL.replace('/api', '');

const Home = ({ onLogin }) => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState(null);
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [showNewUser, setShowNewUser] = useState(false);

    // New User Form State
    const [newName, setNewName] = useState('');
    const [newPin, setNewPin] = useState('');
    const [cvUser, setCvUser] = useState('');
    const [cvPass, setCvPass] = useState('');
    const [academicPeriod, setAcademicPeriod] = useState('pentamestre');

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const res = await axios.get(`${API_URL}/users`);
            setUsers(res.data);
        } catch (err) {
            console.error("Failed to fetch users", err);
        } finally {
            setLoading(false);
        }
    };

    const handleLoginSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            const res = await axios.post(`${API_URL}/login`, {
                user_id: selectedUser.id,
                pin: pin
            });
            if (res.data.status === 'ok') {
                onLogin(res.data.user);
            }
        } catch (err) {
            setError('PIN non valido. Riprova.');
            setPin('');
        }
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        setError('');
        try {
            const res = await axios.post(`${API_URL}/users`, {
                name: newName.trim(),
                pin: newPin,
                cv_username: cvUser.trim(),
                cv_password: cvPass.trim(),
                academic_period: academicPeriod
            });
            if (res.data.status === 'ok') {
                setShowNewUser(false);
                setNewName(''); setNewPin(''); setCvUser(''); setCvPass(''); setAcademicPeriod('pentamestre');
                await fetchUsers();
            }
        } catch (err) {
            setError(err.response?.data?.detail || 'Errore durante la creazione.');
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--bg-dark)' }}>
                <h2 style={{ color: 'var(--text-muted)' }}>Caricamento profili...</h2>
            </div>
        );
    }

    return (
        <div className="home-container" style={{
            minHeight: '100vh',
            width: '100vw',
            background: 'var(--bg-dark)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
        }}>
            <div style={{
                textAlign: 'center',
                marginBottom: '50px',
                animation: 'fadeInDown 0.8s ease'
            }}>
                <h1 style={{
                    fontSize: '3.5rem',
                    fontWeight: '800',
                    color: 'var(--text-main)',
                    marginBottom: '10px',
                    letterSpacing: '-1px'
                }}>Chi sta studiando?</h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem' }}>Seleziona il tuo profilo per accedere all'agenda</p>
            </div>

            {!selectedUser && !showNewUser && (
                <div style={{
                    display: 'flex',
                    gap: '30px',
                    flexWrap: 'wrap',
                    justifyContent: 'center',
                    maxWidth: '800px',
                    animation: 'fadeInUp 0.8s ease'
                }}>
                    {users.map(u => (
                        <div
                            key={u.id}
                            onClick={() => setSelectedUser(u)}
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                cursor: 'pointer',
                                transition: 'transform 0.2s',
                                width: '150px'
                            }}
                            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                        >
                            <div style={{
                                width: '120px',
                                height: '120px',
                                borderRadius: '20px',
                                background: u.avatar_url ? `url(${API_BASE}${u.avatar_url}) center/cover` : 'var(--bg-card)',
                                border: '2px solid rgba(255,255,255,0.1)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginBottom: '15px',
                                boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                                color: 'var(--text-muted)'
                            }}>
                                {!u.avatar_url && <User size={50} />}
                            </div>
                            <span style={{
                                color: 'var(--text-main)',
                                fontSize: '1.2rem',
                                fontWeight: '600'
                            }}>
                                {u.name}
                            </span>
                        </div>
                    ))}

                    {/* Add New User Card */}
                    <div
                        onClick={() => setShowNewUser(true)}
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            cursor: 'pointer',
                            transition: 'transform 0.2s',
                            width: '150px'
                        }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                    >
                        <div style={{
                            width: '120px',
                            height: '120px',
                            borderRadius: '20px',
                            background: 'transparent',
                            border: '2px dashed rgba(255,255,255,0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: '15px',
                            color: 'var(--text-muted)'
                        }}>
                            <Plus size={40} />
                        </div>
                        <span style={{ color: 'var(--text-muted)', fontSize: '1.1rem', fontWeight: '500' }}>
                            Aggiungi
                        </span>
                    </div>
                </div>
            )}

            {/* Login Form */}
            {selectedUser && (
                <div className="auth-card" style={{
                    background: 'var(--bg-card)',
                    padding: '40px',
                    borderRadius: '20px',
                    width: '100%',
                    maxWidth: '400px',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
                    animation: 'fadeIn 0.3s ease',
                    border: '1px solid rgba(255,255,255,0.05)'
                }}>
                    <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                        <div
                            style={{
                                width: '80px',
                                height: '80px',
                                borderRadius: '15px',
                                background: selectedUser.avatar_url ? `url(${API_BASE}${selectedUser.avatar_url}) center/cover` : 'rgba(255,255,255,0.05)',
                                margin: '0 auto 15px auto',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'var(--text-muted)',
                                position: 'relative',
                                cursor: 'pointer'
                            }}
                            onClick={() => document.getElementById('avatarUpload').click()}
                            title="Cambia foto profilo"
                        >
                            {!selectedUser.avatar_url && <User size={40} />}
                            <div style={{ position: 'absolute', bottom: '-5px', right: '-5px', background: 'var(--success)', borderRadius: '50%', padding: '4px', display: 'flex', boxShadow: '0 2px 5px rgba(0,0,0,0.5)' }}>
                                <Plus size={14} color="white" />
                            </div>
                        </div>

                        <input
                            type="file"
                            id="avatarUpload"
                            style={{ display: 'none' }}
                            accept="image/*"
                            onChange={async (e) => {
                                const file = e.target.files[0];
                                if (!file) return;
                                const formData = new FormData();
                                formData.append('file', file);
                                try {
                                    const res = await axios.post(`${API_URL}/users/${selectedUser.id}/avatar`, formData);
                                    setSelectedUser({ ...selectedUser, avatar_url: res.data.avatar_url });
                                    fetchUsers(); // Refresh the list so the thumbnail updates too
                                } catch (err) {
                                    alert("Errore durante il caricamento della foto.");
                                }
                            }}
                        />

                        <h2 style={{ color: 'var(--text-main)', margin: 0 }}>{selectedUser.name}</h2>
                    </div>

                    <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div>
                            <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '8px', fontSize: '0.9rem' }}>PIN di Accesso</label>
                            <div style={{ position: 'relative' }}>
                                <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input
                                    type="password"
                                    value={pin}
                                    onChange={e => setPin(e.target.value)}
                                    placeholder="Inserisci il tuo PIN"
                                    style={{
                                        width: '100%',
                                        padding: '12px 12px 12px 40px',
                                        background: 'rgba(0,0,0,0.2)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '10px',
                                        color: 'white',
                                        fontSize: '1rem',
                                    }}
                                    autoFocus
                                />
                            </div>
                        </div>

                        {error && <div style={{ color: 'var(--danger)', fontSize: '0.9rem', textAlign: 'center' }}>{error}</div>}

                        <button
                            type="submit"
                            className="status-btn active success"
                            style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: '1rem', marginTop: '10px' }}
                        >
                            Entra <ArrowRight size={18} style={{ marginLeft: '8px' }} />
                        </button>

                        <button
                            type="button"
                            onClick={() => { setSelectedUser(null); setPin(''); setError(''); }}
                            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', marginTop: '10px' }}
                        >
                            Annulla
                        </button>
                    </form>
                </div>
            )}

            {/* Create User Form */}
            {showNewUser && (
                <div className="auth-card" style={{
                    background: 'var(--bg-card)',
                    padding: '40px',
                    borderRadius: '20px',
                    width: '100%',
                    maxWidth: '500px',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
                    animation: 'fadeIn 0.3s ease',
                    border: '1px solid rgba(255,255,255,0.05)'
                }}>
                    <h2 style={{ color: 'var(--text-main)', marginBottom: '20px', textAlign: 'center' }}>Nuovo Studente</h2>

                    <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <div>
                            <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '5px', fontSize: '0.9rem' }}>Nome (es. Marco)</label>
                            <input required value={newName} onChange={e => setNewName(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }} />
                        </div>

                        <div>
                            <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '5px', fontSize: '0.9rem' }}>Crea un PIN di Accesso (Privacy)</label>
                            <input required type="password" value={newPin} onChange={e => setNewPin(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }} />
                        </div>

                        <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '15px 0' }}></div>

                        <h4 style={{ color: 'var(--text-main)', margin: 0 }}>Credenziali ClasseViva</h4>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '0 0 10px 0' }}>Questi dati serviranno solo per scaricare in automatico i tuoi compiti.</p>

                        <div>
                            <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '5px', fontSize: '0.9rem' }}>Periodo di Valutazione</label>
                            <select
                                value={academicPeriod}
                                onChange={e => setAcademicPeriod(e.target.value)}
                                style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', marginBottom: '10px' }}
                            >
                                <option value="quadrimestre">1° o 2° Quadrimestre (S1/S2)</option>
                                <option value="pentamestre">Trimestre o Pentamestre (S3)</option>
                            </select>
                        </div>

                        <div>
                            <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '5px', fontSize: '0.9rem' }}>Username / Codice Utente</label>
                            <input required value={cvUser} onChange={e => setCvUser(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }} />
                        </div>

                        <div>
                            <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '5px', fontSize: '0.9rem' }}>Password ClasseViva</label>
                            <input required type="password" value={cvPass} onChange={e => setCvPass(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }} />
                        </div>

                        {error && <div style={{ color: 'var(--danger)', fontSize: '0.9rem', textAlign: 'center' }}>{error}</div>}

                        <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                            <button
                                type="button"
                                onClick={() => setShowNewUser(false)}
                                style={{ flex: 1, padding: '12px', borderRadius: '8px', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'var(--text-main)', cursor: 'pointer' }}
                            >
                                Annulla
                            </button>
                            <button
                                type="submit"
                                className="status-btn active success"
                                style={{ flex: 2, padding: '12px', justifyContent: 'center' }}
                            >
                                Crea Profilo
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <style>{`
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
        </div>
    );
};

export default Home;
