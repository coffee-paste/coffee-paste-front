import { envFacade } from "./env-facade";

export class NotesSocket extends WebSocket {

    public constructor(channelKey: string) {
        super(`${envFacade.apiUrl.replace("http", "ws")}/notes?channelKey=${channelKey}`)
    }

	public sendNoteUpdate(note: { noteId: string, contentHTML?: string, contentText?: string }) {
		this.send(JSON.stringify({
			noteId: note.noteId,
			contentHTML: note.contentHTML || '',
			contentText: note.contentText || '',
		}));
	}
}