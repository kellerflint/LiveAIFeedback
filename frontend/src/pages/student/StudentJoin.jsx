import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import api from '../../api';

const StudentJoin = () => {
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleJoin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const formattedCode = code.toUpperCase().trim();
            const res = await api.post(`/student/join/${formattedCode}`);
            // If success, store session id temporarily in session storage
            sessionStorage.setItem('activeSessionId', res.data.session_id);
            navigate(`/session/${formattedCode}`);
        } catch (err) {
            setError(err.response?.data?.detail || 'Invalid session code or session is closed.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl border top-effect ring-1 ring-gray-200">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
                        Join Class Session
                    </h1>
                    <p className="text-gray-500">No account required. Enter the code shown by your instructor.</p>
                </div>

                <form onSubmit={handleJoin} className="space-y-6">
                    {error && (
                        <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm text-center">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Session Code</label>
                        <input
                            type="text"
                            required
                            placeholder="e.g. XYZ123"
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            className="w-full px-4 py-3 text-lg font-mono tracking-widest uppercase border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading || !code}
                        className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white rounded-lg py-3 font-medium hover:bg-blue-700 transition disabled:opacity-70 text-lg shadow-md hover:shadow-lg"
                    >
                        <LogIn className="w-5 h-5" />
                        {loading ? 'Joining...' : 'Join Session'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default StudentJoin;
