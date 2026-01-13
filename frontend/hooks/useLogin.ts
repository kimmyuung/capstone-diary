import { useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

export const useLogin = () => {
    const router = useRouter();
    const { login } = useAuth();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const handleLogin = async () => {
        if (!username.trim()) {
            Alert.alert('알림', '사용자 이름을 입력해주세요');
            return;
        }
        if (!password) {
            Alert.alert('알림', '비밀번호를 입력해주세요');
            return;
        }

        setIsLoading(true);
        setErrorMessage(''); // 이전 에러 메시지 초기화

        try {
            const result = await login(username.trim(), password);

            if (result.success) {
                router.replace('/' as any);
            } else {
                // 이메일 미인증 사용자 처리
                if (result.error === 'EMAIL_NOT_VERIFIED') {
                    setErrorMessage('이메일 인증이 필요합니다. 가입 시 입력한 이메일을 확인해주세요.');
                    // 이메일 재인증 화면으로 이동할 수 있도록 버튼 표시
                    Alert.alert(
                        '이메일 인증 필요',
                        `${result.email}로 전송된 인증 코드를 입력해주세요.`,
                        [
                            { text: '취소', style: 'cancel' },
                            {
                                text: '인증하기',
                                onPress: () => router.push({
                                    pathname: '/register' as any,
                                    params: { email: result.email, step: 'verify' }
                                })
                            }
                        ]
                    );
                } else {
                    setErrorMessage(result.message || '아이디 또는 비밀번호가 올바르지 않습니다.');
                }
            }
        } catch (error) {
            setErrorMessage('로그인 중 오류가 발생했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    return {
        username,
        setUsername,
        password,
        setPassword,
        isLoading,
        errorMessage,
        handleLogin
    };
};
