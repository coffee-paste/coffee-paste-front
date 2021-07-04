import debounce from 'lodash.debounce';
import { generateNewNoteName } from '@/common-constants/note-constants';
import { getCryptoCore } from './crypto/core/aes-gcm/crypto-core-aes-gcm';
import { ICryptoCore } from './crypto/core/common/crypto-core-definitions';
import { Encryption, Note } from './generated/api';
import { NotesSocket } from './notes-socket';
import { NoteUpdateEvent, OutgoingNoteUpdate } from './generated/api/channel-spec';

const DEFAULT_UPDATE_DEBOUNCE_MS = 500;

type NoteContents = { contentText: string; contentHtml: string };

export class NoteWrapper implements Omit<Note, 'randomNoteSalt'> {
	private key: CryptoKey;

	private cryptoCore: ICryptoCore;

	private note: Note;

	private socket: NotesSocket;

	public get id(): string {
		return this.note.id;
	}

	public get userId(): string {
		return this.note.userId;
	}

	public get creationTime(): number {
		return this.note.creationTime;
	}

	public get passwordVersionCodeName(): string | undefined {
		return this.note.passwordVersionCodeName;
	}

	public get certificateVersionCodeName(): string | undefined {
		return this.note.certificateVersionCodeName;
	}

	public get name(): string {
		return this.note.name || generateNewNoteName([]); // Not ideal, need to think of a better way
	}

	public set name(value: string) {
		this.note.name = value;
	}

	public get contentText(): string {
		return this.note.contentText;
	}

	public set contentText(value: string) {
		this.setNoteContentText(value);
	}

	public get contentHTML(): string {
		return this.note.contentHTML;
	}

	public set contentHTML(value: string) {
		this.setNoteContentHtml(value);
	}

	public get lastModifiedTime(): number {
		return this.note.lastModifiedTime;
	}

	public get encryption(): Encryption {
		return this.note.encryption;
	}

	public get isEncrypted(): boolean {
		return this.note.encryption !== Encryption.NONE;
	}

	public constructor(noteData: Note, updateSocket: NotesSocket) {
		if (!noteData?.id) {
			throw new Error('Given note does not have an ID');
		}
		this.note = noteData;
		this.socket = updateSocket;
		this.socket.addEventListener('message', (event) => {
			const noteUpdate = JSON.parse(event.data) as OutgoingNoteUpdate;
			if (noteUpdate.event === NoteUpdateEvent.FEED && noteData.id === this.note.id && noteUpdate.contentHTML) {
				this.setNoteContentHtml(noteUpdate.contentHTML);
			}
		});

		this.initializeEncryption();
	}

	private async initializeEncryption(): Promise<void> {
		if (!this.isEncrypted) {
			return;
		}
		this.cryptoCore = getCryptoCore(this.note?.encryption);
		this.key = await this.cryptoCore.createSubKey(this.note.randomNoteSalt, this.note.id, 'text');
	}

	private setNoteContentText(contentText: string): void {
		// If note is un-encrypted, just update the value
		if (!this.isEncrypted) {
			this.note.contentText = contentText;
			return;
		}

		// If note is encrypted, debounce the update and carry out encryption in the callback
		debounce(async (debouncedContentText: string): Promise<void> => {
			this.note.contentText = await this.cryptoCore.encryptText(this.key, debouncedContentText);
		}, DEFAULT_UPDATE_DEBOUNCE_MS)(contentText);
	}

	private setNoteContentHtml(contentHtml: string): void {
		// If note is un-encrypted, just update the value
		if (!this.isEncrypted) {
			this.note.contentHTML = contentHtml;
			return;
		}

		// If note is encrypted, debounce the update and carry out encryption in the callback
		debounce(async (debouncedContentHtml: string): Promise<void> => {
			this.note.contentHTML = await this.cryptoCore.encryptText(this.key, debouncedContentHtml);
		}, DEFAULT_UPDATE_DEBOUNCE_MS)(contentHtml);
	}

	private async updateFromEncryptedNoteContents(contents: NoteContents): Promise<void> {
		await debounce(async (debouncedContents: NoteContents): Promise<void> => {
			this.note.contentText = await this.cryptoCore.decryptText(this.key, debouncedContents.contentText);
			this.note.contentHTML = await this.cryptoCore.decryptText(this.key, debouncedContents.contentHtml);
		}, DEFAULT_UPDATE_DEBOUNCE_MS)(contents);
	}
}
