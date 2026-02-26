import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import { PlusCircle, PlayCircle, LogOut, Trash2, Search, X, Bot, FolderOpen, Pencil } from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import Toast from '../../components/Toast';
import ModelSearchModal from '../../components/admin/ModelSearchModal';
import QuestionModal from '../../components/admin/QuestionModal';
import DeleteCollectionModal from '../../components/admin/DeleteCollectionModal';

const AdminDashboard = () => {
    const [questions, setQuestions] = useState([]);
    const [sessions, setSessions] = useState([]);
    const [collections, setCollections] = useState([]);
    const [loading, setLoading] = useState(true);
    const { logout } = React.useContext(AuthContext);
    const navigate = useNavigate();

    // Collection filter
    const [filterCollectionId, setFilterCollectionId] = useState(null); // null = All

    // Collection management
    const [newCollectionName, setNewCollectionName] = useState('');
    const [newCollectionNameError, setNewCollectionNameError] = useState('');
    const [renamingCollection, setRenamingCollection] = useState(null);
    const [renameText, setRenameText] = useState('');
    const [renameTextError, setRenameTextError] = useState('');

    // Delete collection modal
    const [deleteCollectionTarget, setDeleteCollectionTarget] = useState(null); // collection object

    // Universal Question Modal State
    const [showQuestionModal, setShowQuestionModal] = useState(false);
    const [editingQuestion, setEditingQuestion] = useState(null);

    // AI Model Selector
    const [selectedModel, setSelectedModel] = useState(() => localStorage.getItem('preferredAiModel') || '');
    const [showModelModal, setShowModelModal] = useState(false);
    const [openRouterModels, setOpenRouterModels] = useState([]);
    const [modelsLoading, setModelsLoading] = useState(false);
    const [modelSearch, setModelSearch] = useState('');
    const [pendingSessionStart, setPendingSessionStart] = useState(false);

    // Toast State
    const [toast, setToast] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [qRes, sRes, cRes] = await Promise.all([
                api.get('/admin/questions'),
                api.get('/admin/sessions'),
                api.get('/admin/collections')
            ]);
            setQuestions(qRes.data);
            setSessions(sRes.data);
            setCollections(cRes.data);
        } catch (error) {
            console.error("Error fetching data", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchModels = async () => {
        if (openRouterModels.length > 0) return;
        try {
            setModelsLoading(true);
            const res = await api.get('/admin/models');
            setOpenRouterModels(res.data || []);
        } catch (e) {
            console.error("Failed to load models", e);
            setToast({ message: "Failed to load OpenRouter registry", type: 'error' });
        } finally {
            setModelsLoading(false);
        }
    };

    // ===== Collection Management =====
    const handleCreateCollection = async (e) => {
        e.preventDefault();
        if (!newCollectionName.trim()) {
            setNewCollectionNameError('Collection name cannot be empty.');
            return;
        }
        setNewCollectionNameError('');
        try {
            const res = await api.post('/admin/collections', { name: newCollectionName.trim() });
            setCollections([...collections, res.data]);
            setNewCollectionName('');
            setToast({ message: "Collection created", type: 'success' });
        } catch (e) {
            setToast({ message: "Failed to create collection", type: 'error' });
        }
    };

    const handleRenameCollection = async (id) => {
        if (!renameText.trim()) {
            setRenameTextError('Name cannot be empty.');
            return;
        }
        setRenameTextError('');
        try {
            await api.put(`/admin/collections/${id}`, { name: renameText.trim() });
            setCollections(collections.map(c => c.id === id ? { ...c, name: renameText.trim() } : c));
            setRenamingCollection(null);
            setRenameText('');
            setToast({ message: "Collection renamed", type: 'success' });
        } catch (e) {
            setToast({ message: "Failed to rename collection", type: 'error' });
        }
    };

    const handleDeleteCollection = (id) => {
        const collection = collections.find(c => c.id === id);
        if (!collection) return;
        setDeleteCollectionTarget(collection);
    };

    const handleDeleteCollectionConfirm = async ({ action, targetId }) => {
        const id = deleteCollectionTarget.id;
        const otherCollections = collections.filter(c => c.id !== id);
        setDeleteCollectionTarget(null);

        if (action === 'delete') {
            try {
                await api.delete(`/admin/collections/${id}?action=delete`);
                setCollections(collections.filter(c => c.id !== id));
                setQuestions(questions.filter(q => q.collection_id !== id));
                if (filterCollectionId === id) setFilterCollectionId(null);
                setToast({ message: "Collection and questions deleted", type: 'success' });
            } catch (e) {
                setToast({ message: "Failed to delete collection", type: 'error' });
            }
        } else if (action === 'move') {
            const target = otherCollections.find(c => c.id === targetId);
            if (!target) {
                setToast({ message: "Target collection not found", type: 'error' });
                return;
            }
            try {
                await api.delete(`/admin/collections/${id}?action=move&target_id=${target.id}`);
                setCollections(collections.filter(c => c.id !== id));
                setQuestions(questions.map(q => q.collection_id === id ? { ...q, collection_id: target.id, collection_name: target.name } : q));
                if (filterCollectionId === id) setFilterCollectionId(target.id);
                setToast({ message: `Questions moved to "${target.name}"`, type: 'success' });
            } catch (e) {
                setToast({ message: "Failed to move questions", type: 'error' });
            }
        }
    };

    // ===== Question Management =====
    const handleSaveQuestion = async (questionData) => {
        try {
            if (editingQuestion) {
                const res = await api.put(`/admin/questions/${editingQuestion.id}`, questionData);
                setQuestions(questions.map(q => q.id === editingQuestion.id ? res.data : q));
                setToast({ message: "Question updated successfully", type: 'success' });
            } else {
                const res = await api.post('/admin/questions', questionData);
                setQuestions([res.data, ...questions]);
                setToast({ message: "Question created successfully", type: 'success' });
            }
            setShowQuestionModal(false);
            setEditingQuestion(null);
            // Refresh collections to update question counts
            const cRes = await api.get('/admin/collections');
            setCollections(cRes.data);
        } catch (error) {
            setToast({ message: editingQuestion ? "Failed to update question" : "Failed to create question", type: 'error' });
        }
    };

    const handleDeleteQuestion = async (id) => {
        if (!window.confirm("Are you sure you want to delete this question? This will delete all student responses attached to it.")) return;
        try {
            await api.delete(`/admin/questions/${id}`);
            setQuestions(questions.filter(q => q.id !== id));
            const cRes = await api.get('/admin/collections');
            setCollections(cRes.data);
            setToast({ message: "Question deleted successfully", type: 'success' });
        } catch (error) {
            setToast({ message: "Failed to delete question", type: 'error' });
        }
    };

    // ===== Session Management =====
    const handleEndSession = async (id) => {
        if (!window.confirm("End this session? Students will be disconnected.")) return;
        try {
            await api.put(`/admin/sessions/${id}/end`);
            setSessions(sessions.map(s => s.id === id ? { ...s, status: 'closed' } : s));
            setToast({ message: "Session ended", type: 'success' });
        } catch (e) {
            setToast({ message: "Failed to end session", type: 'error' });
        }
    };

    const handleDeleteSession = async (id) => {
        if (!window.confirm("Delete this session entirely? This cannot be undone.")) return;
        try {
            await api.delete(`/admin/sessions/${id}`);
            setSessions(sessions.filter(s => s.id !== id));
            setToast({ message: "Session deleted", type: 'success' });
        } catch (e) {
            setToast({ message: "Failed to delete session", type: 'error' });
        }
    };

    const handleModelSelect = (model) => {
        setSelectedModel(model);
        localStorage.setItem('preferredAiModel', model);
        if (pendingSessionStart) {
            setPendingSessionStart(false);
            startSessionImpl(model);
        }
    };

    const startSessionImpl = async (modelToUse) => {
        try {
            const res = await api.post('/admin/sessions', { ai_model: modelToUse });
            const code = typeof res.data === 'string' ? res.data : res.data?.code;
            if (!code) throw new Error("Could not parse session code from response");
            navigate(`/admin/session/${code}`);
        } catch (error) {
            console.error(error);
            setToast({ message: "Failed to create session", type: 'error' });
        }
    };

    const startSession = async () => {
        if (!selectedModel) {
            setPendingSessionStart(true);
            setShowModelModal(true);
            fetchModels();
            setToast({ message: "Please select an AI model to continue", type: 'info' });
            return;
        }
        await startSessionImpl(selectedModel);
    };

    const filteredQuestions = filterCollectionId
        ? questions.filter(q => q.collection_id === filterCollectionId)
        : questions;

    return (
        <div className="min-h-screen bg-gray-50 pb-12">
            <nav className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center sticky top-0 z-10">
                <h1 className="text-xl font-bold text-gray-900 tracking-tight">AI Feedback Admin</h1>
                <div className="flex gap-4 items-center">
                    <div className="flex items-center gap-2">
                        <label className="text-sm font-medium text-gray-700">AI Model:</label>
                        <button
                            onClick={() => { setShowModelModal(true); fetchModels(); }}
                            disabled={!!sessions.find(s => s.status === 'active')}
                            className={`text-sm border border-gray-300 rounded-lg shadow-sm px-3 py-2 flex items-center gap-2 w-[220px] ${sessions.find(s => s.status === 'active') ? 'bg-gray-100 opacity-60 cursor-not-allowed' : 'bg-white hover:bg-gray-50'}`}
                            title={selectedModel || "Select Model"}
                        >
                            <Bot className="w-4 h-4 text-gray-500 shrink-0" />
                            <span className="truncate flex-1 text-left">{selectedModel || "Select an AI Model..."}</span>
                        </button>
                    </div>
                    {sessions.find(s => s.status === 'active') ? (
                        <button
                            onClick={() => navigate(`/admin/session/${sessions.find(s => s.status === 'active').code}`)}
                            data-testid="open-active-session-button"
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition shadow-sm font-medium"
                        >
                            <PlayCircle className="w-5 h-5" />
                            Open Active Session
                        </button>
                    ) : (
                        <button
                            onClick={startSession}
                            data-testid="start-session-button"
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-sm font-medium"
                        >
                            <PlayCircle className="w-5 h-5" />
                            Start New Session
                        </button>
                    )}
                    <button onClick={() => { logout(); navigate('/admin/login') }} className="p-2 text-gray-500 hover:text-gray-900 transition ml-2">
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>
            </nav>

            <main className="max-w-6xl mx-auto px-6 mt-8">
                {/* Collection Management Section */}
                <div className="mb-8">
                    <h2 className="text-2xl font-semibold text-gray-900 mb-4">Collections</h2>
                    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
                        <div className="flex flex-wrap gap-2 items-center mb-4">
                            <button
                                onClick={() => setFilterCollectionId(null)}
                                className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${filterCollectionId === null ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                            >
                                All ({questions.length})
                            </button>
                            {collections.map(c => (
                                <div key={c.id} className="flex items-center gap-1 group">
                                    {renamingCollection === c.id ? (
                                        <form onSubmit={(e) => { e.preventDefault(); handleRenameCollection(c.id); }} className="flex flex-col gap-1">
                                            <div className="flex items-center gap-1">
                                                <input
                                                    type="text"
                                                    value={renameText}
                                                    onChange={e => { setRenameText(e.target.value); setRenameTextError(''); }}
                                                    className={`px-2 py-1 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 w-32 ${renameTextError ? 'border-red-400' : 'border-blue-300'}`}
                                                    autoFocus
                                                    onBlur={() => { setRenamingCollection(null); setRenameTextError(''); }}
                                                />
                                            </div>
                                            {renameTextError && (
                                                <p className="text-xs text-red-500 pl-0.5">{renameTextError}</p>
                                            )}
                                        </form>
                                    ) : (
                                        <button
                                            onClick={() => setFilterCollectionId(c.id)}
                                            className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${filterCollectionId === c.id ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                                        >
                                            <FolderOpen className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
                                            {c.name} ({c.question_count})
                                        </button>
                                    )}
                                    {c.id !== 1 && (
                                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition">
                                            <button
                                                onClick={() => { setRenamingCollection(c.id); setRenameText(c.name); }}
                                                className="p-1 text-gray-400 hover:text-blue-600 rounded"
                                                title="Rename"
                                            >
                                                <Pencil className="w-3 h-3" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteCollection(c.id)}
                                                className="p-1 text-gray-400 hover:text-red-500 rounded"
                                                title="Delete Collection"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                        <form onSubmit={handleCreateCollection} className="flex flex-col gap-1.5">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newCollectionName}
                                    onChange={e => { setNewCollectionName(e.target.value); setNewCollectionNameError(''); }}
                                    placeholder="New collection name..."
                                    data-testid="new-collection-name-input"
                                    className={`px-3 py-2 border rounded-lg text-sm flex-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${newCollectionNameError ? 'border-red-400 focus:ring-red-400 focus:border-red-400' : 'border-gray-300'}`}
                                />
                                <button
                                    type="submit"
                                    data-testid="add-collection-button"
                                    className="px-4 py-2 bg-blue-50 text-blue-700 text-sm font-medium rounded-lg hover:bg-blue-100 transition flex items-center gap-1.5"
                                >
                                    <PlusCircle className="w-4 h-4" /> Add
                                </button>
                            </div>
                            {newCollectionNameError && (
                                <p className="text-xs text-red-500 pl-1">{newCollectionNameError}</p>
                            )}
                        </form>
                    </div>
                </div>

                {/* Question Bank */}
                <div className="flex justify-between items-end mb-6">
                    <h2 className="text-2xl font-semibold text-gray-900">
                        Question Bank
                        {filterCollectionId && collections.find(c => c.id === filterCollectionId) && (
                            <span className="text-base text-gray-500 font-normal ml-2">
                                — {collections.find(c => c.id === filterCollectionId)?.name}
                            </span>
                        )}
                    </h2>
                    <button
                        onClick={() => { setEditingQuestion(null); setShowQuestionModal(true); }}
                        data-testid="new-question-button"
                        className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
                    >
                        <PlusCircle className="w-5 h-5" /> New Question
                    </button>
                </div>

                {loading ? (
                    <div className="text-center py-12 text-gray-500">Loading library...</div>
                ) : (
                    <div className="bg-white border text-left border-gray-200 rounded-xl overflow-hidden shadow-sm">
                        {filteredQuestions.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">
                                {filterCollectionId ? 'No questions in this collection.' : 'No questions in your bank yet. Create one!'}
                            </div>
                        ) : (
                            <ul className="divide-y divide-gray-200">
                                {filteredQuestions.map(q => (
                                    <li key={q.id} data-testid={`question-card-${q.id}`} className="p-6 hover:bg-gray-50 transition relative group">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <p className="font-medium text-gray-900 text-lg pr-16">{q.text}</p>
                                                {q.collection_name && (
                                                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full mt-1 inline-block">
                                                        {q.collection_name}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="absolute right-6 top-6 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition">
                                                <button
                                                    onClick={() => { setEditingQuestion(q); setShowQuestionModal(true); }}
                                                    className="text-gray-400 hover:text-blue-600 transition p-1 rounded-md hover:bg-blue-50"
                                                    title="Edit Question"
                                                >
                                                    <Pencil className="w-5 h-5" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteQuestion(q.id)}
                                                    data-testid={`delete-question-button-${q.id}`}
                                                    className="text-gray-400 hover:text-red-500 transition p-1 rounded-md hover:bg-red-50"
                                                    title="Delete Question"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </div>
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

                <div className="mt-12 mb-6 border-t border-gray-200 pt-10">
                    <h2 className="text-2xl font-semibold text-gray-900">Session History</h2>
                </div>

                {loading ? (
                    <div className="text-center py-12 text-gray-500">Loading sessions...</div>
                ) : (
                    <div className="bg-white border text-left border-gray-200 rounded-xl overflow-hidden shadow-sm mb-12">
                        {sessions.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">No sessions recorded yet. Start one above!</div>
                        ) : (
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-200">
                                        <th className="p-4 font-semibold text-gray-600 text-sm">Code</th>
                                        <th className="p-4 font-semibold text-gray-600 text-sm">Model</th>
                                        <th className="p-4 font-semibold text-gray-600 text-sm">Status</th>
                                        <th className="p-4 font-semibold text-gray-600 text-sm text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {sessions.map(s => (
                                        <tr key={s.id} className="hover:bg-gray-50 transition group">
                                            <td className="p-4 font-mono font-bold text-gray-900">{s.code}</td>
                                            <td className="p-4 flex items-center gap-2 text-sm text-gray-600"><Bot className="w-4 h-4" /> {s.ai_model}</td>
                                            <td className="p-4">
                                                {s.status === 'active' ? (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                                                        Active
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                                        Closed
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    {s.status === 'active' ? (
                                                        <>
                                                            <button onClick={() => handleEndSession(s.id)} data-testid={`end-session-button-${s.id}`} className="px-3 py-1.5 bg-red-50 text-red-600 text-sm font-medium rounded hover:bg-red-100 transition">End Session</button>
                                                            <button onClick={() => navigate(`/admin/session/${s.code}`)} className="px-3 py-1.5 bg-blue-50 text-blue-700 text-sm font-medium rounded hover:bg-blue-100 transition">Open</button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <button onClick={() => handleDeleteSession(s.id)} className="px-3 py-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 text-sm font-medium rounded transition opacity-0 group-hover:opacity-100" title="Delete Session"><Trash2 className="w-4 h-4" /></button>
                                                            <button onClick={() => navigate(`/admin/session/${s.code}`)} className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm font-medium rounded hover:bg-gray-200 transition border border-gray-200">View Results</button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}
            </main>

            {/* Delete Collection Modal */}
            <DeleteCollectionModal
                show={!!deleteCollectionTarget}
                collection={deleteCollectionTarget}
                otherCollections={collections.filter(c => c.id !== deleteCollectionTarget?.id)}
                onCancel={() => setDeleteCollectionTarget(null)}
                onConfirm={handleDeleteCollectionConfirm}
            />

            {/* Model Search Modal */}
            <ModelSearchModal
                show={showModelModal}
                onClose={() => {
                    setShowModelModal(false);
                    setPendingSessionStart(false);
                }}
                modelsLoading={modelsLoading}
                openRouterModels={openRouterModels}
                modelSearch={modelSearch}
                setModelSearch={setModelSearch}
                selectedModel={selectedModel}
                setSelectedModel={handleModelSelect}
            />

            {/* Universal Question Modal */}
            <QuestionModal
                show={showQuestionModal}
                onClose={() => { setShowQuestionModal(false); setEditingQuestion(null); }}
                onSave={handleSaveQuestion}
                editingQuestion={editingQuestion}
                collections={collections}
            />

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
};

export default AdminDashboard;
