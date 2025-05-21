import { MongoClient } from 'mongodb';

const uri = process.env.MONGO_URI || "mongodb://localhost:27017";
const client = new MongoClient(uri);
export const db = client.db("biblebot");
export const users = db.collection("users");

export async function connectMongo() {
    if (!client.topology?.isConnected()) await client.connect();
}
