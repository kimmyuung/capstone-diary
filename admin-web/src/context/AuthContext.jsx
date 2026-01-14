import React, { createContext, useState, useContext, useEffect } from 'react'
import axios from 'axios'

const AuthContext = createContext(null)

// Axios 기본 설정
axios.defaults.baseURL = 'http://localhost:8000/api' // 로컬 개발 환경
// 배포 시에는 상대 경로 '/api' 또는 환경 변수 사용

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null)
    const [token, setToken] = useState(localStorage.getItem('admin_token'))
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (token) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
            // 토큰 유효성 검사 및 사용자 정보 가져오기 (여기서는 생략하고 활성 상태로 간주)
            // 실제로는 /api/me 등을 호출해야 함
            setLoading(false)
        } else {
            delete axios.defaults.headers.common['Authorization']
            setLoading(false)
        }
    }, [token])

    const login = async (username, password) => {
        try {
            const response = await axios.post('/token/', {
                username,
                password
            })

            const { access, refresh } = response.data
            setToken(access)
            localStorage.setItem('admin_token', access)
            localStorage.setItem('admin_refresh', refresh)

            return true
        } catch (error) {
            console.error('Login failed', error)
            throw error
        }
    }

    const logout = () => {
        setToken(null)
        setUser(null)
        localStorage.removeItem('admin_token')
        localStorage.removeItem('admin_refresh')
        delete axios.defaults.headers.common['Authorization']
    }

    const value = {
        user,
        token,
        login,
        logout,
        isAuthenticated: !!token,
        loading
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => useContext(AuthContext)
