import { MongoClient } from 'mongodb';

const uri = `mongodb://${process.env.MONGO_INITDB_ROOT_USERNAME}:${process.env.MONGO_INITDB_ROOT_PASSWORD}@mongo:27017/biblebot?authSource=admin`;
const client = new MongoClient(uri);

export const db = client.db("biblebot");
export const users = db.collection("users");

export async function connectMongo() {
    if (!client.topology?.isConnected()) await client.connect();
}
