import { getCryptoCore } from './crypto/core/aes-gcm/crypto-core-aes-gcm';
import { ICryptoCore } from './crypto/core/common/crypto-core-definitions';
import debounce from 'lodash.debounce';
import { Encryption, Note } from './generated/api';
import { NotesSocket } from './notes-socket';
import { generateNewNoteName } from '@/common-constants/note-constants';
import { NoteUpdateEvent, OutgoingNoteUpdate } from './generated/api/channel-spec';

const DEFAULT_UPDATE_DEBOUNCE_MS: number = 500;

type NoteContents = { contentText: string, contentHtml: string };

export class NoteWrapper implements Omit<Note, 'randomNoteSalt'> {

	private _key: CryptoKey;
	private _cryptoCore: ICryptoCore;
	private _note: Note;
	private _socket: NotesSocket;

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
		this._note.name = value
	}

	public get contentText(): string {
		return this._note.contentText;
	}

	public set contentText(value: string) {
		this.setNoteContentText(value)
	}

	public get contentHTML(): string {
		return this._note.contentHTML;
	}

	public set contentHTML(value: string) {
		this.setNoteContentHtml(value);
	}

	public get lastModifiedTime(): number {
		return this._note.lastModifiedTime;
	}

	public get encryption(): Encryption {
		return this._note.encryption;
	}

	public get isEncrypted(): boolean {
		return this._note.encryption !== Encryption.NONE;
	}

	public constructor(noteData: Note, updateSocket: NotesSocket) {

		if (!noteData?.id) {
			throw new Error("Given note does not have an ID");
		}
		this._note = noteData;
		this._socket = updateSocket;
		this._socket.addEventListener('message', (event) => {
			const noteUpdate = JSON.parse(event.data) as OutgoingNoteUpdate;
			if (noteUpdate.event === NoteUpdateEvent.FEED && noteData.id === this._note.id && noteUpdate.contentHTML) {
				this.setNoteContentHtml(noteUpdate.contentHTML);
			}
		});

		this.initializeEncryption();
	}

	private async initializeEncryption(): Promise<void> {
		if (!this.isEncrypted) {
			return;
		}
		this._cryptoCore = getCryptoCore(this._note.encryption!);
		this._key = await this._cryptoCore.createSubKey(this._note.randomNoteSalt, this._note.id, 'text');
	}

	private setNoteContentText(contentText: string): void {
		// If note is un-encrypted, just update the value
		if (!this.isEncrypted) {
			this._note.contentText = contentText;
			return;
		}

		// If note is encrypted, debounce the update and carry out encryption in the callback
		debounce(
			async (contentText: string): Promise<void> => {
				this._note.contentText = await this._cryptoCore.encryptText(this._key, contentText);
			},
			DEFAULT_UPDATE_DEBOUNCE_MS,
		)(contentText);
	}

	private setNoteContentHtml(contentHtml: string): void {
		// If note is un-encrypted, just update the value
		if (!this.isEncrypted) {
			this._note.contentHTML = contentHtml;
			return;
		}

		// If note is encrypted, debounce the update and carry out encryption in the callback
		debounce(
			async (contentHtml: string): Promise<void> => {
				this._note.contentHTML = await this._cryptoCore.encryptText(this._key, contentHtml);
			},
			DEFAULT_UPDATE_DEBOUNCE_MS,
		)(contentHtml);
	}

	private async updateFromEncryptedNoteContents(contents: NoteContents): Promise<void> {
		return await debounce(
			async (contents: NoteContents): Promise<void> => {
				this._note.contentText = await this._cryptoCore.decryptText(this._key, contents.contentText);
				this._note.contentHTML = await this._cryptoCore.decryptText(this._key, contents.contentHtml);
			},
			DEFAULT_UPDATE_DEBOUNCE_MS,
		)(contents);
	}
}
