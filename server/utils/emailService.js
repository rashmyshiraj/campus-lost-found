const nodemailer = require('nodemailer');

// create transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// ─── SEND CLAIM STATUS EMAIL ────────────────────────────
// called when admin approves or rejects a claim
const sendClaimStatusEmail = async (to, status, itemTitle, reason = '') => {
  const isApproved = status === 'approved';

  const mailOptions = {
    from: `"CampusLost&Found" <${process.env.EMAIL_USER}>`,
    to,
    subject: isApproved
      ? `✅ Your claim has been approved — ${itemTitle}`
      : `❌ Your claim has been rejected — ${itemTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: ${isApproved ? '#2EC4B6' : '#E84855'};">
          ${isApproved ? '✅ Claim Approved' : '❌ Claim Rejected'}
        </h2>
        <p>Hi there,</p>
        <p>Your claim for <strong>${itemTitle}</strong> has been 
          <strong>${status}</strong>.
        </p>
        ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
        ${isApproved
          ? `<p>Please visit the campus lost & found office to collect your item. Bring your student ID.</p>`
          : `<p>If you believe this is a mistake, please contact the campus administration.</p>`
        }
        <br/>
        <p style="color: #888; font-size: 12px;">CampusLost&Found — University Item Recovery System</p>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
};

// ─── SEND MATCH NOTIFICATION EMAIL ──────────────────────
// called when a high confidence match is found for a post
const sendMatchNotificationEmail = async (to, itemTitle, matchTitle) => {
  const mailOptions = {
    from: `"CampusLost&Found" <${process.env.EMAIL_USER}>`,
    to,
    subject: `🔍 Possible match found for your item — ${itemTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #00BFC8;">🔍 Possible Match Found</h2>
        <p>Hi there,</p>
        <p>Good news! We found a possible match for your item 
          <strong>${itemTitle}</strong>.
        </p>
        <p>The matching item is listed as: <strong>${matchTitle}</strong></p>
        <p>Log in to CampusLost&Found to view the match and submit a claim.</p>
        <br/>
        <p style="color: #888; font-size: 12px;">CampusLost&Found — University Item Recovery System</p>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
};

// ─── SEND NEW CLAIM ALERT TO ADMIN ──────────────────────
// called when a student submits a new claim
const sendNewClaimAlertEmail = async (itemTitle, claimantName, claimantEmail) => {
  const mailOptions = {
    from: `"CampusLost&Found" <${process.env.EMAIL_USER}>`,
    to: process.env.ADMIN_EMAIL,
    subject: `🔔 New claim submitted — ${itemTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #F5A623;">🔔 New Claim Submitted</h2>
        <p>A new claim has been submitted and requires your review.</p>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Item</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${itemTitle}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Claimant</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${claimantName}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Email</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${claimantEmail}</td>
          </tr>
        </table>
        <p>Log in to the admin dashboard to review and action this claim.</p>
        <br/>
        <p style="color: #888; font-size: 12px;">CampusLost&Found — University Item Recovery System</p>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
};

// ─── SEND VERIFICATION EMAIL ────────────────────────────
// called when a new user registers
const sendVerificationEmail = async (to, name, token) => {
  const verifyUrl = `http://localhost:5000/api/auth/verify/${token}`;

  const mailOptions = {
    from: `"CampusLost&Found" <${process.env.EMAIL_USER}>`,
    to,
    subject: '✅ Verify your CampusLost&Found account',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #00BFC8;">Welcome to CampusLost&Found!</h2>
        <p>Hi ${name},</p>
        <p>Thanks for registering. Please verify your email address by clicking the button below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verifyUrl}" 
             style="background-color: #00BFC8; color: white; padding: 12px 30px; 
                    text-decoration: none; border-radius: 5px; font-size: 16px;">
            Verify My Email
          </a>
        </div>
        <p>This link expires in <strong>24 hours</strong>.</p>
        <p>If you did not create an account, ignore this email.</p>
        <br/>
        <p style="color: #888; font-size: 12px;">CampusLost&Found — University Item Recovery System</p>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
};

// ─── SEND PASSWORD RESET EMAIL ──────────────────────────
const sendPasswordResetEmail = async (to, name, token) => {
  const resetUrl = `http://localhost:5173/reset-password/${token}`;

  const mailOptions = {
    from: `"CampusLost&Found" <${process.env.EMAIL_USER}>`,
    to,
    subject: '🔐 Reset your CampusLost&Found password',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #00BFC8;">Password Reset Request</h2>
        <p>Hi ${name},</p>
        <p>We received a request to reset your password. Click the button below to set a new password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" 
             style="background-color: #00BFC8; color: white; padding: 12px 30px; 
                    text-decoration: none; border-radius: 5px; font-size: 16px;">
            Reset My Password
          </a>
        </div>
        <p>This link expires in <strong>1 hour</strong>.</p>
        <p>If you did not request a password reset, ignore this email — your password will not change.</p>
        <br/>
        <p style="color: #888; font-size: 12px;">CampusLost&Found — University Item Recovery System</p>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
};

module.exports = {
  sendClaimStatusEmail,
  sendMatchNotificationEmail,
  sendNewClaimAlertEmail,
  sendVerificationEmail,
  sendPasswordResetEmail
};
