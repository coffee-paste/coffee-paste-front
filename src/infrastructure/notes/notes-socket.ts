import { ITypedEvent, WeakEvent } from 'weak-event';
import { envFacade } from '../env-facade';
import { FrontToBackNoteUpdate, BackToFrontNoteUpdate } from '../generated/api/channel-spec';
import { ApiFacade } from '../generated/proxies/api-proxies';

export class NotesSocket {
	private _socket: WebSocket;

	private _autoReopen: boolean;

	public get autoReopen(): boolean {
		return this._autoReopen;
	}

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

	private _message: WeakEvent<NotesSocket, BackToFrontNoteUpdate> = new WeakEvent<NotesSocket, BackToFrontNoteUpdate>();

	public get message(): ITypedEvent<NotesSocket, BackToFrontNoteUpdate> {
		return this._message;
	}

	//  #endregion Events

	public constructor(opts?: { autoReopen?: boolean }) {
		this._autoReopen = opts?.autoReopen || true;
	}

	public async open(): Promise<void> {
		// If the socket is open or connecting, do nothing.
		if (this._socket?.readyState === WebSocket.OPEN || this._socket?.readyState === WebSocket.CONNECTING) {
			return;
		}

		// Create a new socket
		this._channelKey = await ApiFacade.NotesApi.getChannelKey();
		this._socket = new WebSocket(`${envFacade.apiUrl.replace('http', 'ws')}/notes?channelKey=${this._channelKey}`);

		this.attachHandlers();
	}

	public close(code?: number, reason?: string): void {
		this._socket.close(code, reason);
	}

	public sendNoteUpdate(note: FrontToBackNoteUpdate): void {
		this._socket.send(
			JSON.stringify({
				noteId: note.noteId,
				contentHTML: note.contentHTML,
				contentText: note.contentText,
				oldGuardNonce: note.oldGuardNonce,
				newGuardNonce: note.newGuardNonce,
				encryptedNewGuardNonce: note.encryptedNewGuardNonce,
			})
		);
	}

	private attachHandlers(): void {
		this._socket.onopen = () => {
			this._opened.invokeAsync(this);
		};

		this._socket.onerror = (e) => {
			this._error.invokeAsync(this, e);
		};

		this._socket.onclose = () => {
			if (this._autoReopen) {
				// Note the lack of 'await' here. We don't need to wait for 'open' to complete
				this.open();
			}
			this._closed.invokeAsync(this);
		};

		this._socket.onmessage = (e: { data: string }) => {
			this._message.invokeAsync(this, JSON.parse(e.data));
		};
	}
}
