import nodemailer from 'nodemailer';

// Create email transporter
export const createTransporter = () => {
  const service = (process.env.EMAIL_SERVICE || 'gmail').toLowerCase();

  // Prefer explicit SMTP configuration for predictable TLS behavior.
  if (process.env.SMTP_HOST) {
    return createCustomTransporter();
  }

  const defaultHosts = {
    gmail: 'smtp.gmail.com',
    outlook: 'smtp-mail.outlook.com',
    hotmail: 'smtp-mail.outlook.com',
    yahoo: 'smtp.mail.yahoo.com'
  };

  const host = process.env.EMAIL_HOST || defaultHosts[service] || 'smtp.gmail.com';
  const tlsServerName = process.env.EMAIL_TLS_SERVERNAME || defaultHosts[service] || host;
  const port = Number(process.env.EMAIL_PORT || 587);
  const secure = process.env.EMAIL_SECURE
    ? process.env.EMAIL_SECURE === 'true'
    : port === 465;

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    requireTLS: !secure,
    family: 4,
    connectionTimeout: Number(process.env.EMAIL_CONNECTION_TIMEOUT || 15000),
    greetingTimeout: Number(process.env.EMAIL_GREETING_TIMEOUT || 10000),
    socketTimeout: Number(process.env.EMAIL_SOCKET_TIMEOUT || 20000),
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    },
    tls: {
      minVersion: 'TLSv1.2',
      servername: tlsServerName
    }
  });

  return transporter;
};

// Alternative configuration for custom SMTP
export const createCustomTransporter = () => {
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = process.env.SMTP_SECURE
    ? process.env.SMTP_SECURE === 'true'
    : port === 465;
  const tlsServerName = process.env.SMTP_TLS_SERVERNAME || process.env.SMTP_HOST;

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure,
    requireTLS: !secure,
    family: 4,
    connectionTimeout: Number(process.env.EMAIL_CONNECTION_TIMEOUT || 15000),
    greetingTimeout: Number(process.env.EMAIL_GREETING_TIMEOUT || 10000),
    socketTimeout: Number(process.env.EMAIL_SOCKET_TIMEOUT || 20000),
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD
    },
    tls: {
      minVersion: 'TLSv1.2',
      servername: tlsServerName
    }
  });
};

// Email templates
export const emailTemplates = {
  welcome: (customerName, promotions) => ({
    subject: '🎉 Welcome to Saranya Jewellery!',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Arial', sans-serif; background-color: #f5f5f5; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #6f0022 0%, #8b0028 100%); color: white; padding: 30px; text-align: center; }
          .header h1 { margin: 0; font-size: 28px; }
          .content { padding: 30px; }
          .greeting { font-size: 18px; color: #333; margin-bottom: 20px; }
          .promotion { background: #fff9e6; border-left: 4px solid #e0bf63; padding: 15px; margin: 15px 0; border-radius: 4px; }
          .promotion-title { font-weight: bold; color: #6f0022; margin-bottom: 5px; }
          .promotion-text { color: #666; line-height: 1.6; }
          .cta-button { display: inline-block; background: #6f0022; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; margin: 20px 0; }
          .footer { background: #f9f9f9; padding: 20px; text-align: center; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✨ Saranya Jewellery ✨</h1>
          </div>
          <div class="content">
            <p class="greeting">Dear ${customerName},</p>
            <p>Welcome to Saranya Jewellery! We're delighted to have you with us.</p>
            ${promotions && promotions.length > 0 ? `
              <h3 style="color: #6f0022;">🎁 Special Offers Just for You:</h3>
              ${promotions.map(promo => `
                <div class="promotion">
                  <div class="promotion-title">${promo.title}</div>
                  <div class="promotion-text">${promo.message}</div>
                  ${promo.validUntil ? `<p style="color: #999; font-size: 12px; margin-top: 10px;">Valid until: ${new Date(promo.validUntil).toLocaleDateString()}</p>` : ''}
                </div>
              `).join('')}
            ` : ''}
            <a href="${process.env.APP_URL || 'http://localhost:3000'}" class="cta-button">Start Shopping</a>
            <p style="margin-top: 30px; color: #666;">Thank you for choosing Saranya Jewellery for your precious moments.</p>
          </div>
          <div class="footer">
            <p>Saranya Jewellery | Premium Gold & Diamond Jewelry</p>
            <p>This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `
  }),

  promotion: (customerName, promotion) => ({
    subject: `🎁 ${promotion.title} - Saranya Jewellery`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Arial', sans-serif; background-color: #f5f5f5; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #6f0022 0%, #8b0028 100%); color: white; padding: 30px; text-align: center; }
          .content { padding: 30px; }
          .highlight { background: #fff9e6; border: 2px solid #e0bf63; padding: 20px; margin: 20px 0; border-radius: 8px; text-align: center; }
          .cta-button { display: inline-block; background: #6f0022; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; margin: 20px 0; }
          .footer { background: #f9f9f9; padding: 20px; text-align: center; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✨ Special Offer for You! ✨</h1>
          </div>
          <div class="content">
            <p>Dear ${customerName},</p>
            <div class="highlight">
              <h2 style="color: #6f0022; margin: 0 0 15px 0;">${promotion.title}</h2>
              <p style="font-size: 16px; color: #333; line-height: 1.6;">${promotion.message}</p>
              ${promotion.validUntil ? `<p style="color: #e0bf63; font-weight: bold; margin-top: 15px;">⏰ Valid until: ${new Date(promotion.validUntil).toLocaleDateString()}</p>` : ''}
            </div>
            <center>
              <a href="${process.env.APP_URL || 'http://localhost:3000'}" class="cta-button">Shop Now</a>
            </center>
          </div>
          <div class="footer">
            <p>Saranya Jewellery | Premium Gold & Diamond Jewelry</p>
          </div>
        </div>
      </body>
      </html>
    `
  })
};
