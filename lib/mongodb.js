import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
if (!uri) {
  throw new Error('Missing MONGODB_URI. Add it to your .env.local file.');
}

const globalForMongo = globalThis;
const clientPromise = globalForMongo.mongoClientPromise || new MongoClient(uri).connect();
if (process.env.NODE_ENV !== 'production') {
  globalForMongo.mongoClientPromise = clientPromise;
}

export default clientPromise;
