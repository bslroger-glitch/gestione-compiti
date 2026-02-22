import React from 'react';
import { ArrowRight, Eye } from 'lucide-react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
    ReferenceLine
} from 'recharts';

const Analytics = ({ grades, academicPeriod = "pentamestre" }) => {
    // Calculate total evaluations
    let totalEvaluations = 0;

    grades.forEach(m => {
        totalEvaluations += m.voti.length;
    });

    const overallAvg = grades.length > 0 ? (grades.reduce((acc, curr) => acc + curr.media, 0) / grades.length) : 0;
    const periodLabel = academicPeriod === 'quadrimestre' ? 'Quadrimestre' : 'Pentamestre';

    // Helper for formatting the subject name nicely
    const formatSub = (name) => {
        if (!name) return "";
        let n = name.trim();
        if (n.toLowerCase() === "scienze integrate (scienze della terra e biologia)") return "Scienze Terra";
        if (n.toLowerCase() === "scienze integrate (fisica)") return "Fisica";
        if (n.toLowerCase().includes("italiana")) return "Italiano";
        if (n.toLowerCase().includes("comunitaria")) return "Francese";
        if (n.toLowerCase() === "diritto ed economia") return "Diritto/Eco";
        if (n.toLowerCase() === "economia aziendale") return "Economia Az.";
        return n.charAt(0).toUpperCase() + n.slice(1).toLowerCase();
    };

    const sortedGrades = [...grades].sort((a, b) => b.media - a.media);

    const getGradeColor = (val) => val >= 6 ? '#5da215' : '#e5534b';

    // Format Data for Recharts BarChart
    const chartData = grades.map(m => ({
        name: formatSub(m.materia).length > 15 ? formatSub(m.materia).substring(0, 12) + "..." : formatSub(m.materia),
        full_name: formatSub(m.materia),
        media: m.media
    })).sort((a, b) => b.media - a.media);

    // Custom tooltip for BarChart
    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div style={{
                    background: 'rgba(15, 15, 20, 0.95)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    padding: '12px',
                    borderRadius: '8px',
                    backdropFilter: 'blur(10px)',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
                }}>
                    <p style={{ fontWeight: 'bold', marginBottom: '4px', color: 'white' }}>{payload[0].payload.full_name}</p>
                    <p style={{ color: payload[0].value >= 6 ? '#5da215' : '#e5534b', fontWeight: 'bold' }}>
                        Media: {payload[0].value.toFixed(2)}
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="analytics-container" style={{ paddingBottom: '30px' }}>
            {/* Header Card */}
            <div style={{
                background: overallAvg >= 6 ? '#62a515' : '#d93838',
                borderRadius: '16px',
                padding: '24px',
                color: 'white',
                marginBottom: '24px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                position: 'relative',
                overflow: 'hidden'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <h2 style={{ fontSize: '1.4rem', fontWeight: '800', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            Media voti {periodLabel.toLowerCase()}
                            <Eye size={20} style={{ opacity: 0.9 }} />
                        </h2>
                        <p style={{ fontSize: '1.1rem', fontWeight: '600', opacity: 0.9 }}>{totalEvaluations} valutazioni totali</p>
                    </div>
                    {/* Big Circular Average */}
                    <div style={{
                        width: '85px',
                        height: '85px',
                        borderRadius: '50%',
                        border: '7px solid white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '2rem',
                        fontWeight: '800',
                        boxShadow: '0 0 15px rgba(0,0,0,0.1)'
                    }}>
                        {overallAvg.toFixed(1)}
                    </div>
                </div>

                <div style={{ height: '1px', background: 'rgba(255,255,255,0.3)', margin: '20px 0' }}></div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div>
                        <div style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '8px' }}>Periodo attuale: {periodLabel}</div>
                        <div style={{
                            background: 'white',
                            color: overallAvg >= 6 ? '#5da215' : '#d93838',
                            padding: '6px 24px',
                            borderRadius: '24px',
                            fontWeight: '800',
                            fontSize: '1.2rem',
                            display: 'inline-block',
                            marginTop: '8px'
                        }}>
                            {overallAvg.toFixed(1)}
                        </div>
                    </div>
                </div>
            </div>

            {/* Bar Chart Section */}
            {chartData.length > 0 && (
                <div style={{
                    background: '#1c1c1e',
                    borderRadius: '16px',
                    padding: '24px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    border: '1px solid rgba(255,255,255,0.03)',
                    marginBottom: '32px'
                }}>
                    <h3 style={{
                        fontSize: '1.2rem',
                        fontWeight: '800',
                        color: 'white',
                        marginBottom: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                    }}>
                        Andamento Medie Materie
                    </h3>
                    <div style={{ height: '300px', width: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 20, right: 10, left: -20, bottom: 40 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis
                                    dataKey="name"
                                    stroke="#a1a1aa"
                                    fontSize={11}
                                    tick={{ fill: '#a1a1aa' }}
                                    angle={-35}
                                    textAnchor="end"
                                    interval={0}
                                />
                                <YAxis
                                    stroke="#a1a1aa"
                                    fontSize={12}
                                    domain={[0, 10]}
                                    ticks={[0, 2, 4, 6, 8, 10]}
                                    tickFormatter={(val) => val === 0 ? '' : val}
                                />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />

                                {/* Sufficiency Reference Line */}
                                <ReferenceLine y={6} stroke="#e5534b" strokeDasharray="5 5" strokeOpacity={0.7} />

                                {/* Overall Average Reference Line */}
                                <ReferenceLine y={overallAvg} stroke="#62a515" strokeDasharray="3 3" strokeWidth={2} />

                                <Bar dataKey="media" radius={[6, 6, 0, 0]} maxBarSize={45}>
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.media >= 6 ? '#5da215' : '#e5534b'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* Grid of Subjects */}
            <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: 'white', marginBottom: '16px' }}>
                Valutazioni di Dettaglio
            </h3>
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                gap: '16px'
            }}>
                {sortedGrades.map((m, idx) => (
                    <div key={idx} style={{
                        background: '#1c1c1e',
                        borderRadius: '16px',
                        padding: '16px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        border: '1px solid rgba(255,255,255,0.03)',
                        display: 'flex',
                        flexDirection: 'column'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                            <h3 style={{
                                fontSize: '1.15rem',
                                fontWeight: '800',
                                color: 'white',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                maxWidth: '85%'
                            }}>
                                {formatSub(m.materia)}
                            </h3>
                            <ArrowRight size={18} color={m.media >= 6 ? "#5da215" : "#e5534b"} />
                        </div>

                        <p style={{ fontSize: '0.95rem', color: '#a1a1aa', fontWeight: '700', marginBottom: '16px' }}>
                            {m.voti.length} valutazion{m.voti.length === 1 ? 'e' : 'i'} - Media: <span style={{ color: m.media >= 6 ? '#5da215' : '#e5534b' }}>{m.media.toFixed(2)}</span>
                        </p>

                        {/* Horizontal scroll for grades */}
                        <div style={{
                            display: 'flex',
                            gap: '12px',
                            overflowX: 'auto',
                            paddingBottom: '8px',
                            scrollbarWidth: 'none',
                            msOverflowStyle: 'none'
                        }} className="hide-scroll">
                            <style>{`.hide-scroll::-webkit-scrollbar { display: none; }`}</style>
                            {m.voti.map((v, vIdx) => {
                                const color = getGradeColor(v.val);
                                return (
                                    <div key={vIdx} style={{
                                        minWidth: '50px',
                                        height: '50px',
                                        borderRadius: '50%',
                                        border: `6px solid ${color}`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '1.1rem',
                                        fontWeight: '800',
                                        color: '#d1d5db',
                                        background: 'rgba(0,0,0,0.2)'
                                    }}>
                                        {v.str}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Analytics;
