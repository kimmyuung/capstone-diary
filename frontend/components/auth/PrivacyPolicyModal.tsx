/**
 * 개인정보처리방침 모달 컴포넌트
 * 
 * 회원가입 시 개인정보처리방침을 보여주고 동의를 받습니다.
 */
import React from 'react';
import {
    View,
    Text,
    Modal,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
} from 'react-native';
import { Palette, FontSize, FontWeight, Spacing, BorderRadius, Shadows } from '@/constants/theme';

interface PrivacyPolicyModalProps {
    visible: boolean;
    onClose: () => void;
}

export const PrivacyPolicyModal = ({ visible, onClose }: PrivacyPolicyModalProps) => {
    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <View style={styles.header}>
                        <Text style={styles.title}>📋 개인정보처리방침</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Text style={styles.closeButtonText}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.content} showsVerticalScrollIndicator={true}>
                        <Text style={styles.sectionTitle}>1. 개인정보의 수집 및 이용 목적</Text>
                        <Text style={styles.paragraph}>
                            감성일기 앱(이하 "앱")은 다음의 목적을 위해 개인정보를 수집 및 이용합니다:{'\n\n'}
                            • 회원 가입 및 관리{'\n'}
                            • 서비스 제공 및 운영{'\n'}
                            • AI 기반 감정 분석 서비스 제공{'\n'}
                            • 서비스 개선 및 통계 분석
                        </Text>

                        <Text style={styles.sectionTitle}>2. 수집하는 개인정보 항목</Text>
                        <Text style={styles.paragraph}>
                            필수 수집 항목:{'\n'}
                            • 아이디, 이메일, 비밀번호{'\n\n'}
                            선택 수집 항목:{'\n'}
                            • 위치 정보 (일기 작성 시){'\n'}
                            • 음성 녹음 (음성 일기 작성 시){'\n'}
                            • 기기 정보 (푸시 알림용)
                        </Text>

                        <Text style={styles.sectionTitle}>3. 개인정보의 보유 및 이용 기간</Text>
                        <Text style={styles.paragraph}>
                            • 회원 탈퇴 시까지 보유{'\n'}
                            • 탈퇴 후 30일 이내 파기{'\n'}
                            • 관련 법령에 따른 보존 기간이 있는 경우 해당 기간 준수
                        </Text>

                        <Text style={styles.sectionTitle}>4. 개인정보의 암호화</Text>
                        <Text style={styles.paragraph}>
                            사용자의 일기 내용은 AES-256 알고리즘으로 암호화되어 저장됩니다.
                            암호화된 데이터는 사용자 본인 외에는 열람할 수 없습니다.
                        </Text>

                        <Text style={styles.sectionTitle}>5. 개인정보의 제3자 제공</Text>
                        <Text style={styles.paragraph}>
                            앱은 사용자의 동의 없이 개인정보를 제3자에게 제공하지 않습니다.
                            다만, AI 감정 분석을 위해 익명화된 텍스트가 AI 서비스 제공업체(Google)에 전송될 수 있습니다.
                        </Text>

                        <Text style={styles.sectionTitle}>6. 정보주체의 권리</Text>
                        <Text style={styles.paragraph}>
                            사용자는 언제든지 다음 권리를 행사할 수 있습니다:{'\n\n'}
                            • 개인정보 열람 요청{'\n'}
                            • 개인정보 정정 요청{'\n'}
                            • 개인정보 삭제 요청{'\n'}
                            • 계정 탈퇴
                        </Text>

                        <Text style={styles.sectionTitle}>7. 개인정보 보호책임자</Text>
                        <Text style={styles.paragraph}>
                            성명: 김명호{'\n'}
                            이메일: support@emotiondiary.app
                        </Text>

                        <Text style={styles.lastUpdated}>
                            최종 수정일: 2026년 1월 15일
                        </Text>
                    </ScrollView>

                    <TouchableOpacity style={styles.confirmButton} onPress={onClose}>
                        <Text style={styles.confirmButtonText}>확인</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.lg,
    },
    container: {
        backgroundColor: '#fff',
        borderRadius: BorderRadius.xl,
        maxHeight: '85%',
        width: '100%',
        maxWidth: 500,
        ...Shadows.lg,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: Spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: Palette.neutral[200],
    },
    title: {
        fontSize: FontSize.lg,
        fontWeight: FontWeight.bold,
        color: Palette.neutral[800],
    },
    closeButton: {
        padding: Spacing.sm,
    },
    closeButtonText: {
        fontSize: FontSize.lg,
        color: Palette.neutral[500],
    },
    content: {
        padding: Spacing.lg,
        maxHeight: 400,
    },
    sectionTitle: {
        fontSize: FontSize.md,
        fontWeight: FontWeight.bold,
        color: Palette.neutral[800],
        marginTop: Spacing.md,
        marginBottom: Spacing.sm,
    },
    paragraph: {
        fontSize: FontSize.sm,
        color: Palette.neutral[600],
        lineHeight: 22,
        marginBottom: Spacing.md,
    },
    lastUpdated: {
        fontSize: FontSize.xs,
        color: Palette.neutral[400],
        textAlign: 'center',
        marginTop: Spacing.lg,
        marginBottom: Spacing.md,
    },
    confirmButton: {
        backgroundColor: Palette.primary[500],
        margin: Spacing.lg,
        marginTop: 0,
        padding: Spacing.md,
        borderRadius: BorderRadius.full,
        alignItems: 'center',
    },
    confirmButtonText: {
        color: '#fff',
        fontSize: FontSize.md,
        fontWeight: FontWeight.bold,
    },
});

export default PrivacyPolicyModal;
