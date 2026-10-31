const nodemailer = require('nodemailer');

function createTransporter() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE } = process.env;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    return {
      sendMail: async (options) => {
        console.log('\n[mailer] SMTP not configured — printing email instead of sending:');
        console.log(`  To:      ${options.to}`);
        console.log(`  Subject: ${options.subject}`);
        console.log(`  Body:\n${options.text}\n`);
        return { messageId: 'console-fallback' };
      },
    };
  }

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: SMTP_SECURE === 'true',
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

const transporter = createTransporter();

async function sendPasswordResetEmail(toEmail, resetUrl) {
  const from = process.env.MAIL_FROM || 'No Reply <no-reply@example.com>';

  return transporter.sendMail({
    from,
    to: toEmail,
    subject: 'Відновлення пароля',
    text:
      `Ви (або хтось від вашого імені) запросили відновлення пароля.\n\n` +
      `Перейдіть за посиланням, щоб встановити новий пароль (дійсне обмежений час):\n${resetUrl}\n\n` +
      `Якщо ви не запитували відновлення пароля, просто проігноруйте цей лист.`,
  });
}

module.exports = { sendPasswordResetEmail };
