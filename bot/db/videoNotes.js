import {videoNotes} from "../db.js";

export async function getVideoNoteForDay(day) {
    return await videoNotes.findOne({ _id: day });
}
