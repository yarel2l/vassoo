import { createClient } from '@/lib/supabase/client'

const PRODUCT_IMAGES_BUCKET = 'product-images'
const STORE_LOGOS_BUCKET = 'store-logos'

export interface UploadResult {
    url: string
    path: string
}

/**
 * Storage service for uploading and managing files in Supabase Storage
 */
export const storageService = {
    /**
     * Upload a product image
     * @param file - The file to upload
     * @param productId - The product ID (used for organizing files)
     * @returns The public URL and path of the uploaded file
     */
    async uploadProductImage(file: File, productId: string): Promise<UploadResult> {
        const supabase = createClient()

        // Generate a unique filename
        const fileExt = file.name.split('.').pop()
        const fileName = `${productId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

        const { data, error } = await supabase.storage
            .from(PRODUCT_IMAGES_BUCKET)
            .upload(fileName, file, {
                cacheControl: '3600',
                upsert: false,
            })

        if (error) {
            console.error('Error uploading product image:', error)
            throw error
        }

        // Get the public URL
        const { data: urlData } = supabase.storage
            .from(PRODUCT_IMAGES_BUCKET)
            .getPublicUrl(data.path)

        return {
            url: urlData.publicUrl,
            path: data.path,
        }
    },

    /**
     * Upload multiple product images
     * @param files - Array of files to upload
     * @param productId - The product ID
     * @returns Array of uploaded file URLs and paths
     */
    async uploadProductImages(files: File[], productId: string): Promise<UploadResult[]> {
        const results: UploadResult[] = []

        for (const file of files) {
            const result = await this.uploadProductImage(file, productId)
            results.push(result)
        }

        return results
    },

    /**
     * Delete a product image
     * @param path - The path of the file to delete
     */
    async deleteProductImage(path: string): Promise<void> {
        const supabase = createClient()

        const { error } = await supabase.storage
            .from(PRODUCT_IMAGES_BUCKET)
            .remove([path])

        if (error) {
            console.error('Error deleting product image:', error)
            throw error
        }
    },

    /**
     * Upload a store logo
     * @param file - The file to upload
     * @param storeId - The store ID
     * @returns The public URL and path of the uploaded file
     */
    async uploadStoreLogo(file: File, storeId: string): Promise<UploadResult> {
        const supabase = createClient()

        // Generate a unique filename
        const fileExt = file.name.split('.').pop()
        const fileName = `${storeId}/logo-${Date.now()}.${fileExt}`

        const { data, error } = await supabase.storage
            .from(STORE_LOGOS_BUCKET)
            .upload(fileName, file, {
                cacheControl: '3600',
                upsert: true, // Allow overwriting existing logo
            })

        if (error) {
            console.error('Error uploading store logo:', error)
            throw error
        }

        // Get the public URL
        const { data: urlData } = supabase.storage
            .from(STORE_LOGOS_BUCKET)
            .getPublicUrl(data.path)

        return {
            url: urlData.publicUrl,
            path: data.path,
        }
    },

    /**
     * Get a signed URL for a private file (if needed)
     * @param bucket - The bucket name
     * @param path - The file path
     * @param expiresIn - Expiration time in seconds (default: 1 hour)
     */
    async getSignedUrl(bucket: string, path: string, expiresIn: number = 3600): Promise<string> {
        const supabase = createClient()

        const { data, error } = await supabase.storage
            .from(bucket)
            .createSignedUrl(path, expiresIn)

        if (error) {
            console.error('Error creating signed URL:', error)
            throw error
        }

        return data.signedUrl
    },
}
