/**
 * Server-side encryption utility for sensitive settings
 * Uses AES-256-GCM encryption with the SETTINGS_ENCRYPTION_KEY env variable
 *
 * IMPORTANT: This module must only be used on the server side (API routes, server components)
 * Never import this in client components
 */

import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12 // GCM recommended IV length
const AUTH_TAG_LENGTH = 16
const KEY_LENGTH = 32 // 256 bits

/**
 * Get the encryption key from environment variable
 * The key should be a 64-character hex string (32 bytes)
 */
function getEncryptionKey(): Buffer {
    const keyHex = process.env.SETTINGS_ENCRYPTION_KEY

    if (!keyHex) {
        throw new Error(
            'SETTINGS_ENCRYPTION_KEY environment variable is not set. ' +
            'Generate one with: openssl rand -hex 32'
        )
    }

    if (keyHex.length !== 64) {
        throw new Error(
            'SETTINGS_ENCRYPTION_KEY must be a 64-character hex string (32 bytes). ' +
            'Generate one with: openssl rand -hex 32'
        )
    }

    return Buffer.from(keyHex, 'hex')
}

/**
 * Encrypt a plaintext string
 * Returns a base64 encoded string in format: iv:ciphertext:authTag
 */
export function encrypt(plaintext: string): string {
    const key = getEncryptionKey()
    const iv = crypto.randomBytes(IV_LENGTH)

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
        authTagLength: AUTH_TAG_LENGTH
    })

    let encrypted = cipher.update(plaintext, 'utf8', 'base64')
    encrypted += cipher.final('base64')

    const authTag = cipher.getAuthTag()

    // Combine iv:ciphertext:authTag and encode as base64
    const combined = Buffer.concat([
        iv,
        Buffer.from(encrypted, 'base64'),
        authTag
    ])

    return combined.toString('base64')
}

/**
 * Decrypt an encrypted string
 * Expects base64 encoded string in format: iv:ciphertext:authTag
 */
export function decrypt(encryptedData: string): string {
    const key = getEncryptionKey()

    // Decode the combined data
    const combined = Buffer.from(encryptedData, 'base64')

    // Extract iv, ciphertext, and authTag
    const iv = combined.subarray(0, IV_LENGTH)
    const authTag = combined.subarray(combined.length - AUTH_TAG_LENGTH)
    const ciphertext = combined.subarray(IV_LENGTH, combined.length - AUTH_TAG_LENGTH)

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
        authTagLength: AUTH_TAG_LENGTH
    })
    decipher.setAuthTag(authTag)

    let decrypted = decipher.update(ciphertext)
    decrypted = Buffer.concat([decrypted, decipher.final()])

    return decrypted.toString('utf8')
}

/**
 * Mask a sensitive value for display purposes
 * Shows first 4 and last 4 characters, rest as asterisks
 * e.g., "sk_live_abc123xyz789" -> "sk_l****x789"
 */
export function maskSensitiveValue(value: string, showChars: number = 4): string {
    if (!value || value.length <= showChars * 2) {
        return '*'.repeat(value?.length || 8)
    }

    const prefix = value.substring(0, showChars)
    const suffix = value.substring(value.length - showChars)
    const maskedLength = Math.min(value.length - showChars * 2, 8)

    return `${prefix}${'*'.repeat(maskedLength)}${suffix}`
}

/**
 * Verify if the encryption key is configured correctly
 * Used for health checks
 */
export function isEncryptionConfigured(): boolean {
    try {
        getEncryptionKey()
        return true
    } catch {
        return false
    }
}

/**
 * Generate a new encryption key (for setup purposes)
 * Returns a 64-character hex string
 */
export function generateEncryptionKey(): string {
    return crypto.randomBytes(KEY_LENGTH).toString('hex')
}
