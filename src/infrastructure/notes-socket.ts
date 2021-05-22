import { envFacade } from "./env-facade";
import { IncomingNoteUpdate } from "./generated/api/channel-spec";

export class NotesSocket extends WebSocket {

    public constructor(channelKey: string) {
        super(`${envFacade.apiUrl.replace("http", "ws")}/notes?channelKey=${channelKey}`)
    }

	public sendNoteUpdate(note: IncomingNoteUpdate) {
		this.send(JSON.stringify({
			noteId: note.noteId,
			contentHTML: note.contentHTML,
			contentText: note.contentText,
		}));
	}
}