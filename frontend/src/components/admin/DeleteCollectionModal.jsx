import React, { useState, useEffect } from 'react';
import { AlertTriangle, X, Trash2, FolderOpen } from 'lucide-react';

/**
 * DeleteCollectionModal
 *
 * Props:
 *   show            – boolean, controls visibility
 *   collection      – the collection object being deleted { id, name, question_count }
 *   otherCollections – array of other collections to move questions into
 *   onCancel        – called when the user dismisses without confirming
 *   onConfirm       – called with { action: 'delete' } or { action: 'move', targetId }
 */
const DeleteCollectionModal = ({ show, collection, otherCollections = [], onCancel, onConfirm }) => {
    const [mode, setMode] = useState('delete'); // 'delete' | 'move'
    const [targetId, setTargetId] = useState('');

    useEffect(() => {
        if (show) {
            setMode('delete');
            setTargetId(otherCollections[0]?.id?.toString() ?? '');
        }
    }, [show, otherCollections]);

    if (!show || !collection) return null;

    const hasQuestions = collection.question_count > 0;

    const handleConfirm = () => {
        if (mode === 'move') {
            onConfirm({ action: 'move', targetId: Number(targetId) });
        } else {
            onConfirm({ action: 'delete' });
        }
    };

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            data-testid="delete-collection-modal"
        >
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-red-500" />
                        <h3 className="text-lg font-bold text-gray-900">Delete Collection</h3>
                    </div>
                    <button
                        onClick={onCancel}
                        className="text-gray-400 hover:text-gray-700 transition"
                        data-testid="delete-collection-modal-close"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4">
                    <p className="text-gray-700">
                        Are you sure you want to delete{' '}
                        <span className="font-semibold">"{collection.name}"</span>?
                    </p>

                    {hasQuestions && (
                        <>
                            <p className="text-sm text-gray-500">
                                This collection contains{' '}
                                <span className="font-medium text-gray-700">{collection.question_count}</span>{' '}
                                question{collection.question_count !== 1 ? 's' : ''}. Choose what to do with them:
                            </p>

                            <div className="space-y-2">
                                <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50 transition has-[:checked]:border-red-400 has-[:checked]:bg-red-50">
                                    <input
                                        type="radio"
                                        name="deleteMode"
                                        value="delete"
                                        checked={mode === 'delete'}
                                        onChange={() => setMode('delete')}
                                        className="mt-0.5"
                                        data-testid="delete-collection-delete-radio"
                                    />
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">Delete all questions</p>
                                        <p className="text-xs text-gray-500 mt-0.5">Permanently removes the collection and all its questions.</p>
                                    </div>
                                </label>

                                {otherCollections.length > 0 && (
                                    <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50 transition has-[:checked]:border-blue-400 has-[:checked]:bg-blue-50">
                                        <input
                                            type="radio"
                                            name="deleteMode"
                                            value="move"
                                            checked={mode === 'move'}
                                            onChange={() => setMode('move')}
                                            className="mt-0.5"
                                            data-testid="delete-collection-move-radio"
                                        />
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-gray-900">Move questions to another collection</p>
                                            {mode === 'move' && (
                                                <select
                                                    value={targetId}
                                                    onChange={e => setTargetId(e.target.value)}
                                                    className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                                                    data-testid="delete-collection-move-target"
                                                >
                                                    {otherCollections.map(c => (
                                                        <option key={c.id} value={c.id}>
                                                            {c.name} ({c.question_count})
                                                        </option>
                                                    ))}
                                                </select>
                                            )}
                                        </div>
                                    </label>
                                )}
                            </div>
                        </>
                    )}

                    {!hasQuestions && (
                        <p className="text-sm text-gray-500">This collection is empty. It will be permanently deleted.</p>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-5 py-2.5 text-gray-600 hover:bg-gray-100 font-medium rounded-lg transition"
                        data-testid="delete-collection-cancel-button"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        className="px-5 py-2.5 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 flex items-center gap-2 transition shadow-sm"
                        data-testid="delete-collection-confirm-button"
                    >
                        <Trash2 className="w-4 h-4" />
                        {mode === 'move' ? 'Move & Delete' : 'Delete'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DeleteCollectionModal;
