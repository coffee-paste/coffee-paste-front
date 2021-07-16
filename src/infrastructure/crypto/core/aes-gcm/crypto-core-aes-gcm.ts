import { getLocalStorageItem, LocalStorageKey, setLocalStorageItem } from '@/infrastructure/local-storage';
import { toByteArray } from 'base64-js';
import { Encryption } from '@/infrastructure/generated/api';
import { IAesGcmEncryptedBlob } from '../../low-level/crypto-low-level-definitions';
import { ICryptoCore, IServerSideEncryptionSettings } from '../common/crypto-core-definitions';
import {
	decryptAesGcm,
	deriveAesGcmKey,
	deriveAesGcmSubKey,
	encryptAesGcm,
	exportJwkAesGcm,
	importBase64AesGcmKey,
	importJwkAesGcm,
	isCryptographyAvailable,
} from '../../low-level/crypto-low-level';

/**
 * A CryptoCore designed to work with PBKDF2-AES-GCM
 *
 * @description Refer to the documentation for `ICryptoCore` for more information
 *
 * @class CryptoCoreAesGcm
 * @implements {ICryptoCore}
 */
class CryptoCoreAesGcm implements ICryptoCore {
	private masterKey: CryptoKey;

	public get isReady(): boolean {
		return !!this.masterKey;
	}

	public get isSupported(): boolean {
		return isCryptographyAvailable();
	}

	public async createAndStoreMasterKey(
		password: string,
		settings: IServerSideEncryptionSettings,
		localStorageKey: LocalStorageKey = LocalStorageKey.MasterKey
	): Promise<void> {
		// Run the password though PBKDF2 using the server-provided salt and settings
		const { saltB64, blockSize, pbkdf2Iterations } = settings.aesGcm;
		const masterKey = await deriveAesGcmKey(password, toByteArray(saltB64), true, blockSize, pbkdf2Iterations);

		// Import the KEK provided by the server
		const kek = await importBase64AesGcmKey(settings.kekB64, false);

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
			this.masterKey = await importJwkAesGcm(encryptedKeyBlob, kek);
			return true;
		} catch (err) {
			console.error(`[CryptoCoreAesGcm.loadMasterKey] Failed to load the a master key- ${err}`);
			return false;
		}
	}

	public async createSubKey(saltB64: string, contextPermutation: string, contextType: 'base64' | 'text'): Promise<CryptoKey> {
		if (!this.isReady) {
			throw new Error('CryptoCoreAesGcm instance is not ready');
		}
		return deriveAesGcmSubKey(
			this.masterKey,
			toByteArray(saltB64),
			contextType === 'base64' ? toByteArray(contextPermutation) : new TextEncoder().encode(contextPermutation)
		);
	}

	public async encryptText(key: CryptoKey, text: string): Promise<string> {
		return JSON.stringify(await encryptAesGcm(key, new TextEncoder().encode(text)));
	}

	public async decryptText(key: CryptoKey, encryptedB64KeyBlob: string): Promise<string> {
		return new TextDecoder().decode(await decryptAesGcm(JSON.parse(encryptedB64KeyBlob), key));
	}
}

/* The CryptoCore has some state so elected to use a Facade over singletons.
 * Saves the need to constantly re-decrypt/import the master key
 */

const cryptoCoreAesGcm = new CryptoCoreAesGcm();

/**
 * Gets a `CryptoCore` instance based on the given `Encryption`
 *
 * @export
 * @param {Encryption} encryptionType The `Encryption` type for which to get a suitable `CryptoCore`
 * @return {*} {ICryptoCore}
 */
export function getCryptoCore(encryptionType: Encryption): ICryptoCore {
	switch (encryptionType) {
		case Encryption.PASSWORD:
			return cryptoCoreAesGcm;
		case Encryption.CERTIFICATE:
			throw new Error('Certificate-based encryption is not yet available');
		default:
			throw new Error(`Unknown encryption type ${encryptionType}`);
	}
}
