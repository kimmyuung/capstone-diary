import React from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    Modal,
} from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';

interface PreviewModalProps {
    visible: boolean;
    title: string;
    content: string;
    onConfirm: () => void;
    onEdit: () => void;
    onCancel: () => void;
    isLoading?: boolean;
}

export const PreviewModal: React.FC<PreviewModalProps> = ({
    visible,
    title,
    content,
    onConfirm,
    onEdit,
    onCancel,
    isLoading = false,
}) => {
    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onCancel}
        >
            <View style={styles.overlay}>
                <View style={styles.modalContainer}>
                    {/* 헤더 */}
                    <View style={styles.header}>
                        <IconSymbol name="doc.text.fill" size={24} color="#6C63FF" />
                        <Text style={styles.headerTitle}>일기 미리보기</Text>
                        <TouchableOpacity onPress={onCancel} style={styles.closeButton}>
                            <IconSymbol name="xmark" size={20} color="#666" />
                        </TouchableOpacity>
                    </View>

                    {/* 컨텐츠 */}
                    <ScrollView style={styles.contentContainer}>
                        <View style={styles.titleSection}>
                            <Text style={styles.label}>제목</Text>
                            <Text style={styles.titleText}>{title || '(제목 없음)'}</Text>
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.contentSection}>
                            <Text style={styles.label}>내용</Text>
                            <Text style={styles.contentText}>
                                {content || '(내용 없음)'}
                            </Text>
                        </View>
                    </ScrollView>

                    {/* 안내 메시지 */}
                    <View style={styles.infoContainer}>
                        <IconSymbol name="info.circle.fill" size={16} color="#6C63FF" />
                        <Text style={styles.infoText}>
                            저장하면 일기가 암호화되어 안전하게 보관됩니다
                        </Text>
                    </View>

                    {/* 버튼 */}
                    <View style={styles.buttonContainer}>
                        <TouchableOpacity
                            style={[styles.button, styles.cancelButton]}
                            onPress={onCancel}
                            disabled={isLoading}
                        >
                            <Text style={styles.cancelButtonText}>취소</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.button, styles.editButton]}
                            onPress={onEdit}
                            disabled={isLoading}
                        >
                            <IconSymbol name="pencil" size={16} color="#6C63FF" />
                            <Text style={styles.editButtonText}>수정하기</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.button, styles.confirmButton]}
                            onPress={onConfirm}
                            disabled={isLoading}
                        >
                            <IconSymbol name="checkmark" size={16} color="#fff" />
                            <Text style={styles.confirmButtonText}>저장 확인</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContainer: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '80%',
        paddingBottom: 34, // Safe area
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginLeft: 8,
        flex: 1,
    },
    closeButton: {
        padding: 4,
    },
    contentContainer: {
        padding: 20,
        maxHeight: 300,
    },
    titleSection: {
        marginBottom: 16,
    },
    label: {
        fontSize: 12,
        fontWeight: '600',
        color: '#999',
        marginBottom: 8,
        textTransform: 'uppercase',
    },
    titleText: {
        fontSize: 20,
        fontWeight: '600',
        color: '#333',
    },
    divider: {
        height: 1,
        backgroundColor: '#f0f0f0',
        marginVertical: 16,
    },
    contentSection: {},
    contentText: {
        fontSize: 16,
        color: '#333',
        lineHeight: 26,
    },
    infoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F0EFFF',
        padding: 12,
        marginHorizontal: 20,
        borderRadius: 8,
        gap: 8,
    },
    infoText: {
        fontSize: 13,
        color: '#6C63FF',
        flex: 1,
    },
    buttonContainer: {
        flexDirection: 'row',
        padding: 20,
        gap: 12,
    },
    button: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 12,
        gap: 6,
    },
    cancelButton: {
        backgroundColor: '#f0f0f0',
    },
    cancelButtonText: {
        color: '#666',
        fontWeight: '600',
    },
    editButton: {
        backgroundColor: '#F0EFFF',
    },
    editButtonText: {
        color: '#6C63FF',
        fontWeight: '600',
    },
    confirmButton: {
        backgroundColor: '#6C63FF',
    },
    confirmButtonText: {
        color: '#fff',
        fontWeight: '600',
    },
});

export default PreviewModal;
