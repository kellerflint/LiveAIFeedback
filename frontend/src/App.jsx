import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import SessionLive from './pages/admin/SessionLive';
import StudentJoin from './pages/student/StudentJoin';
import StudentActiveSession from './pages/student/StudentActiveSession';

// Simple protected route wrapper
const ProtectedRoute = ({ children }) => {
    return (
        <AuthContext.Consumer>
            {({ isAuthenticated }) => (isAuthenticated ? children : <Navigate to="/admin/login" />)}
        </AuthContext.Consumer>
    );
};

function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    {/* Public / Student Routes */}
                    <Route path="/" element={<StudentJoin />} />
                    <Route path="/session/:code" element={<StudentActiveSession />} />

                    {/* Admin Routes */}
                    <Route path="/admin/login" element={<AdminLogin />} />
                    <Route
                        path="/admin/dashboard"
                        element={
                            <ProtectedRoute>
                                <AdminDashboard />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/admin/session/:id"
                        element={
                            <ProtectedRoute>
                                <SessionLive />
                            </ProtectedRoute>
                        }
                    />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}

export default App;
