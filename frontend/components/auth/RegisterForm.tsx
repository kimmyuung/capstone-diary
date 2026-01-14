import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Palette, FontSize, FontWeight, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { FormFieldError } from '@/components/FormFieldError';
import { PasswordInput } from '@/components/ui/PasswordInput';

const DOMAINS = ['naver.com', 'gmail.com', 'daum.net', 'kakao.com', 'icloud.com', 'outlook.com', '직접 입력'];

// 이메일 인증 상태 타입
type EmailVerificationStatus = 'required' | 'pending' | 'verified';

// Define Props Interface
interface RegisterFormProps {
    username: string;
    setUsername: (text: string) => void;
    email: string;
    setEmail: (text: string) => void;
    password: string;
    setPassword: (text: string) => void;
    passwordConfirm: string;
    setPasswordConfirm: (text: string) => void;
    errors: {
        username?: string;
        email?: string;
        password?: string;
        passwordConfirm?: string;
        code?: string;
    };
    isLoading: boolean;
    onSubmit: () => void;
    emailVerificationStatus?: EmailVerificationStatus;
    onResendEmail?: () => void;
}

// 상태별 뱃지 텍스트와 색상
const getStatusBadge = (status: EmailVerificationStatus) => {
    switch (status) {
        case 'verified':
            return { text: '인증됨', color: Palette.status.success };
        case 'pending':
            return { text: '인증 요청 중', color: Palette.status.warning };
        case 'required':
        default:
            return { text: '인증필요', color: Palette.status.error };
    }
};

export const RegisterForm = ({
    username, setUsername,
    email, setEmail,
    password, setPassword,
    passwordConfirm, setPasswordConfirm,
    errors,
    isLoading,
    onSubmit,
    emailVerificationStatus = 'required',
    onResendEmail
}: RegisterFormProps) => {
    const statusBadge = getStatusBadge(emailVerificationStatus);
    const showResendButton = emailVerificationStatus !== 'verified' && onResendEmail;

    // 이메일 분리 상태 관리
    const [localPart, setLocalPart] = useState('');
    const [domainPart, setDomainPart] = useState('naver.com'); // 기본값 설정
    const [isCustomDomain, setIsCustomDomain] = useState(false);
    const [showDomainModal, setShowDomainModal] = useState(false);

    // 초기 이메일 값 파싱 (컴포넌트 마운트 시 한 번만 실행하거나 email prop이 외부에서 변경되었을 때)
    useEffect(() => {
        if (email) {
            const parts = email.split('@');
            if (parts.length === 2) {
                setLocalPart(parts[0]);
                const domain = parts[1];
                if (DOMAINS.includes(domain)) {
                    setDomainPart(domain);
                    setIsCustomDomain(false);
                } else {
                    setDomainPart(domain);
                    setIsCustomDomain(true);
                }
            } else if (!email.includes('@')) {
                setLocalPart(email);
            }
        }
    }, []); // 의존성 배열 비움 (초기 로드 시만 적용, 입력 중 재-렌더링 방지)

    // 로컬/도메인 파트 변경 시 부모 email state 업데이트
    useEffect(() => {
        if (localPart || domainPart) {
            const newEmail = domainPart ? `${localPart}@${domainPart}` : localPart;
            setEmail(newEmail);
        }
    }, [localPart, domainPart, isCustomDomain]);

    return (
        <>
            <View style={styles.inputGroup}>
                <Text style={styles.label}>아이디</Text>
                <TextInput
                    style={[styles.input, errors.username && styles.inputError]}
                    placeholder="영문, 숫자 3자 이상"
                    placeholderTextColor={Palette.neutral[400]}
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isLoading}
                />
                <FormFieldError error={errors.username} />
            </View>

            <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                    <Text style={styles.label}>
                        이메일 <Text style={styles.required}>*필수</Text>
                    </Text>
                    <View style={[styles.statusBadge, { backgroundColor: statusBadge.color + '20' }]}>
                        <Text style={[styles.statusBadgeText, { color: statusBadge.color }]}>
                            {statusBadge.text}
                        </Text>
                    </View>
                </View>

                <View style={styles.emailContainer}>
                    <TextInput
                        style={[styles.input, styles.emailLocalInput, errors.email && styles.inputError]}
                        placeholder="이메일 ID"
                        placeholderTextColor={Palette.neutral[400]}
                        value={localPart}
                        onChangeText={setLocalPart}
                        autoCapitalize="none"
                        autoCorrect={false}
                        editable={!isLoading && emailVerificationStatus !== 'verified'}
                    />
                    <Text style={styles.atSign}>@</Text>
                    {isCustomDomain ? (
                        <TextInput
                            style={[styles.input, styles.emailDomainInput, errors.email && styles.inputError]}
                            placeholder="직접 입력"
                            placeholderTextColor={Palette.neutral[400]}
                            value={domainPart}
                            onChangeText={setDomainPart}
                            autoCapitalize="none"
                            autoCorrect={false}
                            editable={!isLoading && emailVerificationStatus !== 'verified'}
                        />
                    ) : (
                        <TouchableOpacity
                            style={[styles.input, styles.emailDomainSelector, errors.email && styles.inputError]}
                            onPress={() => setShowDomainModal(true)}
                            disabled={isLoading || emailVerificationStatus === 'verified'}
                        >
                            <Text style={[
                                styles.emailDomainText,
                                !domainPart && { color: Palette.neutral[400] }
                            ]}>
                                {domainPart || '도메인 선택'}
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* 도메인 선택 드롭다운 (모달 대신) */}
                {showDomainModal && (
                    <View style={styles.dropdownContainer}>
                        <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
                            {DOMAINS.map((item) => (
                                <TouchableOpacity
                                    key={item}
                                    style={styles.dropdownItem}
                                    onPress={() => {
                                        if (item === '직접 입력') {
                                            setIsCustomDomain(true);
                                            setDomainPart('');
                                        } else {
                                            setIsCustomDomain(false);
                                            setDomainPart(item);
                                        }
                                        setShowDomainModal(false);
                                    }}
                                >
                                    <Text style={styles.dropdownItemText}>{item}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                )}

                <FormFieldError error={errors.email} />

                {/* 이메일 재전송 버튼 */}
                {showResendButton && email.trim() && (
                    <TouchableOpacity
                        style={styles.resendButton}
                        onPress={onResendEmail}
                        disabled={isLoading}
                    >
                        <Text style={styles.resendButtonText}>
                            {emailVerificationStatus === 'pending'
                                ? '📧 인증 메일 다시 보내기'
                                : '📧 인증 메일 보내기'}
                        </Text>
                    </TouchableOpacity>
                )}
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>비밀번호</Text>
                <PasswordInput
                    hasError={!!errors.password}
                    placeholder="8자 이상"
                    placeholderTextColor={Palette.neutral[400]}
                    value={password}
                    onChangeText={setPassword}
                    editable={!isLoading}
                />
                {/* 비밀번호 강도 표시기 (개선된 UI) */}
                {password.length > 0 && (
                    <View style={styles.strengthContainer}>
                        <Text style={[
                            styles.strengthText,
                            { color: password.length < 8 ? Palette.status.error : password.length < 12 ? Palette.status.warning : Palette.status.success }
                        ]}>
                            {password.length < 8 ? '약함' : password.length < 12 ? '보통' : '강함'}
                        </Text>
                        <View style={styles.strengthBars}>
                            {[1, 2, 3, 4, 5].map((idx) => {
                                // 강도 레벨 계산 (1: 약함, 3: 보통, 5: 강함)
                                const strengthLevel = password.length < 8 ? 1 : password.length < 12 ? 3 : 5;
                                const isFilled = idx <= strengthLevel;
                                const color = password.length < 8 ? Palette.status.error : password.length < 12 ? Palette.status.warning : Palette.status.success;

                                return (
                                    <View
                                        key={idx}
                                        style={[
                                            styles.strengthBarSegment,
                                            { backgroundColor: isFilled ? color : Palette.neutral[200] }
                                        ]}
                                    />
                                );
                            })}
                        </View>
                    </View>
                )}
                <FormFieldError error={errors.password} />
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>비밀번호 확인</Text>
                <PasswordInput
                    hasError={!!errors.passwordConfirm}
                    placeholder="비밀번호를 다시 입력하세요"
                    placeholderTextColor={Palette.neutral[400]}
                    value={passwordConfirm}
                    onChangeText={setPasswordConfirm}
                    editable={!isLoading}
                />
                <FormFieldError error={errors.passwordConfirm} />
            </View>

            <TouchableOpacity
                style={[styles.button, isLoading && styles.buttonDisabled]}
                onPress={onSubmit}
                disabled={isLoading}
            >
                <LinearGradient
                    colors={[Palette.secondary[400], Palette.secondary[500]]}
                    style={styles.buttonGradient}
                >
                    {isLoading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.buttonText}>가입하기</Text>
                    )}
                </LinearGradient>
            </TouchableOpacity>
        </>
    );
};

const styles = StyleSheet.create({
    inputGroup: {
        marginBottom: Spacing.lg,
    },
    labelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: Spacing.sm,
    },
    label: {
        fontSize: FontSize.sm,
        fontWeight: FontWeight.semibold,
        color: Palette.neutral[700],
        marginBottom: Spacing.sm,
    },
    required: {
        color: Palette.status.error,
        fontSize: FontSize.xs,
    },
    statusBadge: {
        paddingHorizontal: Spacing.sm,
        paddingVertical: 2,
        borderRadius: BorderRadius.full,
    },
    statusBadgeText: {
        fontSize: FontSize.xs,
        fontWeight: FontWeight.semibold,
    },
    input: {
        backgroundColor: Palette.neutral[50],
        borderRadius: BorderRadius.md,
        padding: Spacing.lg,
        fontSize: FontSize.md,
        color: Palette.neutral[900],
        borderWidth: 1.5,
        borderColor: Palette.neutral[200],
    },
    inputError: {
        borderColor: Palette.status.error,
    },
    resendButton: {
        marginTop: Spacing.sm,
        paddingVertical: Spacing.sm,
        alignItems: 'center',
    },
    resendButtonText: {
        fontSize: FontSize.sm,
        color: Palette.primary[500],
        fontWeight: FontWeight.medium,
    },
    button: {
        marginTop: Spacing.md,
        borderRadius: BorderRadius.full,
        overflow: 'hidden',
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    buttonGradient: {
        paddingVertical: Spacing.lg,
        alignItems: 'center',
    },
    buttonText: {
        color: '#fff',
        fontSize: FontSize.lg,
        fontWeight: FontWeight.bold,
    },
    strengthContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: Spacing.xs,
        paddingLeft: Spacing.xs, // 약간의 들여쓰기
    },
    strengthText: {
        fontSize: FontSize.xs, // 약 11px
        fontWeight: FontWeight.medium,
        marginRight: Spacing.md,
        minWidth: 24, // 텍스트 줄바꿈 방지
    },
    strengthBars: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4, // 막대 사이 간격
        maxWidth: 120, // 전체 막대 바 최대 너비 제한
    },
    strengthBarSegment: {
        flex: 1,
        height: 4,
        borderRadius: 2,
    },
    // 이메일 분리 입력 스타일
    emailContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
    },
    emailLocalInput: {
        flex: 1,
    },
    emailDomainSelector: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'flex-start', // 텍스트만 보이게
        paddingVertical: Spacing.lg, // 높이 맞춤
    },
    emailDomainInput: {
        flex: 1,
    },
    emailDomainText: {
        fontSize: FontSize.md,
        color: Palette.neutral[900],
    },
    atSign: {
        fontSize: FontSize.lg,
        fontWeight: FontWeight.bold,
        color: Palette.neutral[500],
        paddingHorizontal: 2,
    },
    // 드롭다운 스타일
    dropdownContainer: {
        marginTop: Spacing.xs,
        backgroundColor: '#fff',
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Palette.neutral[200],
        ...Shadows.md,
        zIndex: 1000, // 다른 요소 위에 표시
        overflow: 'hidden',
    },
    dropdownScroll: {
        maxHeight: 200, // 최대 높이 제한
    },
    dropdownItem: {
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: Palette.neutral[100],
    },
    dropdownItemText: {
        fontSize: FontSize.md,
        color: Palette.neutral[800],
    },
});
