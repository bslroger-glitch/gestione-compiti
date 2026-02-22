import React, { useState, useEffect, useRef } from 'react';
import { Clock, CheckCircle2, ChevronDown, ChevronUp, Paperclip, Trash2, FileText, Image as ImageIcon, File, Loader2 } from 'lucide-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
const API_BASE = API_URL.replace('/api', '');

const TEACHER_SUBJECTS = {
    "MIGLINO MASSIMILIANO": "Geografia",
    "VISENTIN KATY": "Italiano/Storia",
    "VENTURA IRENE": "Italiano/Storia",
    "BONIARDI DONATELLA": "Francese",
    "VIRGILLI STEFANIA": "Scienze Terra",
    "IANNELLO CATERINA": "Matematica",
    "ERBA SERENA": "Economia Az.",
    "SERENA ERBA": "Economia Az.",
    "TETTAMANTI MARIA": "Diritto/Eco",
    "ANDREA NATALE": "Fisica",
    "DE CARLO GIUSEPPE": "Informatica",
    "CAMPI FEDERICA": "Inglese",
    "NATALE ANDREA": "Fisica"
};

const getSubject = (teacher) => {
    if (!teacher) return null;
    const upper = String(teacher).toUpperCase();
    for (const [t, s] of Object.entries(TEACHER_SUBJECTS)) {
        if (upper.includes(t)) return s;
    }
    return null;
};

const formatDateIta = (dateStr) => {
    const d = new Date(dateStr);
    const days = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
    const months = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
    return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`;
};

const getFileIcon = (filename) => {
    if (!filename) return <File size={14} style={{ color: 'var(--text-main)' }} />;
    const ext = filename.split('.').pop().toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return <ImageIcon size={14} style={{ color: 'var(--success)' }} />;
    if (['pdf', 'doc', 'docx', 'txt'].includes(ext)) return <FileText size={14} style={{ color: 'var(--warning)' }} />;
    return <File size={14} style={{ color: 'var(--text-main)' }} />;
};

const AgendaCard = ({ item, st, attachmentsList, onUpdateStatus, onUpdateAttachments, currentUser }) => {
    const [expanded, setExpanded] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef(null);
    const isHomework = item.tipo === 'compiti';

    let subject = item.materia_desc;
    if (!subject && item.autore_desc) {
        if (item.autore_desc.toUpperCase().startsWith("COMPITI DI ")) {
            subject = item.autore_desc.substring(11);
        } else {
            subject = getSubject(item.autore_desc) || item.autore_desc;
        }
    }

    if (subject) {
        subject = subject.charAt(0).toUpperCase() + subject.slice(1).toLowerCase();
        if (subject.toLowerCase() === "scienze integrate (scienze della terra e biologia)") subject = "Scienze Terra";
        if (subject.toLowerCase() === "scienze integrate (fisica)") subject = "Fisica";
        if (subject.toLowerCase() === "lingua e letteratura italiana") subject = "Italiano";
        if (subject.toLowerCase() === "seconda lingua comunitaria") subject = "Francese";
    }

    const typeLabel = isHomework ? 'Compiti' : 'Attività';
    const displaySubject = subject ? `${subject} - ${typeLabel}` : typeLabel;

    return (
        <div className={`card ${st.completata ? 'completata' : st.iniziata ? 'iniziata' : ''}`}>
            <div className="card-header-row" onClick={() => setExpanded(!expanded)} style={{ cursor: 'pointer' }}>
                <div style={{ flex: 1 }}>
                    <div className="card-subject" style={{ fontSize: '1.25rem' }}>
                        {displaySubject}
                        {(!item.autore_desc || item.autore_desc.toUpperCase().startsWith("COMPITI DI ") || subject.toLowerCase() === item.autore_desc.toLowerCase()) && st.completata && (
                            <CheckCircle2 size={16} className="text-success" style={{ marginLeft: '8px', verticalAlign: 'middle' }} />
                        )}
                    </div>
                    {item.autore_desc && !item.autore_desc.toUpperCase().startsWith("COMPITI DI ") && subject.toLowerCase() !== item.autore_desc.toLowerCase() && (
                        <h3 className="card-title" style={{ fontSize: '1rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                            {item.autore_desc}
                            {st.completata && <CheckCircle2 size={16} className="text-success" style={{ marginLeft: '8px' }} />}
                        </h3>
                    )}
                </div>
                <div className="expand-icon" style={{ color: 'var(--text-muted)', marginLeft: '8px' }}>
                    {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
            </div>

            <div className={`card-content ${expanded ? 'expanded' : ''}`}>
                <p style={{ fontSize: '0.85rem', lineHeight: '1.4', color: '#c9d1d9', marginBottom: '15px' }}>{item.title}</p>

                {/* Attachments Section */}
                {expanded && (
                    <div className="attachments-section" style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                📎 Allegati ({attachmentsList.length})
                            </span>
                            <button
                                onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                                className="status-btn"
                                style={{ padding: '4px 8px', fontSize: '0.75rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                                disabled={isUploading}
                            >
                                {isUploading ? <Loader2 size={12} className="animate-spin" /> : <Paperclip size={12} />}
                                {isUploading ? ' Caricamento...' : ' Allega'}
                            </button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                style={{ display: 'none' }}
                                onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    setIsUploading(true);
                                    const formData = new FormData();
                                    formData.append('file', file);
                                    try {
                                        const res = await axios.post(`${API_URL}/attachments/${item.id}?user_id=${currentUser.id}`, formData, {
                                            headers: { 'Content-Type': 'multipart/form-data' }
                                        });
                                        onUpdateAttachments(item.id, [...attachmentsList, res.data.attachment]);
                                    } catch (err) {
                                        console.error("Upload failed", err);
                                        alert("Errore durante il caricamento.");
                                    } finally {
                                        setIsUploading(false);
                                        e.target.value = null;
                                    }
                                }}
                            />
                        </div>

                        {attachmentsList.length > 0 && (
                            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {attachmentsList.map(att => (
                                    <li key={att.filename} style={{ display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '6px 10px', borderRadius: '6px', fontSize: '0.85rem' }}>
                                        <a
                                            href={`${API_BASE}${att.url}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)', textDecoration: 'none', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                        >
                                            {getFileIcon(att.original_name)}
                                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{att.original_name}</span>
                                        </a>
                                        <button
                                            onClick={async (e) => {
                                                e.stopPropagation();
                                                if (!window.confirm("Sei sicuro di voler eliminare questo allegato?")) return;
                                                try {
                                                    await axios.delete(`${API_URL}/attachments/${item.id}/${att.filename}?user_id=${currentUser.id}`);
                                                    onUpdateAttachments(item.id, attachmentsList.filter(a => a.filename !== att.filename));
                                                } catch (err) {
                                                    console.error("Delete failed", err);
                                                }
                                            }}
                                            style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '4px', opacity: 0.7, transition: 'opacity 0.2s', display: 'flex', alignItems: 'center' }}
                                            onMouseEnter={e => e.currentTarget.style.opacity = 1}
                                            onMouseLeave={e => e.currentTarget.style.opacity = 0.7}
                                            title="Elimina allegato"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}
            </div>

            <div className="actions" style={{ marginTop: '15px' }}>
                <button
                    className={`status-btn ${st.completata ? 'active success' : st.iniziata ? 'active warning' : ''}`}
                    style={{ width: '100%', justifyContent: 'center', padding: '8px' }}
                    onClick={(e) => {
                        e.stopPropagation();
                        let nextIniziata = false;
                        let nextCompletata = false;

                        if (!st.iniziata && !st.completata) {
                            nextIniziata = true;
                        } else if (st.iniziata) {
                            nextCompletata = true;
                        }

                        onUpdateStatus(item.id, nextIniziata, nextCompletata);
                    }}
                >
                    {st.completata ? <CheckCircle2 size={14} /> : <Clock size={14} />}
                    {st.completata ? 'Fatto ✓' : st.iniziata ? 'Iniziata…' : 'Da fare'}
                </button>
            </div>
        </div>
    );
};

const Agenda = ({ homework, grades, status, attachments, onUpdateStatus, onUpdateAttachments, showHomework, showOther, scrollToDay, onScrolled, onRefresh, currentUser }) => {
    const today = new Date().setHours(0, 0, 0, 0);
    const dayRefs = useRef({});
    const [addingDay, setAddingDay] = useState(null);
    const [newTask, setNewTask] = useState({ tipo: 'compiti', materia_desc: '', autore_desc: '', title: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const rawSubjects = new Set();

    if (grades) {
        grades.forEach(g => {
            if (g.materia) rawSubjects.add(g.materia.trim().toLowerCase());
        });
    }

    if (homework) {
        homework.forEach(hw => {
            if (hw.materia_desc) rawSubjects.add(hw.materia_desc.trim().toLowerCase());
        });
    }

    const formatSubject = (m) => {
        if (m === "scienze integrate (scienze della terra e biologia)") return "Scienze Terra";
        if (m === "scienze integrate (fisica)") return "Fisica";
        if (m === "lingua e letteratura italiana") return "Italiano";
        if (m === "seconda lingua comunitaria") return "Francese";
        return m.charAt(0).toUpperCase() + m.slice(1);
    };

    const userSubjects = rawSubjects.size > 0
        ? [...rawSubjects].map(formatSubject).filter((v, i, a) => a.indexOf(v) === i).sort()
        : ["Italiano", "Storia", "Geografia", "Matematica", "Inglese"];

    // Filter and sort
    const filteredHw = homework
        .filter(hw => hw.start && new Date(hw.start).getTime() >= today)
        .filter(hw => {
            if (showHomework && hw.tipo === 'compiti') return true;
            if (showOther && hw.tipo !== 'compiti') return true;
            return false;
        })
        .sort((a, b) => new Date(a.start) - new Date(b.start));

    // Group by day key (YYYY-MM-DD)
    const grouped = filteredHw.reduce((acc, hw) => {
        const day = hw.start ? hw.start.split(' ')[0] : 'Unknown';
        if (!acc[day]) acc[day] = [];
        acc[day].push(hw);
        return acc;
    }, {});

    // Scroll to day when scrollToDay prop changes
    useEffect(() => {
        if (!scrollToDay) return;
        const keys = Object.keys(grouped).sort();
        const target = keys.find(k => k === scrollToDay) || keys.find(k => k >= scrollToDay);
        if (target && dayRefs.current[target]) {
            dayRefs.current[target].scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        if (onScrolled) onScrolled();
    }, [scrollToDay]);

    const handleAddManualTask = async (day) => {
        if (!newTask.title || !newTask.materia_desc) {
            alert("Compila materia/autore e descrizione.");
            return;
        }
        setIsSubmitting(true);
        try {
            await axios.post(`${API_URL}/manual_tasks?user_id=${currentUser.id}`, {
                title: newTask.title,
                start: `${day} 10:00:00`,
                tipo: newTask.tipo,
                materia_desc: newTask.materia_desc,
                autore_desc: newTask.autore_desc || newTask.materia_desc
            });
            setAddingDay(null);
            setNewTask({ tipo: 'compiti', materia_desc: '', autore_desc: '', title: '' });
            if (onRefresh) onRefresh();
        } catch (err) {
            console.error("Failed to add task", err);
            alert("Errore salvataggio task manuale.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteManualTask = async (taskId) => {
        if (!window.confirm("Vuoi eliminare questa attività scritta a mano?")) return;
        try {
            await axios.delete(`${API_URL}/manual_tasks/${taskId}?user_id=${currentUser.id}`);
            if (onRefresh) onRefresh();
        } catch (err) {
            console.error("Failed to delete task", err);
            alert("Errore durante l'eliminazione.");
        }
    };

    if (filteredHw.length === 0 && !addingDay) {
        return (
            <div style={{ textAlign: 'center', padding: '50px', color: 'var(--text-muted)' }}>
                Nessun'attività trovata con i filtri selezionati.
            </div>
        );
    }

    return (
        <div className="agenda-container" style={{ paddingBottom: '50px' }}>
            {Object.keys(grouped).map(day => (
                <div
                    key={day}
                    className="day-section"
                    ref={el => dayRefs.current[day] = el}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h2 className="day-title" style={{ fontSize: '1.35rem', color: 'var(--text-main)', margin: 0 }}>
                            <Clock size={20} />
                            {formatDateIta(day)}
                        </h2>
                    </div>

                    <div className="agenda-grid">
                        {grouped[day].map((item, idx) => (
                            <div key={item.id || `fb-${day}-${idx}`} style={{ position: 'relative' }}>
                                {item.is_manual && (
                                    <button
                                        onClick={() => handleDeleteManualTask(item.id)}
                                        style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 10, background: 'rgba(239, 68, 68, 0.2)', border: 'none', color: 'var(--danger)', padding: '6px', borderRadius: '50%', cursor: 'pointer', display: 'flex' }}
                                        title="Elimina attività manuale"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                )}
                                <AgendaCard
                                    item={item}
                                    st={status[item.id] || { iniziata: false, completata: false }}
                                    attachmentsList={attachments[item.id] || []}
                                    onUpdateStatus={onUpdateStatus}
                                    onUpdateAttachments={onUpdateAttachments}
                                    currentUser={currentUser}
                                />
                            </div>
                        ))}

                        {addingDay === day ? (
                            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column' }}>
                                <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                                    <select
                                        value={newTask.tipo}
                                        onChange={e => setNewTask({ ...newTask, tipo: e.target.value })}
                                        style={{ padding: '8px', borderRadius: '6px', background: 'var(--bg-dark)', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }}
                                    >
                                        <option value="compiti">Compiti</option>
                                        <option value="nota">Verifica/Nota</option>
                                    </select>
                                    <select
                                        value={newTask.materia_desc}
                                        onChange={e => setNewTask({ ...newTask, materia_desc: e.target.value })}
                                        style={{ flex: 1, padding: '8px', borderRadius: '6px', background: 'var(--bg-dark)', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }}
                                    >
                                        <option value="">Seleziona Materia...</option>
                                        {userSubjects.map(sub => (
                                            <option key={sub} value={sub}>{sub}</option>
                                        ))}
                                        <option value="Altro">Altro / Extra</option>
                                    </select>
                                </div>
                                <textarea
                                    placeholder="Dettagli attività..."
                                    value={newTask.title}
                                    onChange={e => setNewTask({ ...newTask, title: e.target.value })}
                                    style={{ width: '100%', padding: '8px', borderRadius: '6px', background: 'var(--bg-dark)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', minHeight: '60px', marginBottom: '10px' }}
                                />
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                    <button onClick={() => setAddingDay(null)} className="status-btn" style={{ background: 'transparent' }}>Annulla</button>
                                    <button
                                        onClick={() => handleAddManualTask(day)}
                                        className="status-btn active success"
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting ? 'Salvataggio...' : 'Salva'}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div
                                onClick={() => setAddingDay(day)}
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: 'linear-gradient(145deg, rgba(42, 45, 62, 0.6), rgba(31, 33, 45, 0.6))',
                                    borderRadius: '16px',
                                    padding: '20px',
                                    cursor: 'pointer',
                                    boxShadow: '4px 4px 10px rgba(0,0,0,0.3), -2px -2px 8px rgba(255,255,255,0.03)',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    transition: 'transform 0.1s ease, box-shadow 0.1s ease',
                                    minHeight: '120px',
                                    color: 'var(--text-main)',
                                }}
                                onMouseDown={e => {
                                    e.currentTarget.style.transform = 'translateY(2px)';
                                    e.currentTarget.style.boxShadow = 'inset 2px 2px 5px rgba(0,0,0,0.4), inset -2px -2px 5px rgba(255,255,255,0.02)';
                                }}
                                onMouseUp={e => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '4px 4px 10px rgba(0,0,0,0.3), -2px -2px 8px rgba(255,255,255,0.03)';
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '4px 4px 10px rgba(0,0,0,0.3), -2px -2px 8px rgba(255,255,255,0.03)';
                                }}
                            >
                                <div style={{
                                    width: '42px', height: '42px', borderRadius: '50%', background: 'var(--success)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px',
                                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)'
                                }}>
                                    <span style={{ fontSize: '24px', fontWeight: 'bold', color: 'white', lineHeight: 1 }}>+</span>
                                </div>
                                <span style={{ fontWeight: 600, letterSpacing: '0.4px', fontSize: '0.95rem' }}>Nuova Attività</span>
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default Agenda;
