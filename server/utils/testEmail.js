require('dotenv').config({ path: './.env' });
const { sendClaimStatusEmail } = require('./emailService');

const test = async () => {
  try {
    await sendClaimStatusEmail(
      'rashmyshiraj1@gmail.com',
      'approved',
      'Black Laptop Bag',
      'Item verified by admin'
    );
    console.log('✅ Email sent successfully — check your inbox');
  } catch (err) {
    console.error('❌ Email failed:', err.message);
  }
};

test();
