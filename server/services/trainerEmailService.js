const nodemailer = require('nodemailer');

const getMailConfiguration = () => {
  const { ADMIN_EMAIL, GMAIL_USER, GMAIL_APP_PASSWORD } = process.env;
  if (!ADMIN_EMAIL || !GMAIL_USER || !GMAIL_APP_PASSWORD) {
    throw new Error('Configure ADMIN_EMAIL, GMAIL_USER, and GMAIL_APP_PASSWORD in server/.env');
  }

  let clientUrl;
  try {
    clientUrl = new URL(process.env.CLIENT_URL || 'http://localhost:5173');
  } catch {
    throw new Error('CLIENT_URL must be a valid URL before trainer approval emails can be sent');
  }

  return { adminEmail: ADMIN_EMAIL, gmailUser: GMAIL_USER, appPassword: GMAIL_APP_PASSWORD, clientUrl };
};

const getTransport = ({ gmailUser, appPassword }) => nodemailer.createTransport({
  service: 'gmail',
  auth: { user: gmailUser, pass: appPassword.replace(/\s/g, '') },
});

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
})[character]);

const sendAdminTrainerReviewEmail = async ({ trainerName, trainerEmail, token }) => {
  const config = getMailConfiguration();
  const transport = getTransport(config);
  const approveUrl = new URL('/trainer/review', config.clientUrl);
  approveUrl.searchParams.set('token', token);
  approveUrl.searchParams.set('action', 'approve');
  const rejectUrl = new URL(approveUrl);
  rejectUrl.searchParams.set('action', 'reject');
  const safeName = escapeHtml(trainerName);
  const safeEmail = escapeHtml(trainerEmail);

  await transport.sendMail({
    from: config.gmailUser,
    to: config.adminEmail,
    subject: `Trainer application approval required: ${trainerName}`,
    text: `${trainerName} (${trainerEmail}) has requested a VigorFit trainer account.\nApprove: ${approveUrl}\nReject: ${rejectUrl}`,
    html: `<p>${safeName} (${safeEmail}) has requested a VigorFit trainer account.</p><p><a href="${approveUrl}">Review and approve trainer</a></p><p><a href="${rejectUrl}">Review and reject trainer</a></p><p>Opening a link will not make a decision until you confirm it on the VigorFit page.</p>`,
  });
};

module.exports = {
  sendAdminTrainerReviewEmail,
};
