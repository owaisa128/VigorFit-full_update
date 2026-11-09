const mongoose = require('mongoose');
const dns = require('dns');

dns.setServers(['8.8.8.8', '1.1.1.1']);

// // Force IPv4 resolution first to prevent Windows IPv6 DNS lookup stalls on SRV records
// if (dns.setDefaultResultOrder) {
//   dns.setDefaultResultOrder('ipv4first');
// }

// /**
//  * Connect to MongoDB Atlas cluster explicitly targeting the 'vfit' database
//  * and ensure the required 'vigorfit_e' primary collection is initialized.
//  */
// const connectDB = async () => {
//   const mongoURI = process.env.MONGODB_URI || process.env.MONGODB_URL;

//   if (!mongoURI || mongoURI.trim() === '') {
//     console.warn('⚠️  MONGODB_URI is not set in environment variables. MongoDB connection skipped.');
//     console.warn('📌 Please set MONGODB_URI in server/.env to enable database functionality.');
//     return false;
//   }

//   // Helper to safely mask credentials in logs
//   const maskedURI = mongoURI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@');

//   try {
//     const conn = await mongoose.connect(mongoURI, {
//       dbName: 'vfit', // Explicitly connect to vfit database as required
//       serverSelectionTimeoutMS: 10000,
//       socketTimeoutMS: 45000,
//       family: 4, // Use IPv4, skip IPv6 to avoid Windows SRV lookup delays
//     });

//     console.log(`✅ MongoDB Connected successfully to VigorFit!`);
//     console.log(`📡 Host: ${conn.connection.host}`);
//     console.log(`🗄️  Database Name: ${conn.connection.name}`);

//     // Verify and ensure primary collection 'vigorfit_e' exists in vfit database
//     try {
//       const collections = await conn.connection.db.listCollections({ name: 'vigorfit_e' }).toArray();
//       if (collections.length === 0) {
//         await conn.connection.db.createCollection('vigorfit_e');
//         console.log(`📁 Primary collection 'vigorfit_e' created successfully in database 'vfit'.`);
//       } else {
//         console.log(`📁 Primary collection 'vigorfit_e' verified and ready in database 'vfit'.`);
//       }
//     } catch (collErr) {
//       console.warn(`⚠️ Note on checking 'vigorfit_e' collection: ${collErr.message}`);
//     }

//     return true;
//   } catch (error) {
//     console.error(`❌ MongoDB Connection Failure!`);
//     console.error(`🔗 Target URI: ${maskedURI}`);
//     console.error(`💬 Error Message: ${error.message}`);

//     // Provide safe, targeted troubleshooting guidance without exposing credentials
//     if (
//       error.name === 'MongooseServerSelectionError' ||
//       error.message.includes('whitelisted') ||
//       error.message.includes('buffering timed out')
//     ) {
//       console.error('\n🔍 --- MONGODB CONNECTION TROUBLESHOOTING ---');
//       console.error('1. Network Access (IP Whitelist):');
//       console.error('   - Your current IP address might not be allowed in MongoDB Atlas.');
//       console.error('   - Go to MongoDB Atlas > Network Access > Add IP Address.');
//       console.error('   - Click "ALLOW ACCESS FROM ANYWHERE" (0.0.0.0/0) for development access.');
//       console.error('2. Database User Credentials:');
//       console.error('   - Verify your database user exists in MongoDB Atlas > Database Access.');
//       console.error('   - Ensure the user has "Read and write to any database" role.');
//       console.error('3. Firewall / VPN / DNS:');
//       console.error('   - Ensure your firewall or router allows outbound traffic on TCP port 27017.');
//       console.error('   - Disconnect from restrictive corporate VPNs if applicable.');
//       console.error('---------------------------------------------\n');
//     } else if (
//       error.message.includes('Authentication failed') ||
//       error.message.includes('bad auth')
//     ) {
//       console.error('\n🔑 Authentication Failed! Verify username and password in server/.env.');
//     }

//     return false;
//   }
// };

const connectDB = async () => {
  const mongoURI = process.env.MONGODB_URL
  console.log(`Attempting to connect to MongoDB at: ${mongoURI}`)
  try {
    const conn = await mongoose.connect(mongoURI)
    conn.connection.on('error', (err) => {
      console.error(`MongoDB connection error: ${err.message}`)
    })
    conn.connection.on('connected', () => {
      console.log(`MongoDB connected: ${conn.connection.host}`)
    })
  } catch (error) {
    console.error(`MongoDB connection failed: ${error.message}`)
  }
}

module.exports = connectDB;