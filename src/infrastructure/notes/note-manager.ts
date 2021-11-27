import { INoteChangedEventArgs } from '@/components/tabs/tab-interfaces';
import { PageRequest, FetchPageOptions, NotesBody, NoteStatus } from '../generated/api';
import { ApiFacade } from '../generated/proxies/api-proxies';
import { INote, INotesPage } from './note-interfaces';
import { NoteWrapper } from './note-wrapper';
import { NotesSocket } from './notes-socket';

class NoteManager {
	private _initialized = false;

	public get initialized(): boolean {
		return this._initialized;
	}

	private _socket: NotesSocket;

	public get socket(): NotesSocket {
		return this._socket;
	}

	public async initialize() {
		this._socket = new NotesSocket();
		await this._socket.open();
	}

	public async getNote(id: string): Promise<INote> {
		return new NoteWrapper(await ApiFacade.NotesApi.getNote(id), this._socket);
	}

	public async getBacklogNotes(): Promise<INote[]> {
		return (await ApiFacade.NotesApi.getBacklogNotes()).map((note) => new NoteWrapper(note, this._socket));
	}

	public async getOpenNotes(): Promise<INote[]> {
		return (await ApiFacade.NotesApi.getOpenNotes()).map((note) => new NoteWrapper(note, this._socket));
	}

	public async getNotesPage(request: PageRequest, options: FetchPageOptions): Promise<INotesPage> {
		const page = await ApiFacade.NotesApi.getNotesPage(request, options);
		return {
			totalCount: page?.totalCount || 0,
			notes: page?.notes?.map((note) => new NoteWrapper(note, this._socket)) || [],
		};
	}

	public async createNote(data: NotesBody): Promise<INote> {
		const id = await ApiFacade.NotesApi.createNote(data);
		const newNote = await ApiFacade.NotesApi.getNote(id);
		return new NoteWrapper(newNote, this.socket);
	}

	public sendNoteUpdate(event: INoteChangedEventArgs): void {
		this._socket.sendNoteUpdate(event);
	}

	public async archiveNoteById(id: string): Promise<void> {
		await ApiFacade.NotesApi.setNoteStatus({ status: NoteStatus.BACKLOG }, id, this.socket.channelKey);
	}

	public async deleteNoteById(id: string): Promise<void> {
		await ApiFacade.NotesApi.deleteNotes(id, this.socket.channelKey);
	}
}

export const noteManager = new NoteManager();
