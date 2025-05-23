import { users as usersCollection } from "../db.js";

export async function getUser(userId) {
    return await usersCollection.findOne({ _id: userId });
}

export async function updateUserSettings(userId, settings) {
    await usersCollection.updateOne(
        { _id: userId },
        { $set: settings },
        { upsert: true }
    );
}