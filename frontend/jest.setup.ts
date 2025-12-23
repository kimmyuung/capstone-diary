import '@testing-library/jest-native/extend-expect';

// Mock axios globally
jest.mock('axios', () => {
    const mockInterceptors = {
        request: { use: jest.fn(), eject: jest.fn() },
        response: { use: jest.fn(), eject: jest.fn() },
    };

    const mockAxiosInstance = {
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        patch: jest.fn(),
        delete: jest.fn(),
        interceptors: mockInterceptors,
    };

    return {
        __esModule: true,
        default: {
            ...mockAxiosInstance,
            create: jest.fn(() => mockAxiosInstance),
        },
    };
});

// Mock expo-secure-store for web testing
jest.mock('expo-secure-store', () => ({
    getItemAsync: jest.fn(),
    setItemAsync: jest.fn(),
    deleteItemAsync: jest.fn(),
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
}));

// Mock expo-router
jest.mock('expo-router', () => ({
    useRouter: () => ({
        push: jest.fn(),
        back: jest.fn(),
        replace: jest.fn(),
    }),
    useLocalSearchParams: () => ({}),
    Stack: {
        Screen: () => null,
    },
}));

// Silence console warnings in tests
global.console = {
    ...console,
    warn: jest.fn(),
    error: jest.fn(),
};
