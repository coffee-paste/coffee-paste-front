/* eslint-disable @typescript-eslint/no-unused-vars */
import { generateNewNoteName } from '@/common-constants/note-constants';
import debounce from 'lodash.debounce';
import { ITypedEvent, WeakEvent } from 'weak-event';
import { getCryptoCore } from '../crypto/core/aes-gcm/crypto-core-aes-gcm';
import { ICryptoCore } from '../crypto/core/common/crypto-core-definitions';
import { NotesSocket } from './notes-socket';
import { NoteUpdateEvent, OutgoingNoteUpdate } from '../generated/api/channel-spec';
import { Encryption, Note, StatusNoteIdBody } from '../generated/api';
import { ApiFacade } from '../generated/proxies/api-proxies';
import { IDisposable } from '../common-interfaces.ts/disposable';
import { INote, INoteContents } from './note-interfaces';

const DEFAULT_UPDATE_DEBOUNCE_MS = 1500;

// Set contents should receive NoteContents.
// No individual setters for contentText/contentHtml!

// No getter for contentText

type INoteProperties = {
	[Property in Exclude<keyof INote, 'setStatus' | 'setContents' | 'setEncryption' | 'delete' | 'dispose'>]: INote[Property];
};

export class NoteWrapper implements INote, IDisposable {
	// #region Members

	private _key: CryptoKey;

	private _cryptoCore: ICryptoCore;

	private _note: Note;

	private _socket?: NotesSocket;

	private _disposed: boolean;

	private _onSocketMessage = this.onSocketMessage.bind(this);

	private _setContentsDebounced = debounce(async (debounceContents: INoteContents): Promise<void> => {
		const contentText = this.isEncrypted ? await this.encryptText(debounceContents.contentText) : debounceContents.contentText;
		const contentHTML = this.isEncrypted ? await this.encryptText(debounceContents.contentHTML) : debounceContents.contentHTML;
		await ApiFacade.NotesApi.setNoteContent(
			{
				contentText,
				contentHTML,
			},
			this._note.id,
			this._socket?.channelKey
		);
		console.log(`Updating note- Content Text: ${contentText}\n Content HTML: ${contentHTML}`);
	}, DEFAULT_UPDATE_DEBOUNCE_MS);

	private _setNameDebounced = debounce(async (name: string): Promise<void> => {
		await ApiFacade.NotesApi.setNoteName({ name }, this.id, this._socket?.channelKey);
	}, DEFAULT_UPDATE_DEBOUNCE_MS);

	private _setTagsDebounced = debounce(async (tags: string[]): Promise<void> => {
		await ApiFacade.NotesApi.setNoteTags(tags || [], this.id, this._socket?.channelKey);
	}, DEFAULT_UPDATE_DEBOUNCE_MS);

	private _decryptTextDebounced = debounce(async (encryptedHtml: string): Promise<void> => {
		this._note.contentHTML = await this.decryptText(encryptedHtml);
	}, DEFAULT_UPDATE_DEBOUNCE_MS);

	private _updatedEvent: WeakEvent<INote, keyof INoteProperties> = new WeakEvent();

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
		this.setName(value);
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
		this.setTags(value);
	}

	public get encryption(): Encryption {
		return this._note.encryption;
	}

	public get isEncrypted(): boolean {
		return this._note.encryption !== Encryption.NONE;
	}

	public get disposed(): boolean {
		return this._disposed;
	}

	public get isReadOnly(): boolean {
		return !this._socket;
	}

	public get updated(): ITypedEvent<INote, keyof INoteProperties> {
		return this._updatedEvent;
	}

	// #endregion Accessors

	public constructor(noteData: Note, updateSocket?: NotesSocket) {
		if (!noteData?.id) {
			throw new Error('Given note does not have an ID');
		}

		this._note = noteData;
		this._socket = updateSocket;
		this._socket?.message.attach(this._onSocketMessage);
		this.initializeEncryption();
	}

	// #region Public Methods

	public setContents(contents: INoteContents): void {
		this.assertWriteAccess();

		this._note.contentText = contents.contentText;
		this._note.contentHTML = contents.contentHTML;
		this._setContentsDebounced(contents);
	}

	public async setStatus(status: StatusNoteIdBody): Promise<void> {
		this.assertWriteAccess();
		await ApiFacade.NotesApi.setNoteStatus(status, this.id, this._socket?.channelKey);
	}

	public async delete(): Promise<void> {
		this.assertWriteAccess();

		await ApiFacade.NotesApi.deleteNotes(this.id);
		// Detach the handler from the socket- note will be deleted so
		// no further updates are required
		this.detachSocket();
	}

	public async setEncryption(value: Encryption): Promise<void> {
		if (this.encryption === value) {
			// No change of state. Ignore.
			return;
		}
		this.assertWriteAccess();

		try {
			switch (value) {
				case Encryption.PASSWORD:
					this._cryptoCore = getCryptoCore(value);
					this._key = await this._cryptoCore.createSubKey(this._note.randomNoteSalt, this._note.id, 'text');
					break;
				case Encryption.NONE:
					break;
				case Encryption.CERTIFICATE:
					throw new Error('Certificate based encryption is not yet supported');
				default:
					throw new Error(`Unknown encryption scheme ${value}`);
			}

			await ApiFacade.NotesApi.setNoteEncryptionMethod(
				{
					encryption: value,
					contentHTML: value === Encryption.NONE ? await this.decryptText(this._note.contentHTML) : await this.encryptText(this._note.contentHTML),
					contentText: value === Encryption.NONE ? await this.decryptText(this._note.contentText) : await this.encryptText(this._note.contentText),
				},
				this._note.id,
				this._socket?.channelKey
			);
			// If the 'setNoteEncryptionMethod' succeeded, update the note's state
			this._note.encryption = value;
		} catch (error) {
			console.error(`[NoteWrapper.setEncryption] Failed to set encryption mode to ${value} on note ${this.id} - ${error}`);
		}
	}

	public dispose(): void {
		this.detachSocket();
	}

	// #endregion Public Methods

	// #region Private Methods

	private setName(value: string): void {
		this.assertWriteAccess();

		this._note.name = value;
		this._setNameDebounced(value);
	}

	private setTags(value: string[]): void {
		this.assertWriteAccess();

		this._note.tags = value || [];
		this._setTagsDebounced(this._note.tags);
	}

	private async initializeEncryption(): Promise<void> {
		if (!this.isEncrypted) {
			return;
		}

		this._cryptoCore = getCryptoCore(this._note?.encryption);
		this._key = await this._cryptoCore.createSubKey(this._note.randomNoteSalt, this._note.id, 'text');
		this._note.contentText = await this.decryptText(this._note.contentText);
		this._note.contentHTML = await this.decryptText(this._note.contentHTML);
		this._updatedEvent.invoke(this, 'contentHTML');
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

		this._decryptTextDebounced(e.contentHTML);
	}

	private detachSocket(): void {
		this._socket?.message.detach(this._onSocketMessage);
	}

	private assertWriteAccess(): void {
		if (this.isReadOnly) {
			throw new Error("Operation requires Note 'Write' access");
		}
	}

	private async encryptText(plainText: string): Promise<string> {
		return await this._cryptoCore.encryptText(this._key, plainText);
	}

	private async decryptText(cipherText: string): Promise<string> {
		return await this._cryptoCore.decryptText(this._key, cipherText);
	}

	// #endregion Private Methods
}
