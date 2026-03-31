import { createTransporter, emailTemplates } from '../config/email.js';
import Message from '../models/Message.js';
import testmailService from './testmailService.js';

class EmailService {
  constructor() {
    this.transporter = null;
    this.testMode = process.env.NODE_ENV === 'test' || process.env.USE_TESTMAIL === 'true';
  }

  // Initialize transporter
  initTransporter() {
    if (!this.transporter) {
      this.transporter = createTransporter();
    }
    return this.transporter;
  }

  // Send welcome email with active promotions
  async sendWelcomeEmail(customer) {
    try {
      const transporter = this.initTransporter();

      // Get active promotions for new customers
      const activePromotions = await Message.find({
        status: 'active',
        sendOnLogin: true,
        $or: [
          { targetAudience: 'all' },
          { targetAudience: 'new' }
        ],
        $and: [
          {
            $or: [
              { validUntil: { $exists: false } },
              { validUntil: { $gte: new Date() } }
            ]
          }
        ]
      }).limit(5);

      const emailContent = emailTemplates.welcome(
        customer.fullName || customer.email.split('@')[0],
        activePromotions
      );

      // Use testmail inbox if in test mode
      const recipientEmail = this.testMode ? 
        testmailService.getInboxAddress('welcome') : 
        customer.email;

      const mailOptions = {
        from: `"Saranya Jewellery" <${process.env.EMAIL_USER}>`,
        to: recipientEmail,
        subject: emailContent.subject,
        html: emailContent.html
      };

      const info = await transporter.sendMail(mailOptions);

      // Update sent count for messages
      if (activePromotions.length > 0) {
        await Message.updateMany(
          { _id: { $in: activePromotions.map(p => p._id) } },
          { $inc: { sentCount: 1 } }
        );
      }

      console.log('Welcome email sent:', info.messageId);
      if (this.testMode) {
        console.log('📧 Test mode: Email sent to', recipientEmail);
        console.log('🔍 View at:', testmailService.getWebViewUrl('welcome'));
      }
      
      return { 
        success: true, 
        messageId: info.messageId,
        testMode: this.testMode,
        recipientEmail
      };
    } catch (error) {
      console.error('Error sending welcome email:', error);
      return { success: false, error: error.message };
    }
  }

  // Send specific promotion to customer
  async sendPromotionEmail(customer, promotionId) {
    try {
      const transporter = this.initTransporter();

      const promotion = await Message.findById(promotionId);
      if (!promotion || !promotion.isValid()) {
        throw new Error('Invalid or inactive promotion');
      }

      const emailContent = emailTemplates.promotion(
        customer.fullName || customer.email.split('@')[0],
        promotion
      );

      // Use testmail inbox if in test mode
      const recipientEmail = this.testMode ? 
        testmailService.getInboxAddress('promotion') : 
        customer.email;

      const mailOptions = {
        from: `"Saranya Jewellery" <${process.env.EMAIL_USER}>`,
        to: recipientEmail,
        subject: emailContent.subject,
        html: emailContent.html
      };

      const info = await transporter.sendMail(mailOptions);

      // Update sent count
      promotion.sentCount += 1;
      await promotion.save();

      console.log('Promotion email sent:', info.messageId);
      if (this.testMode) {
        console.log('📧 Test mode: Email sent to', recipientEmail);
        console.log('🔍 View at:', testmailService.getWebViewUrl('promotion'));
      }

      return { 
        success: true, 
        messageId: info.messageId,
        testMode: this.testMode,
        recipientEmail
      };
    } catch (error) {
      console.error('Error sending promotion email:', error);
      return { success: false, error: error.message };
    }
  }

  // Send custom email
  async sendCustomEmail(to, subject, html) {
    try {
      const transporter = this.initTransporter();

      // Use testmail inbox if in test mode
      const recipientEmail = this.testMode ? 
        testmailService.getInboxAddress('custom') : 
        to;

      const mailOptions = {
        from: `"Saranya Jewellery" <${process.env.EMAIL_USER}>`,
        to: recipientEmail,
        subject,
        html
      };

      const info = await transporter.sendMail(mailOptions);
      console.log('Custom email sent:', info.messageId);
      
      if (this.testMode) {
        console.log('📧 Test mode: Email sent to', recipientEmail);
        console.log('🔍 View at:', testmailService.getWebViewUrl('custom'));
      }

      return { 
        success: true, 
        messageId: info.messageId,
        testMode: this.testMode,
        recipientEmail
      };
    } catch (error) {
      console.error('Error sending custom email:', error);
      return { success: false, error: error.message };
    }
  }

  // Verify email configuration
  async verifyConnection() {
    try {
      const transporter = this.initTransporter();
      await transporter.verify();
      console.log('Email server connection verified');
      return { success: true };
    } catch (error) {
      console.error('Email server connection failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Testmail.app integration methods
  
  // Enable/disable test mode
  setTestMode(enabled) {
    this.testMode = enabled;
    console.log(`Test mode ${enabled ? 'enabled' : 'disabled'}`);
  }

  // Send test email to testmail.app
  async sendTestEmail(tag = 'test', subject = '🧪 Test Email', content = '<h1>This is a test email</h1>') {
    try {
      const transporter = this.initTransporter();
      const recipientEmail = testmailService.getInboxAddress(tag);

      const mailOptions = {
        from: `"Saranya Jewellery" <${process.env.EMAIL_USER}>`,
        to: recipientEmail,
        subject,
        html: content
      };

      const info = await transporter.sendMail(mailOptions);
      console.log('Test email sent to testmail.app:', info.messageId);
      console.log('📧 Recipient:', recipientEmail);
      console.log('🔍 View at:', testmailService.getWebViewUrl(tag));

      return { 
        success: true, 
        messageId: info.messageId,
        recipientEmail,
        viewUrl: testmailService.getWebViewUrl(tag)
      };
    } catch (error) {
      console.error('Error sending test email:', error);
      return { success: false, error: error.message };
    }
  }

  // Get testmail inbox
  async getTestmailInbox(tag = null) {
    return await testmailService.getEmails(tag);
  }

  // Wait for and verify email was received
  async waitForTestEmail(subject, timeoutMs = 30000) {
    return await testmailService.waitForEmail(subject, timeoutMs);
  }

  // Clear testmail inbox
  async clearTestmailInbox(tag = null) {
    return await testmailService.deleteAllEmails(tag);
  }

  // Get testmail web view URL
  getTestmailWebView(tag = null) {
    return testmailService.getWebViewUrl(tag);
  }
}

export default new EmailService();
