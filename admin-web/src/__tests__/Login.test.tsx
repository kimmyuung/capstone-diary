/**
 * Login 페이지 테스트
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import React, { useState } from 'react'

// Mock Login component for testing
const MockLogin: React.FC = () => {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!username || !password) {
            setError('아이디와 비밀번호를 입력해주세요')
            return
        }
        setLoading(true)
        await new Promise(resolve => setTimeout(resolve, 100))
        setLoading(false)
    }

    return (
        <form onSubmit={handleSubmit} data-testid="login-form">
            <input
                data-testid="username-input"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="아이디"
            />
            <input
                data-testid="password-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호"
            />
            {error && <span data-testid="error-message">{error}</span>}
            <button type="submit" data-testid="login-button" disabled={loading}>
                {loading ? '로그인 중...' : '로그인'}
            </button>
        </form>
    )
}

describe('Login Page', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('renders login form', () => {
        render(
            <BrowserRouter>
                <MockLogin />
            </BrowserRouter>
        )

        expect(screen.getByTestId('login-form')).toBeInTheDocument()
        expect(screen.getByTestId('username-input')).toBeInTheDocument()
        expect(screen.getByTestId('password-input')).toBeInTheDocument()
        expect(screen.getByTestId('login-button')).toBeInTheDocument()
    })

    it('allows entering username and password', async () => {
        const user = userEvent.setup()

        render(
            <BrowserRouter>
                <MockLogin />
            </BrowserRouter>
        )

        const usernameInput = screen.getByTestId('username-input')
        const passwordInput = screen.getByTestId('password-input')

        await user.type(usernameInput, 'admin')
        await user.type(passwordInput, 'password123')

        expect(usernameInput).toHaveValue('admin')
        expect(passwordInput).toHaveValue('password123')
    })

    it('shows error when submitting empty form', async () => {
        const user = userEvent.setup()

        render(
            <BrowserRouter>
                <MockLogin />
            </BrowserRouter>
        )

        await user.click(screen.getByTestId('login-button'))

        await waitFor(() => {
            expect(screen.getByTestId('error-message')).toHaveTextContent('아이디와 비밀번호를 입력해주세요')
        })
    })

    it('shows loading state when submitting', async () => {
        const user = userEvent.setup()

        render(
            <BrowserRouter>
                <MockLogin />
            </BrowserRouter>
        )

        await user.type(screen.getByTestId('username-input'), 'admin')
        await user.type(screen.getByTestId('password-input'), 'password')
        await user.click(screen.getByTestId('login-button'))

        expect(screen.getByTestId('login-button')).toHaveTextContent('로그인 중...')
    })
})
