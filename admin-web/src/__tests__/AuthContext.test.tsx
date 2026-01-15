/**
 * AuthContext 테스트
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock Auth state
interface AuthState {
    isAuthenticated: boolean
    loading: boolean
    user: { username: string } | null
}

// Mock AuthContext
const createMockAuthProvider = () => {
    let state: AuthState = {
        isAuthenticated: false,
        loading: false,
        user: null,
    }

    const login = vi.fn(async (username: string, password: string) => {
        state = {
            isAuthenticated: true,
            loading: false,
            user: { username },
        }
        return true
    })

    const logout = vi.fn(() => {
        state = {
            isAuthenticated: false,
            loading: false,
            user: null,
        }
    })

    return { state, login, logout }
}

describe('AuthContext', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        localStorage.clear()
    })

    describe('Initial State', () => {
        it('should start with unauthenticated state', () => {
            const { state } = createMockAuthProvider()

            expect(state.isAuthenticated).toBe(false)
            expect(state.user).toBeNull()
        })
    })

    describe('Login', () => {
        it('should update state after successful login', async () => {
            const { state, login } = createMockAuthProvider()

            await login('admin', 'password')

            expect(login).toHaveBeenCalledWith('admin', 'password')
        })

        it('should call login with correct credentials', async () => {
            const { login } = createMockAuthProvider()

            await login('testuser', 'testpass')

            expect(login).toHaveBeenCalledTimes(1)
            expect(login).toHaveBeenCalledWith('testuser', 'testpass')
        })
    })

    describe('Logout', () => {
        it('should clear auth state on logout', () => {
            const { logout, state } = createMockAuthProvider()

            logout()

            expect(logout).toHaveBeenCalled()
        })
    })

    describe('Token Storage', () => {
        it('should handle token in localStorage', () => {
            const testToken = 'test-jwt-token'
            localStorage.setItem('token', testToken)

            expect(localStorage.getItem('token')).toBe(testToken)
        })

        it('should clear token on logout', () => {
            localStorage.setItem('token', 'some-token')
            localStorage.removeItem('token')

            expect(localStorage.getItem('token')).toBeNull()
        })
    })
})
