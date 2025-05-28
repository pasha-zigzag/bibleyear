import { audioChapters } from "../db.js";

export async function getAudioChapters(day, translation) {
    return await audioChapters.findOne({ day, translation });
}
