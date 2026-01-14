import { useState } from 'react';
import { Alert, Platform } from 'react-native';
import axios from 'axios';
import { useRouter } from 'expo-router';
import { useFormErrors } from '@/hooks/useFormErrors';
import { useOfflineQueue } from '@/contexts/OfflineQueueContext';

const API_BASE_URL = 'http://localhost:8000';

type Step = 'form' | 'verify';
type EmailVerificationStatus = 'required' | 'pending' | 'verified';

// 백엔드 에러 메시지를 사용자 친화적 메시지로 변환
const getErrorMessage = (error: any): string => {
    const errorData = error?.response?.data;

    if (errorData?.error) {
        const errorMsg = errorData.error;
        // 백엔드 오류 메시지 매핑
        if (errorMsg.includes('username') && errorMsg.includes('exists')) {
            return '이미 사용 중인 아이디입니다. 다른 아이디를 선택해주세요.';
        }
        if (errorMsg.includes('email') && errorMsg.includes('exists')) {
            return '이미 등록된 이메일입니다. 로그인하거나 다른 이메일을 사용해주세요.';
        }
        if (errorMsg.includes('인증') || errorMsg.includes('verification')) {
            return errorMsg;
        }
        if (errorMsg.includes('만료') || errorMsg.includes('expired')) {
            return '인증 코드가 만료되었습니다. 새 코드를 요청해주세요.';
        }
        if (errorMsg.includes('잘못된') || errorMsg.includes('invalid')) {
            return '잘못된 인증 코드입니다. 다시 확인해주세요.';
        }
        return errorMsg;
    }

    // 필드별 오류 처리
    if (errorData?.username) {
        const msg = Array.isArray(errorData.username) ? errorData.username[0] : errorData.username;
        if (msg.includes('already exists') || msg.includes('이미')) {
            return '이미 사용 중인 아이디입니다.';
        }
        return msg;
    }
    if (errorData?.email) {
        const msg = Array.isArray(errorData.email) ? errorData.email[0] : errorData.email;
        if (msg.includes('already exists') || msg.includes('이미')) {
            return '이미 등록된 이메일입니다.';
        }
        return msg;
    }
    if (errorData?.password) {
        const msg = Array.isArray(errorData.password) ? errorData.password[0] : errorData.password;
        return msg;
    }

    return '회원가입에 실패했습니다. 입력 정보를 확인해주세요.';
};

export const useRegister = () => {
    const router = useRouter();
    const { isOffline } = useOfflineQueue();
    const [step, setStep] = useState<Step>('form');
    const [emailVerificationStatus, setEmailVerificationStatus] = useState<EmailVerificationStatus>('required');

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
            const response = await axios.post(`${API_BASE_URL}/api/register/`, {
                username: username.trim(),
                email: email.trim(),
                password,
                password_confirm: passwordConfirm,
            });

            // 환경별 이메일 인증 정책에 따라 다른 처리
            const requiresVerification = response.data?.requires_verification ?? true;

            if (requiresVerification) {
                // 이메일 인증이 필요한 경우 (운영 환경)
                setEmailVerificationStatus('pending');
                setStep('verify');
                Alert.alert(
                    '인증 코드 전송',
                    `${email}로 6자리 인증 코드가 전송되었습니다.\n이메일을 확인해주세요.`
                );
            } else {
                // 이메일 인증이 불필요한 경우 (개발 환경)
                setEmailVerificationStatus('verified');
                Alert.alert(
                    '🎉 회원가입 성공',
                    '회원가입에 성공하셨습니다.\n로그인 페이지로 이동합니다.',
                    [{ text: '확인', onPress: () => router.replace('/login' as any) }]
                );
            }
        } catch (err: any) {
            const errorMessage = getErrorMessage(err);
            setErrorsFromResponse(err);

            if (isNetworkErr) {
                Alert.alert('네트워크 오류', '네트워크 연결을 확인해주세요');
            } else {
                Alert.alert('회원가입 실패', errorMessage);
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

        if (verificationCode.trim().length !== 6) {
            setFieldError('code', '인증 코드는 6자리입니다');
            return;
        }

        setIsLoading(true);
        clearAllErrors();
        try {
            await axios.post(`${API_BASE_URL}/api/email/verify/`, {
                email: email.trim(),
                code: verificationCode.trim(),
            });

            setEmailVerificationStatus('verified');
            Alert.alert(
                '🎉 회원가입 성공',
                '회원가입에 성공하셨습니다.\n로그인 페이지로 이동합니다.',
                [{ text: '확인', onPress: () => router.replace('/login' as any) }]
            );
        } catch (err: any) {
            const errorData = err?.response?.data;
            let errorMessage = '인증에 실패했습니다.';

            if (errorData?.error) {
                if (errorData.error.includes('만료') || errorData.error.includes('expired')) {
                    errorMessage = '인증 코드가 만료되었습니다.\n새 코드를 요청해주세요.';
                } else if (errorData.error.includes('잘못') || errorData.error.includes('invalid')) {
                    errorMessage = '잘못된 인증 코드입니다.\n가장 최근에 받은 코드를 입력해주세요.';
                } else {
                    errorMessage = errorData.error;
                }
            }

            setFieldError('code', errorMessage);
            Alert.alert('인증 실패', errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    // 인증 코드 재전송
    const handleResend = async () => {
        if (!email.trim()) {
            Alert.alert('오류', '이메일 주소가 필요합니다');
            return;
        }

        setIsLoading(true);
        try {
            await axios.post(`${API_BASE_URL}/api/email/resend/`, {
                email: email.trim(),
            });
            setEmailVerificationStatus('pending');
            Alert.alert(
                '재전송 완료',
                `${email}로 새 인증 코드가 전송되었습니다.\n이전 코드는 더 이상 사용할 수 없습니다.`
            );
        } catch (err: any) {
            const errorData = err?.response?.data;
            let errorMessage = '재전송에 실패했습니다.';

            if (errorData?.error) {
                if (errorData.error.includes('이미 인증') || errorData.error.includes('already verified')) {
                    errorMessage = '이미 인증이 완료된 계정입니다.';
                } else {
                    errorMessage = errorData.error;
                }
            }

            Alert.alert('재전송 실패', errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return {
        step,
        emailVerificationStatus,
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
