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

module.exports = {
  sendClaimStatusEmail,
  sendMatchNotificationEmail,
  sendNewClaimAlertEmail
};
