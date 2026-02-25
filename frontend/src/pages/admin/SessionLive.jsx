import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api';
import { Play, Square, Users, Copy, ArrowLeft, X, Power } from 'lucide-react';
import Toast from '../../components/Toast';

const SessionLive = () => {
    const { id: sessionCode } = useParams();
    const navigate = useNavigate();
    const [session, setSession] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState(null);
    const [connectedUsers, setConnectedUsers] = useState(0);
    const [connectedNames, setConnectedNames] = useState([]);
    const [showUsersModal, setShowUsersModal] = useState(false);

    useEffect(() => {
        fetchInitialData();
    }, [sessionCode]);

    useEffect(() => {
        if (!session) return;

        // Setup SSE for real-time results
        const sse = new EventSource(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/admin/sessions/${session.id}/live-results`);

        const doPoll = async () => {
            try {
                const [res, usersRes] = await Promise.all([
                    api.get(`/admin/sessions/${session.id}/results`),
                    api.get(`/admin/sessions/${session.id}/connected-users`)
                ]);
                setResults(res.data.sort((a, b) => b.id - a.id));
                setConnectedUsers(usersRes.data.count);
                setConnectedNames(usersRes.data.names || []);
            } catch (e) {
                console.error(e);
            }
        };

        sse.onmessage = (e) => {
            doPoll();
        };

        const pollInterval = setInterval(doPoll, 3000);

        return () => {
            sse.close();
            clearInterval(pollInterval);
        };
    }, [session]);

    const fetchInitialData = async () => {
        try {
            // 1. Get session by code to get the ID
            const sessRes = await api.get(`/admin/sessions/${sessionCode}`);
            setSession(sessRes.data);

            // 2. Get questions library
            const qRes = await api.get('/admin/questions');
            setQuestions(qRes.data);

            setLoading(false);
            setLoading(false);
        } catch (e) {
            console.error(e);
            setToast({ message: "Error loading session details", type: 'error' });
        }
    };

    const pollResults = async () => {
        if (!session) return;
        try {
            const res = await api.get(`/admin/sessions/${session.id}/results`);
            setResults(res.data.sort((a, b) => b.id - a.id));
        } catch (e) {
            console.error(e);
        }
    };

    const launchQuestion = async (questionId) => {
        if (!session) return;
        try {
            await api.post(`/admin/sessions/${session.id}/activate-question?question_id=${questionId}`);
            pollResults();
            setToast({ message: "Question launched to students", type: 'success' });
        } catch (e) {
            setToast({ message: "Failed to launch question", type: 'error' });
        }
    };

    const closeQuestion = async (sessionQuestionId) => {
        try {
            await api.put(`/admin/sessions/${session.id}/question/${sessionQuestionId}/close`);
            pollResults();
            setToast({ message: "Question closed", type: 'success' });
        } catch (e) {
            setToast({ message: "Failed to close question", type: 'error' });
        }
    };

    const handleEndSession = async () => {
        if (!window.confirm("Are you sure you want to end this session? Students will be disconnected.")) return;
        try {
            await api.put(`/admin/sessions/${session.id}/end`);
            setSession({ ...session, status: 'closed' });
            setToast({ message: "Session ended successfully", type: 'success' });
        } catch (e) {
            setToast({ message: "Failed to end session", type: 'error' });
        }
    };

    const copyLink = () => {
        const link = `${window.location.origin}/session/${sessionCode}`;
        navigator.clipboard.writeText(link);
        setToast({ message: "Shareable link copied!", type: 'success' });
    };

    if (loading) return <div className="p-12 text-center text-gray-500">Loading session...</div>;

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <header className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/admin/dashboard')} className="p-2 text-gray-400 hover:text-gray-900 transition rounded-full hover:bg-gray-100">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">Live Session</h1>
                        {session?.status === 'active' ? (
                            <p className="text-sm text-green-600 font-medium flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> Active
                            </p>
                        ) : (
                            <p className="text-sm text-gray-500 font-medium flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-gray-400"></span> Closed
                            </p>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {session?.status === 'active' && (
                        <button
                            onClick={handleEndSession}
                            className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg font-medium hover:bg-red-100 transition shadow-sm mr-2"
                        >
                            <Power className="w-4 h-4" /> End Session
                        </button>
                    )}
                    <button
                        onClick={() => setShowUsersModal(true)}
                        className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full font-medium text-sm border border-blue-200 shadow-sm hover:bg-blue-100 transition cursor-pointer"
                    >
                        <Users className="w-4 h-4" />
                        <span>{connectedUsers} {connectedUsers === 1 ? 'Student' : 'Students'}</span>
                    </button>
                    <div className="bg-gray-100 text-gray-800 px-4 py-2 rounded-lg font-mono font-bold text-lg border border-gray-200 flex items-center gap-3">
                        {sessionCode}
                        <button onClick={copyLink} className="text-gray-400 hover:text-blue-600"><Copy className="w-4 h-4" /></button>
                    </div>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                {/* Left Sidebar: Library */}
                {session?.status === 'active' && (
                    <div className="w-1/3 bg-white border-r border-gray-200 flex flex-col h-full overflow-hidden">
                        <div className="p-4 border-b border-gray-200 bg-gray-50">
                            <h2 className="font-semibold text-gray-900">Question Library</h2>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {questions.map(q => (
                                <div key={q.id} className="border border-gray-200 rounded-lg p-4 bg-white hover:border-blue-300 transition shadow-sm">
                                    <p className="text-gray-900 font-medium mb-3">{q.text}</p>
                                    <button
                                        onClick={() => launchQuestion(q.id)}
                                        className="w-full py-2 bg-blue-50 text-blue-700 font-medium rounded-md hover:bg-blue-100 transition flex items-center justify-center gap-2 text-sm"
                                    >
                                        <Play className="w-4 h-4" /> Launch to Students
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Right Area: Results */}
                <div className={`${session?.status === 'active' ? 'w-2/3' : 'w-full'} flex flex-col h-full overflow-hidden bg-gray-50`}>
                    <div className="p-4 border-b border-gray-200 bg-white shadow-sm z-10">
                        <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                            <Users className="w-5 h-5 text-gray-400" />
                            Live Results
                        </h2>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-8">
                        {results.length === 0 && (
                            <div className="text-center text-gray-500 mt-20">
                                No questions have been launched in this session yet.
                            </div>
                        )}

                        {results.map(r => (
                            <div key={r.id} className={`bg-white rounded-xl border p-6 shadow-sm ${r.status === 'open' ? 'border-blue-300 ring-2 ring-blue-50' : 'border-gray-200'}`}>
                                <div className="flex justify-between items-start mb-6 border-b border-gray-100 pb-4">
                                    <div>
                                        <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium uppercase tracking-wider mb-3 ${r.status === 'open' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                                            {r.status === 'open' ? 'Accepting Responses' : 'Closed'}
                                        </span>
                                        <h3 className="text-xl font-medium text-gray-900">{r.text}</h3>
                                    </div>
                                    {r.status === 'open' && (
                                        <button
                                            onClick={() => closeQuestion(r.id)}
                                            className="px-4 py-2 bg-red-50 text-red-600 rounded-lg font-medium hover:bg-red-100 flex items-center gap-2 text-sm"
                                        >
                                            <Square className="w-4 h-4" /> Close
                                        </button>
                                    )}
                                </div>

                                {/* Histogram */}
                                <div className="mb-8">
                                    <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">AI Score Distribution</h4>

                                    {/* The graph container */}
                                    <div className="flex items-end h-40 gap-4 mt-8 pb-6 border-b border-gray-100">
                                        {[1, 2, 3, 4].map(score => {
                                            // 1. Calculate how many responses got this score
                                            const count = r.responses?.filter(resp => Number(resp.ai_score) === Number(score)).length || 0;

                                            // 2. What is the highest bin count? (Minimum 5 units so the graph doesn't look instantly 100% full on 1 vote)
                                            const counts = [1, 2, 3, 4].map(s => r.responses?.filter(resp => Number(resp.ai_score) === Number(s)).length || 0);
                                            const maxPeak = Math.max(...counts, 5);

                                            // 3. Transform literal count into a percentage of the peak
                                            const percHeight = Math.max((count / maxPeak) * 100, 2); // At least 2% so it's a visible nub

                                            return (
                                                <div key={score} className="flex-1 flex flex-col items-center justify-end h-full gap-3 relative">

                                                    {/* Count Label (floats above the bar) */}
                                                    <span className={`text-sm font-bold absolute -top-6 ${count > 0 ? 'text-blue-600' : 'text-gray-300'}`}>
                                                        {count}
                                                    </span>

                                                    {/* The structural Track/Bar wrapper */}
                                                    <div className="w-full h-full bg-gray-50 rounded-t-md relative flex items-end overflow-hidden border border-gray-100/50">

                                                        {/* The actual colored bar filling up from the bottom */}
                                                        <div
                                                            className={`w-full rounded-t-md transition-all duration-700 ease-out ${count > 0 ? 'bg-blue-500 shadow-[inset_0_2px_4px_rgba(255,255,255,0.3)]' : 'bg-transparent'}`}
                                                            style={{ height: `${percHeight}%` }}
                                                        ></div>
                                                    </div>

                                                    {/* Score Label Axis */}
                                                    <span className="text-xs font-semibold text-gray-500 tracking-wide uppercase">Score {score}</span>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>

                                {/* Responses List */}
                                <div>
                                    <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 border-t border-gray-100 pt-6">Student Responses ({r.responses?.length || 0})</h4>
                                    <div className="space-y-3">
                                        {r.responses?.map(resp => (
                                            <details key={resp.id} className="group bg-gray-50 border border-gray-200 rounded-lg">
                                                <summary className="px-4 py-3 font-medium text-gray-900 cursor-pointer list-none flex justify-between items-center group-open:border-b border-gray-200">
                                                    <div className="flex items-center gap-3">
                                                        {resp.student_name}
                                                        <span className="bg-white px-2 py-0.5 rounded text-xs font-bold border font-mono">
                                                            Score: {resp.ai_score}
                                                        </span>
                                                    </div>
                                                    <span className="text-gray-400 text-sm group-open:hidden">Show details</span>
                                                </summary>
                                                <div className="p-4 space-y-4">
                                                    <div>
                                                        <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Response</p>
                                                        <p className="text-gray-800 bg-white p-3 rounded border border-gray-100">{resp.response_text}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-semibold text-purple-600 uppercase mb-1">AI Feedback</p>
                                                        <p className="text-purple-900 bg-purple-50 p-3 rounded border border-purple-100">{resp.ai_feedback}</p>
                                                    </div>
                                                </div>
                                            </details>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Connected Users Modal */}
            {showUsersModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh]">
                        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <Users className="w-5 h-5 text-blue-600" /> Connected Students ({connectedUsers})
                            </h3>
                            <button onClick={() => setShowUsersModal(false)} className="text-gray-400 hover:text-gray-700">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto">
                            {connectedNames.length === 0 ? (
                                <p className="text-center text-gray-500 py-4">No students currently connected.</p>
                            ) : (
                                <ul className="space-y-3">
                                    {connectedNames.map((name, i) => (
                                        <li key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                                                {name.charAt(0).toUpperCase()}
                                            </div>
                                            <span className="font-medium text-gray-800">{name}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                        <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end">
                            <button
                                onClick={() => setShowUsersModal(false)}
                                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
};

export default SessionLive;
