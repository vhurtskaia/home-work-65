const mongoose = require('mongoose');

mongoose.set('strictQuery', true);

async function connectDB(uri) {
  const mongoUri = uri || process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error(
      'MONGODB_URI не задано. Додайте рядок підключення до MongoDB Atlas у файл .env.'
    );
  }

  await mongoose.connect(mongoUri);
  console.log(`MongoDB підключено: ${mongoose.connection.host}/${mongoose.connection.name}`);
  return mongoose.connection;
}

async function disconnectDB() {
  await mongoose.disconnect();
}

module.exports = { connectDB, disconnectDB, mongoose };
