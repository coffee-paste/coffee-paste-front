import { generateNewNoteName } from '@/common-constants/note-constants';
import debounce from 'lodash.debounce';
import { getCryptoCore } from '../crypto/core/aes-gcm/crypto-core-aes-gcm';
import { ICryptoCore } from '../crypto/core/common/crypto-core-definitions';
import { NotesSocket } from './notes-socket';
import { NoteUpdateEvent, OutgoingNoteUpdate } from '../generated/api/channel-spec';
import { Encryption, Note, StatusNoteIdBody } from '../generated/api';
import { ApiFacade } from '../generated/proxies/api-proxies';
import { IDisposable } from '../common-interfaces.ts/disposable';
import { INote, INoteContents } from './note-interfaces';

const DEFAULT_UPDATE_DEBOUNCE_MS = 500;

/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-param-reassign */

function RequireWriteAccess(target: NoteWrapper, propertyKey: string, descriptor: PropertyDescriptor) {
	const originalMethod: Function = descriptor.value;

	descriptor.value = (...args: any[]) => {
		if (target.isReadOnly) {
			throw new Error(`Note ${target.name} (${target.id}) is readonly`);
		}
		originalMethod.apply(args);
	};
}

// eslint-enable @typescript-eslint/ban-types
// eslint-enable @typescript-eslint/no-explicit-any
// eslint-enable no-param-reassign

// Set contents should receive NoteContents.
// No individual setters for contentText/contentHtml!

// No getter for contentText

export class NoteWrapper implements INote, IDisposable {
	// #region Members

	private _key: CryptoKey;

	private _cryptoCore: ICryptoCore;

	private _note: Note;

	private _socket?: NotesSocket;

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

	public set encryption(value: Encryption) {
		this.setEncryption(value);
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

	@RequireWriteAccess
	public setContents(contents: INoteContents): void {
		this._note.contentText = contents.contentText;
		this._note.contentHTML = contents.contentHTML;

		if (!this.isEncrypted) {
			return;
		}

		debounce(async (debounceContents: INoteContents): Promise<void> => {
			await ApiFacade.NotesApi.setNoteContent(
				{
					contentText: await this._cryptoCore.encryptText(this._key, debounceContents.contentText),
					contentHTML: await this._cryptoCore.encryptText(this._key, debounceContents.contentHTML),
				},
				this._note.id,
				this._socket?.channelKey
			);
		}, DEFAULT_UPDATE_DEBOUNCE_MS)(contents);
	}

	@RequireWriteAccess
	public async setStatus(status: StatusNoteIdBody): Promise<void> {
		await ApiFacade.NotesApi.setNoteStatus(status, this.id, this._socket?.channelKey);
	}

	@RequireWriteAccess
	public async delete(): Promise<void> {
		await ApiFacade.NotesApi.deleteNotes(this.id);
		// Detach the handler from the socket- note will be deleted so
		// no further updates are required
		this.detachSocket();
	}

	public dispose(): void {
		this.detachSocket();
	}

	// #endregion Public Methods

	// #region Private Methods

	@RequireWriteAccess
	private setName(value: string): void {
		this._note.name = value;
		debounce(async (name: string): Promise<void> => {
			await ApiFacade.NotesApi.setNoteName({ name }, this.id, this._socket?.channelKey);
		}, DEFAULT_UPDATE_DEBOUNCE_MS)(value);
	}

	@RequireWriteAccess
	private setEncryption(value: Encryption): void {
		throw new Error(`Encryption setter not yet implemented (value ${value})`);
	}

	@RequireWriteAccess
	private setTags(value: string[]): void {
		this._note.tags = value || [];
		debounce(async (tags: string[]): Promise<void> => {
			await ApiFacade.NotesApi.setNoteTags(tags || [], this.id, this._socket?.channelKey);
		}, DEFAULT_UPDATE_DEBOUNCE_MS)(value);
	}

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

	private detachSocket(): void {
		this._socket?.message.detach(this._onSocketMessage);
	}

	// #endregion Private Methods
}
