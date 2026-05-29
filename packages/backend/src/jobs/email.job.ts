import { Job } from 'bull';
import nodemailer from 'nodemailer';
import Mail from 'nodemailer/lib/mailer';
import { config } from '../config';
import { logger } from '../utils/logger';
import { UserModel } from '../models';
import { emailNotificationsQueue } from './index';

interface EmailData {
  type: 'welcome' | 'link_expired' | 'password_reset' | 'weekly_digest' | 'threshold_reached';
  userId: string;
  email?: string;
  linkId?: string;
  shortCode?: string;
  token?: string;
  milestone?: number;
  [key: string]: unknown;
}

let transporter: Mail | null = null;

function getTransporter(): Mail {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.port === 465,
      auth: {
        user: config.smtp.user || '',
        pass: config.smtp.pass || '',
      },
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
    });

    transporter.verify().then(() => {
      logger.info('SMTP transport verified');
    }).catch((error) => {
      logger.warn('SMTP transport verification failed, emails will be logged', { error: error.message });
    });
  }
  return transporter;
}

function getEmailContent(
  type: EmailData['type'],
  data: EmailData
): { subject: string; html: string; text: string } {
  switch (type) {
    case 'welcome':
      return {
        subject: 'Welcome to URL Shortener!',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Welcome to URL Shortener!</h2>
            <p>Thank you for creating an account. We're excited to have you on board.</p>
            <p>With our service you can:</p>
            <ul>
              <li>Create short, memorable links</li>
              <li>Track clicks and analytics</li>
              <li>Generate QR codes for your links</li>
              <li>Manage your links with custom aliases</li>
            </ul>
            <p>If you have any questions, feel free to reach out to our support team.</p>
            <p style="color: #6b7280; font-size: 12px;">© ${new Date().getFullYear()} URL Shortener. All rights reserved.</p>
          </div>
        `,
        text: `Welcome to URL Shortener!\n\nThank you for creating an account. We're excited to have you on board.\n\nWith our service you can:\n- Create short, memorable links\n- Track clicks and analytics\n- Generate QR codes for your links\n- Manage your links with custom aliases`,
      };

    case 'link_expired':
      return {
        subject: 'Your link has expired',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #dc2626;">Link Expired</h2>
            <p>Your link has expired and is no longer active.</p>
            <p><strong>Link:</strong> ${config.urls.redirectBaseUrl}/${data.shortCode || 'unknown'}</p>
            <p>If you'd like to continue using this link, please log in to your account and extend the expiration date or create a new link.</p>
            <a href="${config.urls.apiBaseUrl}/links" style="display: inline-block; padding: 10px 20px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 4px;">Go to Dashboard</a>
            <p style="color: #6b7280; font-size: 12px; margin-top: 20px;">© ${new Date().getFullYear()} URL Shortener. All rights reserved.</p>
          </div>
        `,
        text: `Your link has expired\n\nLink: ${config.urls.redirectBaseUrl}/${data.shortCode || 'unknown'}\n\nIf you'd like to continue using this link, please log in to your account and extend the expiration date or create a new link.`,
      };

    case 'password_reset':
      return {
        subject: 'Password Reset Request',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Password Reset</h2>
            <p>We received a request to reset your password.</p>
            <p>Click the button below to reset your password. This link will expire in 1 hour.</p>
            <a href="${config.urls.apiBaseUrl}/auth/reset-password?token=${data.token || ''}" style="display: inline-block; padding: 10px 20px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 4px;">Reset Password</a>
            <p style="margin-top: 20px;">If you didn't request this, you can safely ignore this email.</p>
            <p style="color: #6b7280; font-size: 12px;">© ${new Date().getFullYear()} URL Shortener. All rights reserved.</p>
          </div>
        `,
        text: `Password Reset\n\nWe received a request to reset your password.\n\nVisit: ${config.urls.apiBaseUrl}/auth/reset-password?token=${data.token || ''}\n\nIf you didn't request this, you can safely ignore this email.`,
      };

    case 'weekly_digest':
      return {
        subject: 'Your Weekly Link Digest',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Weekly Digest</h2>
            <p>Here's your weekly summary of link activity.</p>
            <p>Log in to your dashboard to see detailed analytics and insights.</p>
            <a href="${config.urls.apiBaseUrl}/analytics" style="display: inline-block; padding: 10px 20px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 4px;">View Analytics</a>
            <p style="color: #6b7280; font-size: 12px; margin-top: 20px;">© ${new Date().getFullYear()} URL Shortener. All rights reserved.</p>
          </div>
        `,
        text: `Weekly Digest\n\nHere's your weekly summary of link activity.\n\nLog in to your dashboard to see detailed analytics and insights.\n\n${config.urls.apiBaseUrl}/analytics`,
      };

    case 'threshold_reached':
      return {
        subject: `Milestone Reached: ${data.milestone || 0} Clicks!`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #059669;">Milestone Reached! 🎉</h2>
            <p>Your link has reached <strong>${data.milestone || 0} clicks</strong>!</p>
            <p><strong>Link:</strong> ${config.urls.redirectBaseUrl}/${data.shortCode || 'unknown'}</p>
            <p>Keep sharing your link to reach even more people.</p>
            <a href="${config.urls.apiBaseUrl}/analytics" style="display: inline-block; padding: 10px 20px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 4px;">View Analytics</a>
            <p style="color: #6b7280; font-size: 12px; margin-top: 20px;">© ${new Date().getFullYear()} URL Shortener. All rights reserved.</p>
          </div>
        `,
        text: `Milestone Reached: ${data.milestone || 0} Clicks!\n\nYour link has reached ${data.milestone || 0} clicks!\n\nLink: ${config.urls.redirectBaseUrl}/${data.shortCode || 'unknown'}\n\nKeep sharing your link to reach even more people.`,
      };

    default:
      return {
        subject: 'Notification from URL Shortener',
        html: '<p>You have a new notification from URL Shortener.</p>',
        text: 'You have a new notification from URL Shortener.',
      };
  }
}

export async function sendEmail(job: Job<EmailData>): Promise<void> {
  const data = job.data;
  logger.info('Processing email', { type: data.type, userId: data.userId, jobId: job.id });

  let recipientEmail = data.email;

  if (!recipientEmail) {
    try {
      const user = await UserModel.findById(data.userId);
      if (!user) {
        logger.warn('User not found for email', { userId: data.userId, type: data.type });
        return;
      }
      recipientEmail = user.email;
    } catch (error) {
      logger.error('Failed to fetch user for email', { userId: data.userId, error: (error as Error).message });
      throw error;
    }
  }

  if (!recipientEmail) {
    logger.warn('No recipient email available', { userId: data.userId, type: data.type });
    return;
  }

  const { subject, html, text } = getEmailContent(data.type, data);

  try {
    const transport = getTransporter();
    const info = await transport.sendMail({
      from: config.smtp.from,
      to: recipientEmail,
      subject,
      html,
      text,
    });

    logger.info('Email sent successfully', {
      type: data.type,
      to: recipientEmail,
      messageId: info.messageId,
      jobId: job.id,
    });
  } catch (error) {
    logger.error('Failed to send email', {
      type: data.type,
      to: recipientEmail,
      error: (error as Error).message,
      jobId: job.id,
    });
    throw error;
  }
}

export async function sendBatchEmails(job: Job<{ emails: EmailData[] }>): Promise<void> {
  const { emails } = job.data;
  logger.info('Processing batch emails', { count: emails.length, jobId: job.id });

  const transport = getTransporter();
  const results = await Promise.allSettled(
    emails.map(async (emailData) => {
      const { subject, html, text } = getEmailContent(emailData.type, emailData);
      return transport.sendMail({
        from: config.smtp.from,
        to: emailData.email || '',
        subject,
        html,
        text,
      });
    })
  );

  const successCount = results.filter((r) => r.status === 'fulfilled').length;
  const failureCount = results.filter((r) => r.status === 'rejected').length;

  logger.info('Batch email processing completed', {
    total: emails.length,
    success: successCount,
    failed: failureCount,
    jobId: job.id,
  });

  if (failureCount > 0) {
    const failures = results
      .map((r, i) => (r.status === 'rejected' ? { index: i, error: r.reason } : null))
      .filter(Boolean);
    logger.error('Batch email failures', { failures });
  }
}

export function registerEmailProcessor(): void {
  emailNotificationsQueue.process('welcome_email', sendEmail);
  emailNotificationsQueue.process('link_expired', sendEmail);
  emailNotificationsQueue.process('password_reset', sendEmail);
  emailNotificationsQueue.process('weekly_digest', sendEmail);
  emailNotificationsQueue.process('threshold_reached', sendEmail);
  emailNotificationsQueue.process('batch', 1, sendBatchEmails);

  logger.info('Email processor registered');
}
