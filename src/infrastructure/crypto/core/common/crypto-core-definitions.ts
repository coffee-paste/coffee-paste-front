import { LocalStorageKey } from '@/infrastructure/local-storage';
import { AesBlockSize } from '../../low-level/crypto-low-level-definitions';

/**
 * Describes a high level cryptographic services provider
 *
 * @export
 * @interface ICryptoCore
 */
export interface ICryptoCore {
	/**
	 * Indicates whether the instance is ready for use (i.e. a master key has been loaded)
	 *
	 * @type {boolean}
	 * @memberof ICryptoCore
	 */
	isReady: boolean;

	/**
	 * Indicates whether the current `CryptoCore` instance/type is supported.\
	 *
	 * @description Will be false if context is not 'secure' (refer to )
	 *
	 * @type {boolean}
	 * @memberof ICryptoCore
	 */
	isSupported: boolean;

	/**
	 * Creates, encrypts and stores a master key from the given passwords
	 *
	 * @param {string} password The password to derive the master key from
	 * @param {IServerSideEncryptionSettings} settings The settings object provided by the server. Controls encryption behavior and provides other data
	 *
	 * Used to encrypt the master key before storing it in the local storage
	 * @param {LocalStorageKey} localStorageKey The local storage key under which to store the encrypted master key
	 * @return {boolean} {Promise<boolean>} A promise that is resolved when a master key has been generated, encrypted and stored in the local storage
	 * @memberof ICryptoCore
	 */
	createAndStoreMasterKey(password: string, settings: IServerSideEncryptionSettings, localStorageKey?: LocalStorageKey): Promise<boolean>;

	/**
	 * Loads a previously encrypted master key from the given local storage location
	 *
	 * @param {string} serverKekB64 A Base64-encoded Key Encryption Key provided by the server.
	 *
	 * Used to decrypt the master key stored in the local storage
	 * @param {LocalStorageKey} localStorageKey The local storage key under which the encrypted master key is stored
	 * @return {*} {Promise<boolean>} A promise that is resolved when a master key has been read from the local storage, decrypted and loaded into memory
	 * @memberof ICryptoCore
	 */
	loadMasterKey(serverKekB64: string, localStorageKey?: LocalStorageKey): Promise<boolean>;

	/**
	 *  Create a sub-key from the loaded master key
	 *
	 * @param {string} saltB64 The Base64 encoded salt for the operation
	 * @param {string} contextPermutation A context permuter. Used to deterministically generate a sub-key in a reproducible way
	 * @param {('base64' | 'text')} contextType The `contextPermutation` type- Base64 or plain string
	 * @return {*} {Promise<CryptoKey>} A promise, that, when resolved, contains a `CryptoKey` object wrapping the new sub-key
	 * @memberof ICryptoCore
	 */
	createSubKey(saltB64: string, contextPermutation: string, contextType: 'base64' | 'text'): Promise<CryptoKey>;

	/**
	 * Encrypts the given text using the given key
	 *
	 * @param {CryptoKey} key The encryption key to use
	 * @param {string} text The text to encrypt
	 * @return {*} {Promise<string>} A promise, that, when resolved, contains a stringified encrypted data blob
	 * @memberof ICryptoCore
	 */
	encryptText(key: CryptoKey, text: string): Promise<string>;

	/**
	 * Decrypts the given blob using the given key
	 *
	 * @param {CryptoKey} key The decryption key to use
	 * @param {string} encryptedB64KeyBlob The stringified encrypted data blob produced by a previous call to `encryptText`
	 * @return {*} {Promise<string>} A promise, that, when resolved, contains the decrypted text contained within the `encryptedB64KeyBlob`
	 * @memberof ICryptoCore
	 */
	decryptText(key: CryptoKey, encryptedB64KeyBlob: string): Promise<string>;
}

/**
 * A structure containing encryption settings and parameters provided by the server
 *
 * @export
 * @interface IServerSideEncryptionSettings
 */
export interface IServerSideEncryptionSettings {
	/**
	 * The server's Key Encryption Key (KEK) as a Base64 string.
	 *
	 * Used to encrypt/decrypt local-storage blobs
	 *
	 * @type {string}
	 * @memberof IServerSideEncryptionSettings
	 */
	kekB64: string;

	/**
	 * Contains parameters and options relevant to the split-key AES-GCM encryption scheme
	 */
	aesGcm: {
		/**
		 * A Base64 Salt to use with the key derivation part of the AES-GCM scheme
		 *
		 * @type {string}
		 */
		saltB64: string;

		/**
		 * The number of PBKDF2 iterations to use. Affects the security of the stored password hash
		 *
		 * @type {number}
		 */
		pbkdf2Iterations?: number;

		/**
		 * The AES block size to use
		 *
		 * @type {AesBlockSize}
		 */
		blockSize: AesBlockSize;
	};
}
