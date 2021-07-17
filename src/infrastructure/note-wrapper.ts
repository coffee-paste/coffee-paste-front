import { generateNewNoteName } from '@/common-constants/note-constants';
import debounce from 'lodash.debounce';
import { getCryptoCore } from './crypto/core/aes-gcm/crypto-core-aes-gcm';
import { ICryptoCore } from './crypto/core/common/crypto-core-definitions';
import { NotesSocket } from './notes-socket';
import { NoteUpdateEvent, OutgoingNoteUpdate } from './generated/api/channel-spec';
import { Encryption, Note } from './generated/api';
import { ApiFacade } from './generated/proxies/api-proxies';
import { IDisposable } from './common-interfaces.ts/disposable';

const DEFAULT_UPDATE_DEBOUNCE_MS = 500;

type NoteContents = { contentText: string; contentHTML: string };

// Set contents should receive NoteContents.
// No individual setters for contentText/contentHtml!

// No getter for contentText

export class NoteWrapper implements Omit<Note, 'randomNoteSalt' | 'contentText'>, IDisposable {
	// #region Members

	private _key: CryptoKey;

	private _cryptoCore: ICryptoCore;

	private _note: Note;

	private _socket: NotesSocket;

	private _disposed: boolean;

	private _onSocketMessage = this.onSocketMessage.bind(this);

	// #endregion Members

	// #region Accessors

	public get id(): string {
		return this._note.id;
	}

	public get userId(): string {
		return this._note.userId;
	}

	public get creationTime(): number {
		return this._note.creationTime;
	}

	public get passwordVersionCodeName(): string | undefined {
		return this._note.passwordVersionCodeName;
	}

	public get certificateVersionCodeName(): string | undefined {
		return this._note.certificateVersionCodeName;
	}

	public get name(): string {
		return this._note.name || generateNewNoteName([]); // Not ideal, need to think of a better way
	}

	public set name(value: string) {
		this._note.name = value;
	}

	public get contentHTML(): string {
		return this._note.contentHTML;
	}

	public get lastModifiedTime(): number {
		return this._note.lastModifiedTime;
	}

	public get tags(): string[] {
		return this._note.tags;
	}

	public set tags(value: string[]) {
		debounce(async (tags: string[]): Promise<void> => {
			await ApiFacade.NotesApi.setNoteTags(tags, this._note.id, this._socket.ChannelKey);
		}, DEFAULT_UPDATE_DEBOUNCE_MS)(value);
	}

	public get encryption(): Encryption {
		return this._note.encryption;
	}

	public set encryption(value: Encryption) {
		throw new Error('Encryption setter not yet implemented');
	}

	public get isEncrypted(): boolean {
		return this._note.encryption !== Encryption.NONE;
	}

	public get disposed(): boolean {
		return this._disposed;
	}

	// #endregion Accessors

	public constructor(noteData: Note, updateSocket: NotesSocket) {
		if (!noteData?.id) {
			throw new Error('Given note does not have an ID');
		}

		this._note = noteData;
		this._socket = updateSocket;
		this._socket.message.attachWeak(this._onSocketMessage);
		this.initializeEncryption();
	}

	// #region Public Methods

	public setContents(contents: NoteContents): void {
		this._note.contentText = contents.contentText;
		this._note.contentHTML = contents.contentHTML;

		if (!this.isEncrypted) {
			return;
		}

		debounce(async (debounceContents: NoteContents): Promise<void> => {
			await ApiFacade.NotesApi.setNoteContent(
				{
					contentText: await this._cryptoCore.encryptText(this._key, debounceContents.contentText),
					contentHTML: await this._cryptoCore.encryptText(this._key, debounceContents.contentHTML),
				},
				this._note.id,
				this._socket.ChannelKey
			);
		}, DEFAULT_UPDATE_DEBOUNCE_MS)(contents);
	}

	public dispose(): void {
		this._socket.message.detach(this._onSocketMessage);
	}

	// #endregion Public Methods

	// #region Private Methods

	private async initializeEncryption(): Promise<void> {
		if (!this.isEncrypted) {
			return;
		}
		this._cryptoCore = getCryptoCore(this._note?.encryption);
		this._key = await this._cryptoCore.createSubKey(this._note.randomNoteSalt, this._note.id, 'text');
	}

	private onSocketMessage(sender: NotesSocket, e: OutgoingNoteUpdate): void {
		if (e.event !== NoteUpdateEvent.FEED || e.noteId !== this._note.id) {
			// Irrelevant event. Ignore.
			return;
		}

		if (!this.isEncrypted || !e.contentHTML) {
			// Note is un-encrypted. Just update our internal state
			this._note.contentHTML = e.contentHTML || '';
			return;
		}

		debounce(async (encryptedHtml: string): Promise<void> => {
			this._note.contentHTML = await this._cryptoCore.decryptText(this._key, encryptedHtml);
		}, DEFAULT_UPDATE_DEBOUNCE_MS)(e.contentHTML);
	}

	// #endregion Private Methods
}
