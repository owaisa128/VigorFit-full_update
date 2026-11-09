const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const promoteAdmin = async () => {
  const mongoURI = process.env.MONGODB_URI || process.env.MONGODB_URL;
  if (!mongoURI) {
    console.error('❌ MONGODB_URI or MONGODB_URL not found in environment variables.');
    process.exit(1);
  }

  const targetEmail = (process.argv[2] || 'admin@vigorfit.com').toLowerCase().trim();

  try {
    console.log('Connecting to MongoDB Atlas (database: vfit)...');
    await mongoose.connect(mongoURI, { dbName: 'vfit', family: 4 });

    const User = require('../models/User');
    const user = await User.findOne({ email: targetEmail });

    if (!user) {
      console.error(`❌ User with email "${targetEmail}" was not found in database "vfit".`);
      await mongoose.disconnect();
      process.exit(1);
    }

    if (user.role === 'admin') {
      console.log(`ℹ️  User "${user.email}" already has role: "admin".`);
    } else {
      user.role = 'admin';
      await user.save();
      console.log(`✅ User "${user.email}" successfully promoted to role: "admin"!`);
    }

    console.log(`Admin User ID: ${user._id}`);
    console.log(`Admin Name: ${user.name}`);
    console.log(`Admin Role: ${user.role}`);

    await mongoose.disconnect();
    console.log('Database disconnected cleanly.');
  } catch (error) {
    console.error('❌ Error promoting admin user:', error.message);
    process.exit(1);
  }
};

promoteAdmin();
