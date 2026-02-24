import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api';
import { Send, CheckCircle2, Clock } from 'lucide-react';

const StudentActiveSession = () => {
    const { code } = useParams();
    const navigate = useNavigate();
    const [activeQuestions, setActiveQuestions] = useState([]);
    const [sessionInfo, setSessionInfo] = useState({ id: null });
    const [studentName, setStudentName] = useState('');
    const [responses, setResponses] = useState({}); // To hold drafts and submissions
    const [submittedStatus, setSubmittedStatus] = useState({}); // { q_id: { status: 'loading'|'done', score: 4, feedback: '' } }

    const [hasJoined, setHasJoined] = useState(false);
    const [isJoining, setIsJoining] = useState(true);

    useEffect(() => {
        let isMounted = true;

        const initializeSession = async () => {
            if (!sessionStorage.getItem('clientId')) {
                sessionStorage.setItem('clientId', Math.random().toString(36).substring(2) + Date.now().toString(36));
            }

            let sId = sessionStorage.getItem('activeSessionId');

            if (!sId) {
                try {
                    const res = await api.post(`/student/join/${code}`);
                    sId = res.data.session_id;
                    sessionStorage.setItem('activeSessionId', sId);
                } catch (error) {
                    sessionStorage.removeItem('activeSessionId');
                    if (isMounted) navigate('/');
                    return;
                }
            }

            if (isMounted) {
                setSessionInfo({ id: parseInt(sId, 10) });
                fetchActiveQuestions(parseInt(sId, 10));
                setIsJoining(false);
            }
        };

        initializeSession();

        // Polling for new questions every 3 seconds
        const interval = setInterval(() => {
            const sId = sessionInfo.id || sessionStorage.getItem('activeSessionId');
            if (sId) {
                fetchActiveQuestions(parseInt(sId, 10));
            }
        }, 3000);

        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, [code, navigate, sessionInfo.id]);

    const fetchActiveQuestions = async (sId) => {
        try {
            const res = await api.get(`/student/session/${sId}/active-questions`);
            setActiveQuestions(res.data);
        } catch (e) {
            if (e.response?.status === 404 || e.response?.status === 400) {
                sessionStorage.removeItem('activeSessionId');
                navigate('/');
            }
        }
    };

    useEffect(() => {
        if (!hasJoined || !sessionInfo.id) return;

        const wsUrl = import.meta.env.VITE_API_URL
            ? import.meta.env.VITE_API_URL.replace('http', 'ws')
            : 'ws://localhost:8000';

        const ws = new WebSocket(`${wsUrl}/api/student/ws/${sessionInfo.id}`);

        ws.onopen = () => {
            ws.send(JSON.stringify({ type: 'join', name: studentName }));
        };

        return () => {
            ws.close();
        };
    }, [hasJoined, sessionInfo.id, studentName]);

    const handleResponseChange = (qId, text) => {
        setResponses(prev => ({ ...prev, [qId]: text }));
    };

    const submitAnswer = async (qId) => {
        if (!responses[qId]?.trim()) {
            return;
        }

        if (!responses[qId]?.trim()) {
            return;
        }

        setSubmittedStatus(prev => ({ ...prev, [qId]: { status: 'loading' } }));

        try {
            const res = await api.post(`/student/session/${sessionInfo.id}/question/${qId}/submit`, {
                student_name: studentName.trim(),
                response_text: responses[qId]
            });

            setSubmittedStatus(prev => ({
                ...prev,
                [qId]: { status: 'done', score: res.data.score, feedback: res.data.feedback }
            }));
        } catch (e) {
            setSubmittedStatus(prev => {
                const next = { ...prev };
                delete next[qId];
                return next;
            });
            alert("Failed to submit. Please try again.");
        }
    };

    if (isJoining) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="animate-pulse flex flex-col items-center">
                    <div className="w-12 h-12 bg-blue-200 rounded-full mb-4"></div>
                    <div className="text-gray-500 font-medium">Joining session...</div>
                </div>
            </div>
        );
    }

    // Student Name Gate
    if (!hasJoined) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-8 text-center bg-blue-600 text-white">
                        <h1 className="text-3xl font-bold tracking-tight">Session {code}</h1>
                        <p className="mt-2 text-blue-100">Please enter your name to join the class</p>
                    </div>
                    <div className="p-8">
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            if (studentName.trim() !== '') {
                                setHasJoined(true);
                            }
                        }} className="space-y-6">
                            <div>
                                <label htmlFor="studentName" className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
                                <input
                                    type="text"
                                    id="studentName"
                                    value={studentName}
                                    onChange={(e) => setStudentName(e.target.value)}
                                    className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 p-3 border"
                                    placeholder="e.g. Jane Smith"
                                    required
                                    autoFocus
                                />
                            </div>
                            <button
                                type="submit"
                                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors font-medium shadow-sm transition"
                            >
                                Enter Session
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        );
    }

    // If no questions are currently active
    if (activeQuestions.length === 0) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="max-w-md w-full text-center space-y-6">
                    <div className="mx-auto w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-6 animate-pulse">
                        <Clock className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-semibold text-gray-900">Waiting for next question</h2>
                    <p className="text-gray-500">The instructor has not launched any questions yet. This page will update automatically when they do.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10 shadow-sm">
                <div className="max-w-3xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-lg font-bold text-gray-900">Live Session: {code}</h1>
                        <p className="text-sm text-gray-500">Answer the active questions below.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold shadow-inner">
                            {studentName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Student</p>
                            <p className="text-sm font-medium text-gray-900">{studentName}</p>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-3xl mx-auto p-6 space-y-8 mt-6">

                {activeQuestions.map(q => {
                    const subStatus = submittedStatus[q.id];
                    const isDone = subStatus?.status === 'done';
                    const isLoading = subStatus?.status === 'loading';

                    return (
                        <div key={q.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden list-anim">
                            <div className="p-6 border-b border-gray-100">
                                <h2 className="text-xl font-medium text-gray-900 leading-relaxed">{q.text}</h2>
                            </div>

                            <div className="p-6 bg-gray-50">
                                {isDone ? (
                                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                                        <div className="flex items-center gap-3 text-green-700 font-medium mb-4">
                                            <CheckCircle2 className="w-6 h-6" /> Response recorded and graded!
                                        </div>
                                        <div className="bg-white p-4 rounded-lg border border-gray-200">
                                            <span className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1 block">Your Answer</span>
                                            <p className="text-gray-800">{responses[q.id]}</p>
                                        </div>

                                        <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-5 rounded-lg border border-blue-100 shadow-inner mt-4">
                                            <div className="flex items-start justify-between gap-6">
                                                <div className="flex-1">
                                                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 mb-2 block flex items-center gap-2">
                                                        AI Teaching Assistant
                                                    </span>
                                                    <p className="text-indigo-900 font-medium leading-relaxed">{subStatus.feedback}</p>
                                                </div>
                                                <div className="text-center bg-white py-2 px-4 rounded-lg shadow-sm border border-indigo-100 flex flex-col items-center justify-center">
                                                    <span className="text-sm font-bold text-gray-500 uppercase">Score</span>
                                                    <span className="text-3xl font-extrabold text-indigo-600">{subStatus.score}<span className="text-lg text-gray-400">/4</span></span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <textarea
                                            disabled={isLoading}
                                            rows={5}
                                            placeholder="Type your answer here..."
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow resize-y shadow-sm text-gray-800 disabled:opacity-50 disabled:bg-gray-100"
                                            value={responses[q.id] || ''}
                                            onChange={e => handleResponseChange(q.id, e.target.value)}
                                        ></textarea>

                                        <div className="flex justify-end">
                                            <button
                                                onClick={() => submitAnswer(q.id)}
                                                disabled={isLoading || !(responses[q.id] || '').trim()}
                                                className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {isLoading ? (
                                                    <>Evaluating with AI...</>
                                                ) : (
                                                    <>
                                                        <Send className="w-4 h-4" /> Submit Answer
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </main>
        </div>
    );
};

export default StudentActiveSession;
