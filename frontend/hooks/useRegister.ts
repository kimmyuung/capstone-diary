import { useState } from 'react';
import { Alert } from 'react-native';
import axios from 'axios';
import { useRouter } from 'expo-router';
import { useFormErrors } from '@/hooks/useFormErrors';
import { useOfflineQueue } from '@/contexts/OfflineQueueContext';

const API_BASE_URL = 'http://localhost:8000';

type Step = 'form' | 'verify';

export const useRegister = () => {
    const router = useRouter();
    const { isOffline } = useOfflineQueue();
    const [step, setStep] = useState<Step>('form');

    // Form States
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirm, setPasswordConfirm] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Error Handling Hook
    const {
        errors,
        setErrorsFromResponse,
        clearAllErrors,
        setFieldError,
        isNetworkErr,
    } = useFormErrors();

    const validateForm = () => {
        clearAllErrors();
        let isValid = true;

        if (!username.trim()) {
            setFieldError('username', '아이디를 입력해주세요');
            isValid = false;
        } else if (username.length < 3) {
            setFieldError('username', '아이디는 3자 이상이어야 합니다');
            isValid = false;
        }

        if (!email.trim()) {
            setFieldError('email', '이메일을 입력해주세요 (필수)');
            isValid = false;
        } else if (!/\S+@\S+\.\S+/.test(email)) {
            setFieldError('email', '올바른 이메일 형식이 아닙니다');
            isValid = false;
        }

        if (!password) {
            setFieldError('password', '비밀번호를 입력해주세요');
            isValid = false;
        } else if (password.length < 8) {
            setFieldError('password', '비밀번호는 8자 이상이어야 합니다');
            isValid = false;
        }

        if (!passwordConfirm) {
            setFieldError('passwordConfirm', '비밀번호 확인을 입력해주세요');
            isValid = false;
        } else if (password !== passwordConfirm) {
            setFieldError('passwordConfirm', '비밀번호가 일치하지 않습니다');
            isValid = false;
        }

        return isValid;
    };

    // Step 1: 회원가입 요청
    const handleRegister = async () => {
        if (!validateForm()) return;

        if (isOffline) {
            Alert.alert('오프라인', '회원가입은 네트워크 연결이 필요합니다');
            return;
        }

        setIsLoading(true);
        clearAllErrors();
        try {
            await axios.post(`${API_BASE_URL}/api/register/`, {
                username: username.trim(),
                email: email.trim(),
                password,
                password_confirm: passwordConfirm,
            });

            setStep('verify');
            Alert.alert('인증 코드 전송', '이메일로 6자리 인증 코드가 전송되었습니다.');
        } catch (err: any) {
            setErrorsFromResponse(err);
            if (isNetworkErr) {
                Alert.alert('네트워크 오류', '네트워크 연결을 확인해주세요');
            }
        } finally {
            setIsLoading(false);
        }
    };

    // Step 2: 이메일 인증 코드 확인
    const handleVerify = async () => {
        if (!verificationCode.trim()) {
            setFieldError('code', '인증 코드를 입력해주세요');
            return;
        }

        setIsLoading(true);
        clearAllErrors();
        try {
            await axios.post(`${API_BASE_URL}/api/email/verify/`, {
                email: email.trim(),
                code: verificationCode.trim(),
            });

            Alert.alert(
                '회원가입 완료',
                '이메일 인증이 완료되었습니다. 로그인해주세요.',
                [{ text: '확인', onPress: () => router.replace('/login' as any) }]
            );
        } catch (err: any) {
            setErrorsFromResponse(err);
        } finally {
            setIsLoading(false);
        }
    };

    // 인증 코드 재전송
    const handleResend = async () => {
        setIsLoading(true);
        try {
            await axios.post(`${API_BASE_URL}/api/email/resend/`, {
                email: email.trim(),
            });
            Alert.alert('재전송 완료', '인증 코드가 다시 전송되었습니다.');
        } catch (err) {
            Alert.alert('오류', '재전송에 실패했습니다');
        } finally {
            setIsLoading(false);
        }
    };

    return {
        step,
        username, setUsername,
        email, setEmail,
        password, setPassword,
        passwordConfirm, setPasswordConfirm,
        verificationCode, setVerificationCode,
        isLoading,
        errors,
        handleRegister,
        handleVerify,
        handleResend,
    };
};
