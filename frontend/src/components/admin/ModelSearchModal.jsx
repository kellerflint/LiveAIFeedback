import React from 'react';
import { Bot, X, Search } from 'lucide-react';

const ModelSearchModal = ({
    show,
    onClose,
    modelsLoading,
    openRouterModels,
    modelSearch,
    setModelSearch,
    selectedModel,
    setSelectedModel
}) => {
    if (!show) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <Bot className="w-5 h-5 text-blue-600" /> Select AI Model
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
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
                                onClick={() => { setSelectedModel('test-model'); onClose(); }}
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
                                        onClick={() => { setSelectedModel(m.id); onClose(); }}
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
    );
};

export default ModelSearchModal;
