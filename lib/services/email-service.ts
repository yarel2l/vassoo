/**
 * Email Service
 *
 * Provides email sending functionality using configuration from Platform Settings.
 * Supports both Resend API and SMTP (via nodemailer).
 *
 * IMPORTANT: This module must only be used on the server side (API routes, server components)
 */

import {
    platformSettingsService,
    type EmailConfig
} from '@/lib/services/platform-settings-service'

// ============================================
// Types
// ============================================

export interface SendEmailOptions {
    to: string | string[]
    subject: string
    html?: string
    text?: string
    replyTo?: string
    cc?: string | string[]
    bcc?: string | string[]
}

export interface EmailResult {
    success: boolean
    messageId?: string
    error?: string
}

// ============================================
// Email Templates
// ============================================

export const emailTemplates = {
    orderConfirmation: (data: {
        orderNumber: string
        customerName: string
        items: Array<{ name: string; quantity: number; price: number }>
        total: number
        deliveryAddress: string
    }) => ({
        subject: `Order Confirmation #${data.orderNumber}`,
        html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #f59e0b; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">Vassoo</h1>
        </div>
        <div style="padding: 20px; background: #fff;">
          <h2 style="color: #333;">Thank you for your order, ${data.customerName}!</h2>
          <p style="color: #666;">Your order #${data.orderNumber} has been confirmed.</p>

          <h3 style="color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px;">Order Summary</h3>
          <table style="width: 100%; border-collapse: collapse;">
            ${data.items.map(item => `
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #eee;">
                  ${item.name} x ${item.quantity}
                </td>
                <td style="padding: 10px 0; border-bottom: 1px solid #eee; text-align: right;">
                  $${(item.price * item.quantity).toFixed(2)}
                </td>
              </tr>
            `).join('')}
            <tr>
              <td style="padding: 15px 0; font-weight: bold;">Total</td>
              <td style="padding: 15px 0; font-weight: bold; text-align: right;">
                $${data.total.toFixed(2)}
              </td>
            </tr>
          </table>

          <h3 style="color: #333; margin-top: 20px;">Delivery Address</h3>
          <p style="color: #666;">${data.deliveryAddress}</p>
        </div>
        <div style="background: #f5f5f5; padding: 20px; text-align: center; color: #666; font-size: 12px;">
          <p>You're receiving this email because you placed an order on Vassoo.</p>
        </div>
      </div>
    `
    }),

    orderStatusUpdate: (data: {
        orderNumber: string
        customerName: string
        status: string
        statusMessage: string
    }) => ({
        subject: `Order Update #${data.orderNumber} - ${data.status}`,
        html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #f59e0b; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">Vassoo</h1>
        </div>
        <div style="padding: 20px; background: #fff;">
          <h2 style="color: #333;">Hi ${data.customerName},</h2>
          <p style="color: #666;">Your order #${data.orderNumber} has been updated.</p>

          <div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="color: #166534; margin: 0 0 10px 0;">${data.status}</h3>
            <p style="color: #166534; margin: 0;">${data.statusMessage}</p>
          </div>

          <p style="color: #666;">Track your order in your account dashboard.</p>
        </div>
        <div style="background: #f5f5f5; padding: 20px; text-align: center; color: #666; font-size: 12px;">
          <p>You're receiving this email because you placed an order on Vassoo.</p>
        </div>
      </div>
    `
    }),

    welcomeEmail: (data: {
        userName: string
    }) => ({
        subject: 'Welcome to Vassoo!',
        html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #f59e0b; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">Welcome to Vassoo!</h1>
        </div>
        <div style="padding: 20px; background: #fff;">
          <h2 style="color: #333;">Hi ${data.userName},</h2>
          <p style="color: #666;">
            Thank you for joining Vassoo! We're excited to have you as part of our community.
          </p>
          <p style="color: #666;">
            Explore our premium selection of wines, spirits, beers, and cocktail ingredients
            from multiple trusted stores.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://vassoo.com"
               style="background: #f59e0b; color: white; padding: 12px 30px;
                      text-decoration: none; border-radius: 6px; font-weight: bold;">
              Start Shopping
            </a>
          </div>
        </div>
        <div style="background: #f5f5f5; padding: 20px; text-align: center; color: #666; font-size: 12px;">
          <p>You're receiving this email because you signed up for Vassoo.</p>
        </div>
      </div>
    `
    })
}

// ============================================
// Email Service
// ============================================

class EmailService {
    /**
     * Check if email service is configured
     */
    async isConfigured(): Promise<boolean> {
        return platformSettingsService.isEmailConfigured()
    }

    /**
     * Get the current email configuration (without secrets)
     */
    async getConfig(): Promise<EmailConfig | null> {
        return platformSettingsService.getEmailConfig()
    }

    /**
     * Send an email using the configured provider
     */
    async sendEmail(options: SendEmailOptions): Promise<EmailResult> {
        const config = await platformSettingsService.getEmailConfig()

        if (!config) {
            return {
                success: false,
                error: 'Email is not configured'
            }
        }

        try {
            if (config.provider === 'resend') {
                return await this.sendWithResend(options, config)
            }

            if (config.provider === 'smtp') {
                return await this.sendWithSmtp(options, config)
            }

            return {
                success: false,
                error: `Unknown email provider: ${config.provider}`
            }
        } catch (error) {
            console.error('Email send error:', error)
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to send email'
            }
        }
    }

    /**
     * Send email using Resend API
     */
    private async sendWithResend(
        options: SendEmailOptions,
        config: EmailConfig
    ): Promise<EmailResult> {
        const apiKey = await platformSettingsService.getResendApiKey()

        if (!apiKey) {
            return {
                success: false,
                error: 'Resend API key is not configured'
            }
        }

        // Dynamic import to avoid loading if not using Resend
        const { Resend } = await import('resend')
        const resend = new Resend(apiKey)

        const { data, error } = await resend.emails.send({
            from: `${config.fromName} <${config.fromAddress}>`,
            to: Array.isArray(options.to) ? options.to : [options.to],
            subject: options.subject,
            html: options.html || '',
            text: options.text,
            replyTo: options.replyTo,
            cc: options.cc ? (Array.isArray(options.cc) ? options.cc : [options.cc]) : undefined,
            bcc: options.bcc ? (Array.isArray(options.bcc) ? options.bcc : [options.bcc]) : undefined,
        } as any)

        if (error) {
            return {
                success: false,
                error: error.message
            }
        }

        return {
            success: true,
            messageId: data?.id
        }
    }

    /**
     * Send email using SMTP (nodemailer)
     */
    private async sendWithSmtp(
        options: SendEmailOptions,
        config: EmailConfig
    ): Promise<EmailResult> {
        if (!config.smtpHost || !config.smtpPort) {
            return {
                success: false,
                error: 'SMTP host and port are not configured'
            }
        }

        const smtpPassword = await platformSettingsService.getSmtpPassword()

        if (!smtpPassword) {
            return {
                success: false,
                error: 'SMTP password is not configured'
            }
        }

        // Dynamic import to avoid loading if not using SMTP
        const nodemailer = await import('nodemailer')

        const transporter = nodemailer.createTransport({
            host: config.smtpHost,
            port: config.smtpPort,
            secure: config.smtpSecure ?? false,
            auth: {
                user: config.smtpUser,
                pass: smtpPassword
            }
        })

        const info = await transporter.sendMail({
            from: `"${config.fromName}" <${config.fromAddress}>`,
            to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
            subject: options.subject,
            html: options.html,
            text: options.text,
            replyTo: options.replyTo,
            cc: options.cc,
            bcc: options.bcc
        })

        return {
            success: true,
            messageId: info.messageId
        }
    }

    // ----------------------------------------
    // Convenience methods for common emails
    // ----------------------------------------

    async sendOrderConfirmation(
        to: string,
        data: Parameters<typeof emailTemplates.orderConfirmation>[0]
    ): Promise<EmailResult> {
        const template = emailTemplates.orderConfirmation(data)
        return this.sendEmail({
            to,
            subject: template.subject,
            html: template.html
        })
    }

    async sendOrderStatusUpdate(
        to: string,
        data: Parameters<typeof emailTemplates.orderStatusUpdate>[0]
    ): Promise<EmailResult> {
        const template = emailTemplates.orderStatusUpdate(data)
        return this.sendEmail({
            to,
            subject: template.subject,
            html: template.html
        })
    }

    async sendWelcomeEmail(
        to: string,
        data: Parameters<typeof emailTemplates.welcomeEmail>[0]
    ): Promise<EmailResult> {
        const template = emailTemplates.welcomeEmail(data)
        return this.sendEmail({
            to,
            subject: template.subject,
            html: template.html
        })
    }
}

// Export singleton instance
export const emailService = new EmailService()

// Export class for testing
export { EmailService }
