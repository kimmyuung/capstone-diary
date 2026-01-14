import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Box } from '@mui/material'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Users from './pages/Users'
import Moderation from './pages/Moderation'
import Monitoring from './pages/Monitoring'
import Login from './pages/Login'
import { AuthProvider, useAuth } from './context/AuthContext'

// 보호된 라우트 컴포넌트
const ProtectedRoute = ({ children }) => {
    const { isAuthenticated, loading } = useAuth()

    if (loading) return <div>Loading...</div>
    if (!isAuthenticated) return <Navigate to="/login" />

    return children
}

function App() {
    return (
        <AuthProvider>
            <Routes>
                <Route path="/login" element={<Login />} />

                <Route path="/" element={
                    <ProtectedRoute>
                        <Layout />
                    </ProtectedRoute>
                }>
                    <Route index element={<Dashboard />} />
                    <Route path="users" element={<Users />} />
                    <Route path="moderation" element={<Moderation />} />
                    <Route path="monitoring" element={<Monitoring />} />
                </Route>
            </Routes>
        </AuthProvider>
    )
}

export default App
