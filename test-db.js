// test-db.js
require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

const uri = process.env.MONGODB_URI;
console.log("---------------------------------------------------");
console.log("🧪 Testing Connection to:", uri?.split('@')[1]); // Hides password
console.log("---------------------------------------------------");

if (!uri) {
    console.error("❌ Error: MONGODB_URI is missing in .env.local");
    process.exit(1);
}

mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 })
    .then(() => {
        console.log("✅ SUCCESS! Connected to MongoDB.");
        console.log("---------------------------------------------------");
        process.exit(0);
    })
    .catch((err) => {
        console.error("❌ FAILED:", err.message);
        if (err.name === 'MongooseServerSelectionError') {
            console.error("👉 CAUSE: Your Internet/Firewall is blocking the connection.");
            console.error("👉 FIX: Try connecting to a Mobile Hotspot.");
        }
        console.log("---------------------------------------------------");
        process.exit(1);
    });