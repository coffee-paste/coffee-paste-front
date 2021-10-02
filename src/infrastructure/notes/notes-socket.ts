import { ITypedEvent, WeakEvent } from 'weak-event';
import { envFacade } from '../env-facade';
import { IncomingNoteUpdate, OutgoingNoteUpdate } from '../generated/api/channel-spec';

export class NotesSocket {
	private _socket: WebSocket;

	private _channelKey: string;

	public get channelKey(): string {
		return this._channelKey;
	}

	//  #region Events

	private _opened: WeakEvent<NotesSocket, void> = new WeakEvent<NotesSocket, void>();

	public get opened(): ITypedEvent<NotesSocket, void> {
		return this._opened;
	}

	private _error: WeakEvent<NotesSocket, unknown> = new WeakEvent<NotesSocket, unknown>();

	public get error(): ITypedEvent<NotesSocket, unknown> {
		return this._error;
	}

	private _closed: WeakEvent<NotesSocket, void> = new WeakEvent<NotesSocket, void>();

	public get closed(): ITypedEvent<NotesSocket, void> {
		return this._closed;
	}

	private _message: WeakEvent<NotesSocket, OutgoingNoteUpdate> = new WeakEvent<NotesSocket, OutgoingNoteUpdate>();

	public get message(): ITypedEvent<NotesSocket, OutgoingNoteUpdate> {
		return this._message;
	}

	//  #endregion Events

	public constructor(channelKey: string) {
		this._socket = new WebSocket(`${envFacade.apiUrl.replace('http', 'ws')}/notes?channelKey=${channelKey}`);
		this._channelKey = channelKey;

		this._socket.onopen = () => {
			this._opened.invokeAsync(this);
		};

		this._socket.onerror = (e) => {
			this._error.invokeAsync(this, e);
		};

		this._socket.onclose = () => {
			this._closed.invokeAsync(this);
		};

		this._socket.onmessage = (e: { data: string }) => {
			this._message.invokeAsync(this, JSON.parse(e.data));
		};
	}

	public close(code?: number, reason?: string): void {
		this._socket.close(code, reason);
	}

	public sendNoteUpdate(note: IncomingNoteUpdate): void {
		this._socket.send(
			JSON.stringify({
				noteId: note.noteId,
				contentHTML: note.contentHTML,
				contentText: note.contentText,
			})
		);
	}
}
