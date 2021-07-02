import { getLocalStorageItem, LocalStorageKey, setLocalStorageItem } from "@/infrastructure/local-storage";
import {
	decryptAesGcm,
	deriveAesGcmKey,
	deriveAesGcmSubKey,
	encryptAesGcm,
	exportJwkAesGcm,
	getPbkdf2Salt,
	getSecureRandomBytes,
	importBase64AesGcmKey,
	importJwkAesGcm,
	isCryptographyAvailable
} from "../../low-level/crypto-low-level";
import { BinaryData, DEFAULT_AES_IV_BYTES, IAesGcmEncryptedBlob } from "../../low-level/crypto-low-level-definitions";
import { IStoredKey } from "../common/crypto-core-definitions";
import { toByteArray, fromByteArray } from 'base64-js';
import { INote } from "@/components/tabs/tab-interfaces";

export class CryptoCoreAesGcm {

	private _masterKey: CryptoKey;

	public get isReady(): boolean {
		return !!this._masterKey;
	}

	public get isSupported(): boolean {
		return isCryptographyAvailable();
	}

	public constructor() {

	}

	public async createAndStoreMasterKey(password: string, serverKekB64: string, localStorageKey: LocalStorageKey = LocalStorageKey.MasterKey): Promise<void> {
		// Create a master key from the given password.
		// We don't need to save the salt- password comparisons are not needed
		const masterKey = await deriveAesGcmKey(password, getPbkdf2Salt(), true);

		// Import the KEK provided by the server
		const kek = await importBase64AesGcmKey(serverKekB64, false);

		// Export the master key and encrypt it via the KEK
		const encryptedKeyBlob = await exportJwkAesGcm(masterKey, kek);

		// Store the encrypted key blob in the local storage
		setLocalStorageItem<IAesGcmEncryptedBlob>(localStorageKey, encryptedKeyBlob, { itemType: 'object' });
	}

	public async loadMasterKey(serverKekB64: string, localStorageKey: LocalStorageKey = LocalStorageKey.MasterKey): Promise<boolean> {
		try {
			const encryptedKeyBlob = getLocalStorageItem<IAesGcmEncryptedBlob>(localStorageKey, { itemType: 'object' });
			if (!encryptedKeyBlob) {
				return false;
			}
			const kek = await importBase64AesGcmKey(serverKekB64, false);
			this._masterKey = await importJwkAesGcm(encryptedKeyBlob, kek)
			return true;

		} catch (err) {
			console.error(`[CryptoCoreAesGcm.loadMasterKey] Failed to load the a master key- ${err}`);
			return false;
		}
	}

	public async createSubKey(saltB64: string, contextPermutationB64: string): Promise<CryptoKey> {
		if (!this.isReady) {
			throw new Error('CryptoCoreAesGcm instance is not ready');
		}
		return await deriveAesGcmSubKey(this._masterKey, toByteArray(saltB64), toByteArray(contextPermutationB64));
	}
}

export class Note {

	private _key: CryptoKey;

	public constructor(noteData: INote) {
	}

	public async encryptText(text: string): Promise<IAesGcmEncryptedBlob> {
		return await encryptAesGcm(this._key, new TextEncoder().encode(text));
	}

	public async decrypt(text: string): Promise<IAesGcmEncryptedBlob> {
		return await encryptAesGcm(this._key, new TextEncoder().encode(text));
	}
}
