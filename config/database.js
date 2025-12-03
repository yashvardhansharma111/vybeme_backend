const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGO_URI || 'mongodb+srv://yashvardhan:yashvardhan@vybeme.gjmypef.mongodb.net/?appName=vybeme';
    
    const conn = await mongoose.connect(mongoURI, {
      // Remove deprecated options, use defaults
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error('Error connecting to MongoDB:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;

