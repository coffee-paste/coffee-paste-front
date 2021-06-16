import { Note } from "@/infrastructure/generated/api";

enum NoteStringPrefix {
    NewNote = 'New note',
}

function formatNewNoteName(newNoteIndex: number) {
    return `${NoteStringPrefix.NewNote} (${newNoteIndex})`;
}

/**
 * Generate new name for a new note.
 * @param notes The exists notes collection
 * @returns The suggested new note name.
 */
export function generateNewNoteName(notes: Note[]): string {

    // Filter out all notes that not match prefix, then map to names to string array, and sort by string value
    const relevantNames = notes.filter(n => n.name?.startsWith(NoteStringPrefix.NewNote)).map(n => n.name).sort();

    let newNoteIndex = 1;

    // Increase index till found not in use index;
    while (relevantNames.includes(formatNewNoteName(newNoteIndex))) {
        newNoteIndex++;
    }

    return formatNewNoteName(newNoteIndex);
}
