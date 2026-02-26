import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api, { getBaseUrl } from '../../api';
import { Play, Square, Users, Copy, ArrowLeft, X, Power, PlusCircle, AlertCircle, Download, FolderOpen, Search, StopCircle } from 'lucide-react';
import Toast from '../../components/Toast';
import ConnectedUsersModal from '../../components/admin/ConnectedUsersModal';
import QuestionModal from '../../components/admin/QuestionModal';

const SessionLive = () => {
    const { id: sessionCode } = useParams();
    const navigate = useNavigate();
    const [session, setSession] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [collections, setCollections] = useState([]);
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState(null);
    const [connectedUsers, setConnectedUsers] = useState(0);
    const [connectedNames, setConnectedNames] = useState([]);
    const [showUsersModal, setShowUsersModal] = useState(false);
    const [showNewQuestionModal, setShowNewQuestionModal] = useState(false);

    // Collection filter for sidebar
    const [selectedCollectionId, setSelectedCollectionId] = useState(null);
    const [collectionSearch, setCollectionSearch] = useState('');

    useEffect(() => {
        fetchInitialData();
    }, [sessionCode]);

    useEffect(() => {
        if (!session) return;

        const sseUrl = `${getBaseUrl()}/api/admin/sessions/${session.id}/live-results`;
        const sse = new EventSource(sseUrl);

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
            const [sessRes, qRes, cRes] = await Promise.all([
                api.get(`/admin/sessions/${sessionCode}`),
                api.get('/admin/questions'),
                api.get('/admin/collections')
            ]);
            setSession(sessRes.data);
            setQuestions(qRes.data);
            setCollections(cRes.data);
            // Default to first collection if available
            if (cRes.data.length > 0) {
                setSelectedCollectionId(cRes.data[0].id);
            }
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

    const launchCollection = async () => {
        if (!session || !selectedCollectionId) return;
        try {
            const res = await api.post(`/admin/sessions/${session.id}/launch-collection/${selectedCollectionId}`);
            pollResults();
            setToast({ message: `Launched ${res.data.launched} question(s) to students`, type: 'success' });
        } catch (e) {
            setToast({ message: e.response?.data?.detail || "Failed to launch collection", type: 'error' });
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

    const closeAllQuestions = async () => {
        if (!session) return;
        if (!window.confirm("Close all open questions?")) return;
        try {
            await api.put(`/admin/sessions/${session.id}/close-all-questions`);
            pollResults();
            setToast({ message: "All questions closed", type: 'success' });
        } catch (e) {
            setToast({ message: "Failed to close questions", type: 'error' });
        }
    };

    const downloadCSV = async () => {
        if (!session) return;
        try {
            const res = await api.get(`/admin/sessions/${session.id}/export-csv`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const a = document.createElement('a');
            a.href = url;
            a.download = `session_${session.id}_results.csv`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            setToast({ message: "CSV downloaded!", type: 'success' });
        } catch (e) {
            setToast({ message: "Failed to download CSV", type: 'error' });
        }
    };

    const handleCreateQuestion = async (questionData) => {
        try {
            const res = await api.post('/admin/questions', questionData);
            setQuestions([res.data, ...questions]);
            setShowNewQuestionModal(false);
            setToast({ message: "Question added to bank", type: 'success' });
            // Refresh collections to update counts
            const cRes = await api.get('/admin/collections');
            setCollections(cRes.data);
        } catch (error) {
            setToast({ message: "Failed to create question", type: 'error' });
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

    // Filtered collections for search dropdown
    const filteredCollections = collections.filter(c =>
        c.name.toLowerCase().includes(collectionSearch.toLowerCase())
    );

    // Questions for the currently selected collection
    const sidebarQuestions = selectedCollectionId
        ? questions.filter(q => q.collection_id === selectedCollectionId)
        : questions;

    const hasOpenQuestions = results.some(r => r.status === 'open');

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
                            data-testid="end-session-button"
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
                    <div
                        data-testid="session-code-display"
                        className="bg-gray-100 text-gray-800 px-4 py-2 rounded-lg font-mono font-bold text-lg border border-gray-200 flex items-center gap-3"
                    >
                        {sessionCode}
                        <button onClick={copyLink} className="text-gray-400 hover:text-blue-600"><Copy className="w-4 h-4" /></button>
                    </div>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                {/* Left Sidebar: Collection-based Question Library */}
                {session?.status === 'active' && (
                    <div className="w-1/3 bg-white border-r border-gray-200 flex flex-col h-full overflow-hidden">
                        {/* Sidebar Header with Collection Dropdown */}
                        <div className="p-4 border-b border-gray-200 bg-gray-50 space-y-3">
                            <div className="flex justify-between items-center">
                                <h2 className="font-semibold text-gray-900">Question Library</h2>
                                <button
                                    onClick={() => setShowNewQuestionModal(true)}
                                    data-testid="new-question-button"
                                    className="text-blue-600 hover:text-blue-700 transition"
                                    title="Create New Question"
                                >
                                    <PlusCircle className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Searchable Collection Dropdown */}
                            <div className="relative">
                                <div className="relative">
                                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <select
                                        value={selectedCollectionId || ''}
                                        onChange={e => setSelectedCollectionId(e.target.value ? Number(e.target.value) : null)}
                                        className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none cursor-pointer"
                                    >
                                        <option value="">All Questions</option>
                                        {filteredCollections.map(c => (
                                            <option key={c.id} value={c.id}>
                                                {c.name} ({c.question_count})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Launch All Button */}
                            {selectedCollectionId && sidebarQuestions.length > 0 && (
                                <button
                                    onClick={launchCollection}
                                    data-testid="launch-collection-button"
                                    className="w-full py-2 bg-green-50 text-green-700 font-medium rounded-lg hover:bg-green-100 transition flex items-center justify-center gap-2 text-sm border border-green-200"
                                >
                                    <Play className="w-4 h-4" /> Launch Entire Collection ({sidebarQuestions.length})
                                </button>
                            )}
                        </div>

                        {/* Question List */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {sidebarQuestions.length === 0 ? (
                                <div className="text-center text-gray-400 text-sm mt-8">
                                    {selectedCollectionId ? 'No questions in this collection.' : 'No questions yet.'}
                                </div>
                            ) : (
                                sidebarQuestions.map(q => (
                                    <div key={q.id} className="border border-gray-200 rounded-lg p-4 bg-white hover:border-blue-300 transition shadow-sm">
                                        <p className="text-gray-900 font-medium mb-1 whitespace-pre-wrap">{q.text}</p>
                                        {q.collection_name && (
                                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full inline-block mb-3">
                                                {q.collection_name}
                                            </span>
                                        )}
                                        <button
                                            onClick={() => launchQuestion(q.id)}
                                            data-testid={`launch-question-button-${q.id}`}
                                            className="w-full py-2 bg-blue-50 text-blue-700 font-medium rounded-md hover:bg-blue-100 transition flex items-center justify-center gap-2 text-sm"
                                        >
                                            <Play className="w-4 h-4" /> Launch to Students
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {/* Right Area: Results */}
                <div className={`${session?.status === 'active' ? 'w-2/3' : 'w-full'} flex flex-col h-full overflow-hidden bg-gray-50`}>
                    <div className="p-4 border-b border-gray-200 bg-white shadow-sm z-10 flex justify-between items-center">
                        <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                            <Users className="w-5 h-5 text-gray-400" />
                            Live Results
                        </h2>
                        <div className="flex items-center gap-2">
                            {hasOpenQuestions && session?.status === 'active' && (
                                <button
                                    onClick={closeAllQuestions}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 text-orange-700 text-sm font-medium rounded-lg hover:bg-orange-100 transition border border-orange-200"
                                >
                                    <StopCircle className="w-4 h-4" /> Close All
                                </button>
                            )}
                            {results.length > 0 && (
                                <button
                                    onClick={downloadCSV}
                                    data-testid="download-csv-button"
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition border border-gray-200"
                                >
                                    <Download className="w-4 h-4" /> Download CSV
                                </button>
                            )}
                        </div>
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
                                        <h3 className="text-xl font-medium text-gray-900 whitespace-pre-wrap">{r.text}</h3>
                                    </div>
                                    {r.status === 'open' && (
                                        <button
                                            onClick={() => closeQuestion(r.id)}
                                            data-testid={`close-question-button-${r.id}`}
                                            className="px-4 py-2 bg-red-50 text-red-600 rounded-lg font-medium hover:bg-red-100 flex items-center gap-2 text-sm"
                                        >
                                            <Square className="w-4 h-4" /> Close
                                        </button>
                                    )}
                                </div>

                                {/* Histogram */}
                                <div className="mb-8">
                                    <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">AI Score Distribution</h4>

                                    <div className="flex items-end h-40 gap-4 mt-8 pb-6 border-b border-gray-100">
                                        {[1, 2, 3, 4].map(score => {
                                            const count = r.responses?.filter(resp => Number(resp.ai_score) === Number(score)).length || 0;
                                            const counts = [1, 2, 3, 4].map(s => r.responses?.filter(resp => Number(resp.ai_score) === Number(s)).length || 0);
                                            const maxPeak = Math.max(...counts, 5);
                                            const percHeight = Math.max((count / maxPeak) * 100, 2);

                                            return (
                                                <div key={score} className="flex-1 flex flex-col items-center justify-end h-full gap-3 relative">
                                                    <span className={`text-sm font-bold absolute -top-6 ${count > 0 ? 'text-blue-600' : 'text-gray-300'}`}>
                                                        {count}
                                                    </span>
                                                    <div className="w-full h-full bg-gray-50 rounded-t-md relative flex items-end overflow-hidden border border-gray-100/50">
                                                        <div
                                                            className={`w-full rounded-t-md transition-all duration-700 ease-out ${count > 0 ? 'bg-blue-500 shadow-[inset_0_2px_4px_rgba(255,255,255,0.3)]' : 'bg-transparent'}`}
                                                            style={{ height: `${percHeight}%` }}
                                                        ></div>
                                                    </div>
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
                                                <summary
                                                    data-testid={`student-response-summary-${resp.student_name}`}
                                                    className="px-4 py-3 font-medium text-gray-900 cursor-pointer list-none flex justify-between items-center group-open:border-b border-gray-200"
                                                >
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
                                                        <p className="text-gray-800 bg-white p-3 rounded border border-gray-100 whitespace-pre-wrap">{resp.response_text}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-semibold text-purple-600 uppercase mb-1">AI Feedback</p>
                                                        <p className="text-purple-900 bg-purple-50 p-3 rounded border border-purple-100 whitespace-pre-wrap">{resp.ai_feedback}</p>
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

            <ConnectedUsersModal
                show={showUsersModal}
                onClose={() => setShowUsersModal(false)}
                connectedUsers={connectedUsers}
                connectedNames={connectedNames}
            />

            {/* Universal Question Modal */}
            <QuestionModal
                show={showNewQuestionModal}
                onClose={() => setShowNewQuestionModal(false)}
                onSave={handleCreateQuestion}
                collections={collections}
            />

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
};

export default SessionLive;
