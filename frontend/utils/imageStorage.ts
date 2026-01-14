import * as FileSystem from 'expo-file-system';

// @ts-ignore: documentDirectory exists in Expo FileSystem but types might be outdated/confused
const PENDING_UPLOADS_DIR = FileSystem.documentDirectory + 'pending_uploads/';

/**
 * Initialize the pending uploads directory
 */
const ensureDirExists = async () => {
    const dirInfo = await FileSystem.getInfoAsync(PENDING_UPLOADS_DIR);
    if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(PENDING_UPLOADS_DIR, { intermediates: true });
    }
};

/**
 * Save a temporary cache image to persistent storage
 * @param sourceUri The temporary URI from ImagePicker
 * @returns The persistent URI in document directory
 */
export const saveImageToOfflineStorage = async (sourceUri: string): Promise<string> => {
    try {
        await ensureDirExists();

        const filename = sourceUri.split('/').pop() || `image_${Date.now()}.jpg`;
        const destination = PENDING_UPLOADS_DIR + filename;

        // Copy file instead of move to keep original in cache (safer)
        await FileSystem.copyAsync({
            from: sourceUri,
            to: destination
        });

        if (__DEV__) {
            console.log('[ImageStorage] Saved to persistent storage:', destination);
        }

        return destination;
    } catch (error) {
        console.error('[ImageStorage] Failed to save image:', error);
        // Fallback to source URI if copy fails (better than nothing)
        return sourceUri;
    }
};

/**
 * Clean up images after successful upload
 * @param uris List of persistent URIs to delete
 */
export const cleanupUploadedImages = async (uris: string[]) => {
    for (const uri of uris) {
        try {
            // Only delete if it's in our pending folder
            if (uri.includes('pending_uploads')) {
                await FileSystem.deleteAsync(uri, { idempotent: true });
                if (__DEV__) {
                    console.log('[ImageStorage] Cleaned up:', uri);
                }
            }
        } catch (error) {
            console.warn('[ImageStorage] Failed to cleanup image:', uri, error);
        }
    }
};
