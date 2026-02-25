import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';

const QuestionModal = ({ show, onClose, onSave, editingQuestion = null }) => {
    const [text, setText] = useState('');
    const [gradingCriteria, setGradingCriteria] = useState('');

    useEffect(() => {
        if (show) {
            if (editingQuestion) {
                setText(editingQuestion.text);
                setGradingCriteria(editingQuestion.grading_criteria);
            } else {
                setText('');
                setGradingCriteria('');
            }
        }
    }, [show, editingQuestion]);

    if (!show) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({ text, grading_criteria: gradingCriteria });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-in fade-in">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                    <h3 className="text-lg font-bold text-gray-900">
                        {editingQuestion ? 'Edit Question' : 'Create New Question'}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Question Text
                        </label>
                        <textarea
                            required
                            rows={3}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y"
                            value={text}
                            onChange={e => setText(e.target.value)}
                            placeholder="e.g. What is the powerhouse of the cell?"
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Grading Criteria (Auto-AI Instructions)
                        </label>
                        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-3 text-sm text-blue-800">
                            <strong>Tip:</strong> Provide clear instructions for the AI on how to grade responses. You can use this for point-based grading or progress tracking. Example: "Give full credit if they mention mitochondria. Half credit if they describe it well but forget the name."
                        </div>
                        <textarea
                            required
                            rows={4}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y font-mono text-sm"
                            value={gradingCriteria}
                            onChange={e => setGradingCriteria(e.target.value)}
                            placeholder="e.g. 4 pts for 'Mitochondria'. 1 pt for any other organelle."
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2.5 text-gray-600 hover:bg-gray-100 font-medium rounded-lg transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-5 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 flex items-center gap-2 transition shadow-sm"
                        >
                            <Save className="w-4 h-4" />
                            {editingQuestion ? 'Save Changes' : 'Create Question'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default QuestionModal;
