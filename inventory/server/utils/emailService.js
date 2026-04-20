const nodemailer = require('nodemailer');

let transporter = null;

if (process.env.SMTP_EMAIL && process.env.SMTP_PASSWORD) {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.SMTP_EMAIL,
      pass: process.env.SMTP_PASSWORD
    }
  });
}

exports.sendEmail = async ({ to, subject, text, html }) => {
  if (!transporter) {
    console.warn('Email not sent: SMTP_EMAIL/SMTP_PASSWORD are not configured.');
    return;
  }

  if (!to) {
    throw new Error('Missing recipient email address');
  }

  const mailOptions = {
    from: process.env.SMTP_FROM || process.env.SMTP_EMAIL,
    to,
    subject,
    text,
    html
  };

  const result = await transporter.sendMail(mailOptions);
  return result;
};
