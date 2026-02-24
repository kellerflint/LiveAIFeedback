import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import { PlusCircle, PlayCircle, LogOut, Trash2, Search, X, Bot } from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import Toast from '../../components/Toast';

const AdminDashboard = () => {
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const { logout } = React.useContext(AuthContext);
    const navigate = useNavigate();

    // New Question Form State
    const [newQuestion, setNewQuestion] = useState({ text: '', grading_criteria: '' });
    const [showQForm, setShowQForm] = useState(false);

    // AI Model Selector
    const [selectedModel, setSelectedModel] = useState('meta-llama/llama-3-8b-instruct:free');
    const [showModelModal, setShowModelModal] = useState(false);
    const [openRouterModels, setOpenRouterModels] = useState([]);
    const [modelsLoading, setModelsLoading] = useState(false);
    const [modelSearch, setModelSearch] = useState('');

    // Toast State
    const [toast, setToast] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const qRes = await api.get('/admin/questions');
            setQuestions(qRes.data);
        } catch (error) {
            console.error("Error fetching data", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchModels = async () => {
        if (openRouterModels.length > 0) return; // Cache
        try {
            setModelsLoading(true);
            const res = await fetch('https://openrouter.ai/api/v1/models');
            const data = await res.json();
            setOpenRouterModels(data.data || []);
        } catch (e) {
            console.error("Failed to load models", e);
            setToast({ message: "Failed to load OpenRouter registry", type: 'error' });
        } finally {
            setModelsLoading(false);
        }
    };

    const handleCreateQuestion = async (e) => {
        e.preventDefault();
        try {
            const res = await api.post('/admin/questions', newQuestion);
            setQuestions([res.data, ...questions]);
            setNewQuestion({ text: '', grading_criteria: '' });
            setShowQForm(false);
            setToast({ message: "Question created successfully", type: 'success' });
        } catch (error) {
            setToast({ message: "Failed to create question", type: 'error' });
        }
    };

    const handleDeleteQuestion = async (id) => {
        if (!window.confirm("Are you sure you want to delete this question? This will delete all student responses attached to it.")) return;

        try {
            await api.delete(`/admin/questions/${id}`);
            setQuestions(questions.filter(q => q.id !== id));
            setToast({ message: "Question deleted successfully", type: 'success' });
        } catch (error) {
            setToast({ message: "Failed to delete question", type: 'error' });
        }
    };

    const startSession = async () => {
        try {
            // The endpoint returns a primitive string for the code when doing rapid creation, 
            // but the test expects an object. Let's fix the schema but also be resilient here.
            const res = await api.post('/admin/sessions', { ai_model: selectedModel });

            // Check if backend returned string directly or an object with a code property
            const code = typeof res.data === 'string' ? res.data : res.data?.code;

            if (!code) throw new Error("Could not parse session code from response");
            navigate(`/admin/session/${code}`);
        } catch (error) {
            console.error(error);
            setToast({ message: "Failed to create session", type: 'error' });
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-12">
            <nav className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center sticky top-0 z-10">
                <h1 className="text-xl font-bold text-gray-900 tracking-tight">AI Feedback Admin</h1>
                <div className="flex gap-4 items-center">
                    <div className="flex items-center gap-2">
                        <label className="text-sm font-medium text-gray-700">AI Model:</label>
                        <button
                            onClick={() => { setShowModelModal(true); fetchModels(); }}
                            className="text-sm border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 px-3 py-2 bg-white flex items-center gap-2 w-[220px]"
                            title={selectedModel}
                        >
                            <Bot className="w-4 h-4 text-gray-500 shrink-0" />
                            <span className="truncate flex-1 text-left">{selectedModel}</span>
                        </button>
                    </div>
                    <button
                        onClick={startSession}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-sm font-medium"
                    >
                        <PlayCircle className="w-5 h-5" />
                        Start New Session
                    </button>
                    <button onClick={() => { logout(); navigate('/admin/login') }} className="p-2 text-gray-500 hover:text-gray-900 transition ml-2">
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>
            </nav>

            <main className="max-w-6xl mx-auto px-6 mt-8">
                <div className="flex justify-between items-end mb-6">
                    <h2 className="text-2xl font-semibold text-gray-900">Question Bank</h2>
                    <button
                        onClick={() => setShowQForm(!showQForm)}
                        className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
                    >
                        <PlusCircle className="w-5 h-5" /> New Question
                    </button>
                </div>

                {showQForm && (
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-8 animate-in fade-in slide-in-from-top-4">
                        <h3 className="text-lg font-medium mb-4">Create New Question</h3>
                        <form onSubmit={handleCreateQuestion} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Question Text</label>
                                <textarea
                                    required
                                    rows={2}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    value={newQuestion.text}
                                    onChange={e => setNewQuestion({ ...newQuestion, text: e.target.value })}
                                    placeholder="e.g. What is the powerhouse of the cell?"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Grading Criteria (for AI)</label>
                                <textarea
                                    required
                                    rows={3}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    value={newQuestion.grading_criteria}
                                    onChange={e => setNewQuestion({ ...newQuestion, grading_criteria: e.target.value })}
                                    placeholder="e.g. 4 pts for 'Mitochondria'. 1 pt for any other organelle."
                                />
                            </div>
                            <div className="flex justify-end gap-3">
                                <button type="button" onClick={() => setShowQForm(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800">Save Question</button>
                            </div>
                        </form>
                    </div>
                )}

                {loading ? (
                    <div className="text-center py-12 text-gray-500">Loading library...</div>
                ) : (
                    <div className="bg-white border text-left border-gray-200 rounded-xl overflow-hidden shadow-sm">
                        {questions.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">No questions in your bank yet. Create one!</div>
                        ) : (
                            <ul className="divide-y divide-gray-200">
                                {questions.map(q => (
                                    <li key={q.id} className="p-6 hover:bg-gray-50 transition relative group">
                                        <div className="flex justify-between items-start mb-2">
                                            <p className="font-medium text-gray-900 text-lg pr-8">{q.text}</p>
                                            <button
                                                onClick={() => handleDeleteQuestion(q.id)}
                                                className="absolute right-6 top-6 text-gray-400 hover:text-red-500 transition opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-red-50"
                                                title="Delete Question"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                        <div className="bg-gray-100 p-3 rounded-md border border-gray-200 text-sm font-mono text-gray-700 whitespace-pre-wrap">
                                            <span className="font-semibold text-gray-500 uppercase text-xs tracking-wider block mb-1">AI Criteria</span>
                                            {q.grading_criteria}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}
            </main>

            {/* Model Search Modal */}
            {showModelModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
                        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <Bot className="w-5 h-5 text-blue-600" /> Select AI Model
                            </h3>
                            <button onClick={() => setShowModelModal(false)} className="text-gray-400 hover:text-gray-700">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-4 border-b border-gray-200">
                            <div className="relative">
                                <Search className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
                                <input
                                    type="text"
                                    placeholder="Search models... (e.g. gpt-4, claude, free)"
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    value={modelSearch}
                                    onChange={(e) => setModelSearch(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
                            {modelsLoading ? (
                                <div className="text-center text-gray-500 py-12">Loading registry...</div>
                            ) : (
                                <div className="grid gap-3">
                                    <div
                                        onClick={() => { setSelectedModel('test-model'); setShowModelModal(false); }}
                                        className={`p-4 rounded-lg border cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition bg-white ${selectedModel === 'test-model' ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-200'}`}
                                    >
                                        <div className="font-semibold text-gray-900">test-model</div>
                                        <div className="text-xs text-gray-500 mt-1">Mock responses for E2E testing (Free)</div>
                                    </div>
                                    {openRouterModels
                                        .filter(m => m.id.toLowerCase().includes(modelSearch.toLowerCase()) || (m.name && m.name.toLowerCase().includes(modelSearch.toLowerCase())))
                                        .map(m => (
                                            <div
                                                key={m.id}
                                                onClick={() => { setSelectedModel(m.id); setShowModelModal(false); }}
                                                className={`p-4 rounded-lg border cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition bg-white ${selectedModel === m.id ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-200'}`}
                                            >
                                                <div className="font-semibold text-gray-900">{m.name}</div>
                                                <div className="text-sm font-mono text-gray-500 mt-1">{m.id}</div>
                                                <div className="text-xs text-blue-600 mt-2 flex items-center gap-4">
                                                    <span>Prompt: ${(m.pricing?.prompt * 1000000 || 0).toFixed(2)}/M</span>
                                                    <span>Completion: ${(m.pricing?.completion * 1000000 || 0).toFixed(2)}/M</span>
                                                </div>
                                            </div>
                                        ))
                                    }
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
};

export default AdminDashboard;
