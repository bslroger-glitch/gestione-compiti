import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Book, Layout, BarChart, RefreshCw, Calendar, CheckCircle2, Clock } from 'lucide-react';
import {
  BarChart as ReBarChart,
  Bar,
  ResponsiveContainer,
  Cell,
  XAxis as ReXAxis
} from 'recharts';
import Agenda from './components/Agenda';
import Analytics from './components/Analytics';
import Home from './components/Home';
import './App.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('agenda');
  const [homework, setHomework] = useState([]);
  const [grades, setGrades] = useState([]);
  const [status, setStatus] = useState({});
  const [attachments, setAttachments] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showHomework, setShowHomework] = useState(true);
  const [showOther, setShowOther] = useState(true);
  const [scrollToDay, setScrollToDay] = useState(null);

  // Settings State
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [academicPeriod, setAcademicPeriod] = useState('pentamestre');
  const [settingsError, setSettingsError] = useState('');
  const [settingsSuccess, setSettingsSuccess] = useState('');

  // Sync academic period state with current user
  useEffect(() => {
    if (currentUser) {
      setAcademicPeriod(currentUser.academic_period || 'pentamestre');
    }
  }, [currentUser]);

  const fetchData = async () => {
    if (!currentUser) return;
    setLoading(true);
    setError(null);
    try {
      const [hwRes, gradesRes, statusRes, attRes] = await Promise.all([
        axios.get(`${API_URL}/homework?user_id=${currentUser.id}`),
        axios.get(`${API_URL}/grades?user_id=${currentUser.id}`),
        axios.get(`${API_URL}/status?user_id=${currentUser.id}`),
        axios.get(`${API_URL}/attachments?user_id=${currentUser.id}`).catch(() => ({ data: {} })) // fallback in case of error
      ]);
      setHomework(hwRes.data);
      setGrades(gradesRes.data);
      setStatus(statusRes.data);
      setAttachments(attRes.data);
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Errore nel caricamento dei dati locali.");
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    if (!currentUser) return;

    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      // Extended timeout for slow scraping (60s)
      await axios.post(`${API_URL}/sync?user_id=${currentUser.id}`, {}, { timeout: 60000 });
      setSuccess("Dati aggiornati correttamente da ClasseViva!");
      await fetchData();
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      console.error("Sync error:", err);
      setError("Sincronizzazione fallita (timeout o errore connessione). Riprova fra poco.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSettingsError('');
    setSettingsSuccess('');
    let successCount = 0;
    let expectedCount = 1; // Always update period

    try {
      // 1. Update academic period
      await axios.put(`${API_URL}/users/${currentUser.id}/period`, {
        academic_period: academicPeriod
      });
      successCount++;

      // Update local state to reflect period change immediately for Analytics
      setCurrentUser(prev => ({ ...prev, academic_period: academicPeriod }));

      // 2. Update PIN (only if provided)
      if (oldPin || newPin) {
        expectedCount++;
        if (!oldPin || !newPin || newPin.length < 4) {
          setSettingsError("Compila correttamente vecchio e nuovo PIN (min. 4 caratteri).");
          return;
        }
        await axios.put(`${API_URL}/users/${currentUser.id}/pin`, {
          old_pin: oldPin,
          new_pin: newPin
        });
        successCount++;
      }

      if (successCount === expectedCount) {
        setSettingsSuccess("Impostazioni aggiornate con successo!");

        // Re-fetch data if period changed
        if (currentUser.academic_period !== academicPeriod) {
          fetchData();
        }

        setTimeout(() => {
          setShowSettingsModal(false);
          setOldPin('');
          setNewPin('');
          setSettingsSuccess('');
        }, 2000);
      }
    } catch (err) {
      setSettingsError(err.response?.data?.detail || "Errore durante il salvataggio.");
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchData();
    }
  }, [currentUser]);

  const updateStatus = async (ev_id, iniziata, completata) => {
    if (!currentUser) return;
    try {
      await axios.post(`${API_URL}/status?user_id=${currentUser.id}`, { ev_id, iniziata, completata });
      setStatus(prev => ({
        ...prev,
        [ev_id]: { iniziata, completata }
      }));
    } catch (err) {
      console.error("Error updating status:", err);
    }
  };

  const updateAttachments = (ev_id, newAttList) => {
    setAttachments(prev => ({
      ...prev,
      [ev_id]: newAttList
    }));
  };

  const totalGrades = grades.reduce((acc, curr) => acc + curr.voti.length, 0);
  const avgGrade = grades.length > 0 ? (grades.reduce((acc, curr) => acc + curr.media, 0) / grades.length).toFixed(2) : "0.00";

  // Data for Sidebar Workload Chart (Next 5 Weekdays)
  const getWorkloadData = () => {
    const days = [];
    let d = new Date();

    while (days.length < 5) {
      const dayNum = d.getDay();
      if (dayNum !== 0 && dayNum !== 6) { // Skip Sat (6) and Sun (0)
        const dStr = d.toISOString().split('T')[0];
        const tasks = homework.filter(h => h.start && h.start.startsWith(dStr));

        let todo = 0, started = 0, done = 0;
        tasks.forEach(t => {
          const s = status[t.id] || { iniziata: false, completata: false };
          if (s.completata) done++;
          else if (s.iniziata) started++;
          else todo++;
        });

        days.push({
          name: ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'][dayNum],
          todo,
          started,
          done,
          total: tasks.length
        });
      }
      d.setDate(d.getDate() + 1);
    }
    return days;
  };

  const workloadData = getWorkloadData();

  // Test Detection — scans ALL text fields for keywords
  const TEACHER_SUB_MAP = {
    "MIGLINO": "geografia",
    "VISENTIN": "lingua e letteratura italiana",
    "VENTURA": "lingua e letteratura italiana",
    "BONIARDI": "seconda lingua comunitaria",
    "VIRGILLI": "scienze integrate (scienze della terra e biologia)",
    "IANNELLO": "matematica",
    "ERBA": "economia aziendale",
    "TETTAMANTI": "diritto ed economia",
    "NATALE": "scienze integrate (fisica)",
    "DE CARLO": "informatica",
    "CAMPI": "lingua inglese",
  };
  const subFromTeacher = (a) => {
    if (!a) return null;
    const u = a.toUpperCase();
    for (const [k, v] of Object.entries(TEACHER_SUB_MAP)) if (u.includes(k)) return v;
    return null;
  };

  const getTestAlerts = () => {
    const keywords = ['prova', 'interrogazion', 'test', 'verifica', 'recupero'];
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const limit = new Date(today); limit.setDate(today.getDate() + 14);
    const seen = new Set();

    return homework.filter(h => {
      if (!h.start) return false;
      const d = new Date(h.start);
      if (d < today || d > limit) return false;
      const blob = [h.title, h.nota_2, h.autore_desc].filter(Boolean).join(' ').toLowerCase();
      return keywords.some(kw => blob.includes(kw));
    }).map(h => {
      const blob = [h.title, h.nota_2, h.autore_desc].filter(Boolean).join(' ');
      const blobL = blob.toLowerCase();

      // Level 1: exact materia_desc from Spaggiari
      let grade = null;
      if (h.materia_desc) {
        const sL = h.materia_desc.toLowerCase();
        grade = grades.find(g => {
          const gL = (g.materia || '').toLowerCase();
          return sL.includes(gL) || gL.includes(sL);
        });
      }

      // Level 2: teacher surname → known subject (only if Level 1 missed)
      if (!grade) {
        const teacherSub = subFromTeacher(h.autore_desc);
        if (teacherSub) {
          const sL = teacherSub.toLowerCase();
          grade = grades.find(g => (g.materia || '').toLowerCase().includes(sL) || sL.includes((g.materia || '').toLowerCase()));
        }
      }

      // Level 3: blob fallback — ONLY when levels 1+2 both failed.
      // Requires ALL significant words (>4 chars) of the grade subject to appear in the blob
      // to avoid 'lingua' matching both 'lingua inglese' and 'lingua e letteratura italiana'.
      if (!grade) {
        grade = grades.reduce((best, g) => {
          const gWords = (g.materia || '').toLowerCase().split(' ').filter(w => w.length > 4);
          if (!gWords.length) return best;
          const matchCount = gWords.filter(w => blobL.includes(w)).length;
          // Need ALL significant words to match (strict), and prefer more specific matches
          if (matchCount === gWords.length && (!best || gWords.length > best._matchLen)) {
            return { ...g, _matchLen: gWords.length };
          }
          return best;
        }, null);
      }

      const resolvedSub = h.materia_desc || (grade ? grade.materia : h.autore_desc || "");
      const avg = grade ? grade.media : null;
      const rawDate = h.start.split(' ')[0];
      const key = `${rawDate}-${resolvedSub.toLowerCase()}`;
      if (seen.has(key)) return null;
      seen.add(key);

      const displayTitle = (h.title || h.nota_2 || "").trim();
      const SHORT_NAMES = {
        "lingua e letteratura italiana": "Italiano",
        "seconda lingua comunitaria": "Francese",
        "lingua inglese": "Inglese",
        "scienze integrate (scienze della terra e biologia)": "Scienze Terra",
        "scienze integrate (fisica)": "Fisica",
        "economia aziendale": "Economia",
        "diritto ed economia": "Diritto/Eco"
      };
      const matName = (grade ? grade.materia : resolvedSub) || "";
      const subLabel = SHORT_NAMES[matName.toLowerCase()] || (matName.length > 18 ? matName.substring(0, 15) + "…" : matName);

      const dateObj = new Date(rawDate);
      const daysShort = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
      const dayName = daysShort[dateObj.getDay()];

      return {
        id: h.id, rawDate,
        date: `${dayName} ${rawDate.split('-').slice(1).reverse().join('/')}`,
        subject: subLabel,
        title: displayTitle.length > 45 ? displayTitle.substring(0, 42) + "…" : displayTitle,
        avg, isLow: avg === null || avg < 6
      };
    }).filter(Boolean)
      .sort((a, b) => a.rawDate.localeCompare(b.rawDate))
      .slice(0, 6);
  };

  const getScheduleAlerts = () => {
    const keywords = ['uscit', 'entrat', 'anticipat', 'posticipat', 'ritard', 'sciopero', 'assemblea'];
    const timeRegex = /\b\d{1,2}[:.]\d{2}\b/;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const limit = new Date(today); limit.setDate(today.getDate() + 14);

    return homework.filter(h => {
      if (!h.start) return false;
      const d = new Date(h.start);
      if (d < today || d > limit) return false;
      const blob = [h.title, h.materia_desc, h.autore_desc].filter(Boolean).join(' ').toLowerCase();
      return keywords.some(kw => blob.includes(kw));
    }).map(h => {
      const blob = [h.title, h.materia_desc, h.autore_desc].filter(Boolean).join(' ');
      const timeMatch = blob.match(timeRegex);
      const timeStr = timeMatch ? timeMatch[0].replace('.', ':') : null;

      const rawDate = h.start.split(' ')[0];
      const dateObj = new Date(rawDate);
      const daysShort = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
      const dayName = daysShort[dateObj.getDay()];

      let type = "Variazione";
      const blobL = blob.toLowerCase();
      if (blobL.includes("uscit") || blobL.includes("anticipat")) type = "Uscita Anticipata";
      else if (blobL.includes("entrat") || blobL.includes("posticipat") || blobL.includes("ritard")) type = "Entrata Posticipata";
      else if (blobL.includes("sciopero")) type = "Sciopero";
      else if (blobL.includes("assemblea")) type = "Assemblea";

      return {
        id: `sched-${h.id}`,
        rawDate,
        date: `${dayName} ${rawDate.split('-').slice(1).reverse().join('/')}`,
        time: timeStr,
        type,
        title: blob.length > 50 ? blob.substring(0, 47) + "…" : blob
      };
    }).sort((a, b) => a.rawDate.localeCompare(b.rawDate));
  };

  const alerts = getTestAlerts();
  const scheduleAlerts = getScheduleAlerts();

  if (!currentUser) {
    return <Home onLogin={setCurrentUser} />;
  }

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="logo-section" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {currentUser.avatar_url ? (
              <img
                src={`${API_URL.replace('/api', '')}${currentUser.avatar_url}`}
                alt="Avatar"
                style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.1)' }}
              />
            ) : (
              <Book className="logo-icon" />
            )}
            <span className="logo-text">Agenda di {currentUser.name}</span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => {
                setCurrentUser(null);
                setHomework([]);
                setGrades([]);
                setStatus({});
                setAttachments({});
              }}
              style={{
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.2)',
                color: 'var(--text-muted)',
                fontSize: '0.75rem',
                padding: '4px 8px',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Cambia Profilo
            </button>
            <button
              onClick={() => setShowSettingsModal(true)}
              style={{
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.2)',
                color: 'var(--text-muted)',
                fontSize: '0.75rem',
                padding: '4px 8px',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Impostazioni
            </button>
          </div>
        </div>

        <nav className="nav-section">
          <div
            className={`nav-item ${activeTab === 'agenda' ? 'active' : ''}`}
            onClick={() => setActiveTab('agenda')}
          >
            <Calendar size={20} />
            <span>Agenda</span>
          </div>
          <div
            className={`nav-item ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            <BarChart size={20} />
            <span>Analisi Voti</span>
          </div>
        </nav>

        {scheduleAlerts.length > 0 && (
          <div style={{ margin: '0 20px 20px', padding: '15px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '12px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--danger)', fontWeight: 'bold', fontSize: '0.85rem', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              <Clock size={16} /> Variazioni Orario
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {scheduleAlerts.map((alert, idx) => (
                <div key={alert.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingBottom: idx === scheduleAlerts.length - 1 ? '0' : '8px', borderBottom: idx === scheduleAlerts.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-main)', fontWeight: '600', fontSize: '0.9rem' }}>{alert.date}</span>
                    {alert.time && <span style={{ color: 'var(--warning)', fontWeight: 'bold', fontSize: '0.85rem', background: 'rgba(245, 158, 11, 0.2)', padding: '2px 6px', borderRadius: '4px' }}>{alert.time}</span>}
                  </div>
                  <span style={{ color: 'var(--text-main)', fontSize: '0.8rem', fontWeight: '500' }}>{alert.type}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', lineHeight: '1.3' }}>{alert.title}</span>
                </div>
              ))}
            </div>
          </div>
        )}


        <div className="stats-bar">
          <div style={{ marginBottom: '20px' }}>
            <span className="stat-label" style={{ display: 'block', marginBottom: '10px' }}>Carico Settimanale</span>
            <div style={{ height: '120px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <ReBarChart data={workloadData}>
                  <ReXAxis dataKey="name" hide />
                  <Bar dataKey="done" stackId="a" fill="var(--success)" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="started" stackId="a" fill="var(--warning)" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="todo" stackId="a" fill="rgba(255,255,255,0.1)" radius={[2, 2, 0, 0]} />
                </ReBarChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '8px', padding: '0 4px' }}>
              {workloadData.map((d, i) => <span key={i} style={{ fontWeight: i === 0 ? 'bold' : 'normal', color: i === 0 ? 'var(--text-main)' : 'inherit' }}>{d.name}</span>)}
            </div>
          </div>

          <div className="stat-item">
            <span className="stat-label">Media Totale</span>
            <span className="stat-value" style={{ color: 'var(--warning)' }}>{avgGrade}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Voti Totali</span>
            <span className="stat-value">{totalGrades}</span>
          </div>
          <div className="stat-item" style={{ marginTop: '12px' }}>
            <button
              onClick={handleSync}
              className="status-btn"
              style={{ width: '100%', justifyContent: 'center' }}
              disabled={loading}
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              {loading ? 'Sincronizzazione...' : 'Sincronizza Ora'}
            </button>
          </div>
        </div>
      </aside>

      <main className="main-content" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0 }}>

        {/* Sticky top section */}
        <div className="content-header" style={{ padding: '40px 40px 0 40px', flexShrink: 0 }}>
          <header className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h1>{activeTab === 'agenda' ? 'Agenda Compiti' : 'Analisi Valutazioni'}</h1>
              <p>{activeTab === 'agenda' ? 'Prossime scadenze e attività.' : 'Performance accademiche e medie.'}</p>
            </div>
            {activeTab === 'agenda' && (
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  className={`status-btn ${showHomework ? 'active success' : ''}`}
                  onClick={() => setShowHomework(!showHomework)}
                >
                  Compiti {showHomework ? 'ON' : 'OFF'}
                </button>
                <button
                  className={`status-btn ${showOther ? 'active warning' : ''}`}
                  onClick={() => setShowOther(!showOther)}
                >
                  Altro {showOther ? 'ON' : 'OFF'}
                </button>
              </div>
            )}
          </header>

          {/* Alerts panel - stays fixed, shown only in agenda tab */}
          {activeTab === 'agenda' && alerts.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <span className="stat-label" style={{ display: 'block', marginBottom: '10px', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                🚨 Verifiche nelle prossime 2 settimane
              </span>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {alerts.map(alert => (
                  <div
                    key={alert.id}
                    onClick={() => { setActiveTab('agenda'); setScrollToDay(alert.rawDate); }}
                    style={{
                      background: alert.isLow ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                      border: `1px solid ${alert.isLow ? 'var(--danger)' : 'var(--warning)'}`,
                      borderRadius: '10px',
                      padding: '10px 14px',
                      fontSize: '0.8rem',
                      minWidth: '170px',
                      maxWidth: '220px',
                      cursor: 'pointer',
                      transition: 'opacity 0.2s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.opacity = '0.75'}
                    onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontWeight: '700', color: alert.isLow ? 'var(--danger)' : 'var(--warning)' }}>{alert.date}</span>
                      <span style={{ opacity: 0.7, fontSize: '0.7rem' }}>{alert.avg !== null ? `media: ${alert.avg}` : 'N/D'}</span>
                    </div>
                    <div style={{ fontWeight: '600', marginBottom: '3px', color: 'var(--text-main)' }}>{alert.subject}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>{alert.title}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.4)',
              border: '1px solid var(--danger)',
              color: 'white',
              padding: '12px 20px',
              borderRadius: '10px',
              marginBottom: '16px',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}>
              <RefreshCw size={16} />
              {error}
            </div>
          )}

          {success && (
            <div style={{
              background: 'rgba(16, 185, 129, 0.4)',
              border: '1px solid var(--success)',
              color: 'white',
              padding: '12px 20px',
              borderRadius: '10px',
              marginBottom: '16px',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}>
              <CheckCircle2 size={16} />
              {success}
            </div>
          )}
        </div>

        {/* Scrollable content area */}
        <div className="content-body" style={{ flex: 1, overflowY: 'auto', padding: '0 40px 40px 40px' }}>
          {loading && !homework.length ? (
            <div className="loading" style={{ textAlign: 'center', padding: '100px', color: 'var(--text-muted)' }}>
              <RefreshCw size={40} className="animate-spin" style={{ marginBottom: '20px' }} />
              <p>Caricamento dati in corso...</p>
            </div>
          ) : (
            activeTab === 'agenda' ? (
              <Agenda
                homework={homework}
                grades={grades}
                status={status}
                attachments={attachments}
                onUpdateStatus={updateStatus}
                onUpdateAttachments={updateAttachments}
                showHomework={showHomework}
                showOther={showOther}
                scrollToDay={scrollToDay}
                onScrolled={() => setScrollToDay(null)}
                currentUser={currentUser}
                onRefresh={fetchData}
              />
            ) : (
              <Analytics grades={grades} academicPeriod={academicPeriod} />
            )
          )}
        </div>
      </main>

      {/* Settings Modal */}
      {showSettingsModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{
            background: 'var(--bg-card)', padding: '40px', borderRadius: '20px',
            width: '100%', maxWidth: '450px', border: '1px solid rgba(255,255,255,0.1)'
          }}>
            <h2 style={{ marginBottom: '20px', fontSize: '1.5rem', fontWeight: 'bold' }}>Impostazioni Profilo</h2>
            <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

              {/* Period Configuration */}
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '15px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '10px', color: 'var(--text-main)' }}>Periodo Valutazione</h3>
                <label style={{ display: 'block', marginBottom: '5px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Su quale periodo vuoi calcolare le medie e sincronizzare i voti dalla bacheca ClasseViva?</label>
                <select
                  value={academicPeriod}
                  onChange={e => setAcademicPeriod(e.target.value)}
                  style={{ width: '100%', padding: '12px', borderRadius: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', marginTop: '5px' }}
                >
                  <option value="quadrimestre">1° o 2° Quadrimestre (S1/S2)</option>
                  <option value="pentamestre">Trimestre o Pentamestre (S3)</option>
                </select>
              </div>

              {/* PIN Configuration */}
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '15px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '10px', color: 'var(--text-main)' }}>Cambia PIN Privacy</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div>
                    <input
                      type="password"
                      placeholder="Vecchio PIN (Opzionale se cambi solo il periodo)"
                      value={oldPin}
                      onChange={e => setOldPin(e.target.value)}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                    />
                  </div>
                  <div>
                    <input
                      type="password"
                      placeholder="Nuovo PIN"
                      value={newPin}
                      onChange={e => setNewPin(e.target.value)}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                      minLength={4}
                    />
                  </div>
                </div>
              </div>

              {settingsError && <p style={{ color: 'var(--danger)', fontSize: '0.85rem', textAlign: 'center' }}>{settingsError}</p>}
              {settingsSuccess && <p style={{ color: 'var(--success)', fontSize: '0.85rem', textAlign: 'center' }}>{settingsSuccess}</p>}

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowSettingsModal(false)} style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid var(--border)', color: 'white', borderRadius: '10px' }}>Annulla</button>
                <button type="submit" style={{ flex: 1, padding: '12px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold' }}>Salva Impostazioni</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
