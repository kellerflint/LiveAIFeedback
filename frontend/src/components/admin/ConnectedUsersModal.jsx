import React from 'react';
import { Users, X } from 'lucide-react';

const ConnectedUsersModal = ({ show, onClose, connectedUsers, connectedNames }) => {
    if (!show) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh]">
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <Users className="w-5 h-5 text-blue-600" /> Connected Students ({connectedUsers})
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
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
                        onClick={onClose}
                        className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConnectedUsersModal;
