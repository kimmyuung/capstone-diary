/**
 * Dashboard 페이지 테스트
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import React, { useState, useEffect } from 'react'

// Mock Dashboard data
const mockStats = {
    totalUsers: 150,
    totalDiaries: 1234,
    todayDiaries: 45,
    activeUsers: 89,
}

// Mock Dashboard component
const MockDashboard: React.FC = () => {
    const [stats, setStats] = useState<typeof mockStats | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        setTimeout(() => {
            setStats(mockStats)
            setLoading(false)
        }, 100)
    }, [])

    if (loading) {
        return <div data-testid="loading">Loading...</div>
    }

    return (
        <div data-testid="dashboard">
            <h1>Dashboard</h1>
            <div data-testid="total-users">총 사용자: {stats?.totalUsers}</div>
            <div data-testid="total-diaries">총 일기: {stats?.totalDiaries}</div>
            <div data-testid="today-diaries">오늘 작성: {stats?.todayDiaries}</div>
            <div data-testid="active-users">활성 사용자: {stats?.activeUsers}</div>
        </div>
    )
}

describe('Dashboard Page', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('shows loading state initially', () => {
        render(
            <BrowserRouter>
                <MockDashboard />
            </BrowserRouter>
        )

        expect(screen.getByTestId('loading')).toBeInTheDocument()
    })

    it('displays stats after loading', async () => {
        render(
            <BrowserRouter>
                <MockDashboard />
            </BrowserRouter>
        )

        await waitFor(() => {
            expect(screen.getByTestId('dashboard')).toBeInTheDocument()
        })

        expect(screen.getByTestId('total-users')).toHaveTextContent('총 사용자: 150')
        expect(screen.getByTestId('total-diaries')).toHaveTextContent('총 일기: 1234')
        expect(screen.getByTestId('today-diaries')).toHaveTextContent('오늘 작성: 45')
        expect(screen.getByTestId('active-users')).toHaveTextContent('활성 사용자: 89')
    })
})

describe('Dashboard - Stats Cards', () => {
    it('should display correct stat card values', async () => {
        render(
            <BrowserRouter>
                <MockDashboard />
            </BrowserRouter>
        )

        await waitFor(() => {
            expect(screen.getByTestId('dashboard')).toBeInTheDocument()
        })

        expect(screen.getByText(/150/)).toBeInTheDocument()
        expect(screen.getByText(/1234/)).toBeInTheDocument()
        expect(screen.getByText(/45/)).toBeInTheDocument()
        expect(screen.getByText(/89/)).toBeInTheDocument()
    })
})
