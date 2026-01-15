/**
 * App.tsx 테스트
 * - 라우팅 테스트
 * - ProtectedRoute 테스트
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from '../App'

// AuthContext mock
vi.mock('../context/AuthContext', () => ({
    AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useAuth: vi.fn().mockReturnValue({
        isAuthenticated: false,
        loading: false,
        login: vi.fn(),
        logout: vi.fn(),
    }),
}))

// Pages mock
vi.mock('../pages/Dashboard', () => ({
    default: () => <div data-testid="dashboard">Dashboard</div>,
}))

vi.mock('../pages/Users', () => ({
    default: () => <div data-testid="users">Users</div>,
}))

vi.mock('../pages/Login', () => ({
    default: () => <div data-testid="login">Login Page</div>,
}))

vi.mock('../components/Layout', () => ({
    default: ({ children }: any) => <div data-testid="layout">{children}</div>,
}))

describe('App', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('Routing', () => {
        it('renders login page on /login route', () => {
            render(
                <MemoryRouter initialEntries={['/login']}>
                    <App />
                </MemoryRouter>
            )
            expect(screen.getByTestId('login')).toBeInTheDocument()
        })

        it('redirects to login when not authenticated', async () => {
            const { useAuth } = await import('../context/AuthContext')
            vi.mocked(useAuth).mockReturnValue({
                isAuthenticated: false,
                loading: false,
                login: vi.fn(),
                logout: vi.fn(),
                user: null,
            })

            render(
                <MemoryRouter initialEntries={['/']}>
                    <App />
                </MemoryRouter>
            )

            // 인증되지 않으면 로그인 페이지로 리다이렉트
            expect(screen.getByTestId('login')).toBeInTheDocument()
        })

        it('shows dashboard when authenticated', async () => {
            const { useAuth } = await import('../context/AuthContext')
            vi.mocked(useAuth).mockReturnValue({
                isAuthenticated: true,
                loading: false,
                login: vi.fn(),
                logout: vi.fn(),
                user: { username: 'admin' },
            })

            render(
                <MemoryRouter initialEntries={['/']}>
                    <App />
                </MemoryRouter>
            )

            expect(screen.getByTestId('layout')).toBeInTheDocument()
        })

        it('shows loading state while authenticating', async () => {
            const { useAuth } = await import('../context/AuthContext')
            vi.mocked(useAuth).mockReturnValue({
                isAuthenticated: false,
                loading: true,
                login: vi.fn(),
                logout: vi.fn(),
                user: null,
            })

            render(
                <MemoryRouter initialEntries={['/']}>
                    <App />
                </MemoryRouter>
            )

            expect(screen.getByText('Loading...')).toBeInTheDocument()
        })
    })
})
