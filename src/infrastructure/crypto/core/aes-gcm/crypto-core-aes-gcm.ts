import { LocalStorageKey, setLocalStorageItem } from "@/infrastructure/local-storage";
import { deriveAesGcmKey, encryptAesGcm, exportJwk, generateAesGcmMasterKey, getPbkdf2Salt, getSecureRandomBytes, importStringAsKey, isCryptographyAvailable } from "../../low-level/crypto-low-level";
import { BinaryData, DEFAULT_AES_BLOCK_BITS, DEFAULT_AES_IV_BYTES } from "../../low-level/crypto-low-level-definitions";
import { IStoredKey } from "../common/crypto-core-definitions";
import { toByteArray, fromByteArray } from 'base64-js';


export class CryptoCore {

	private _masterKey: BinaryData;

	public get isReady(): boolean {
		return !!this._masterKey;
	}

	public get isSupported(): boolean {
		return isCryptographyAvailable();
	}

	public constructor() {

	}

	public async storeEncryptedKey(password: string, serverKek: string, localStorageKey: LocalStorageKey = LocalStorageKey.MasterKey): Promise<void> {

		const salt = getPbkdf2Salt();
		const masterKey = await deriveAesGcmKey(password, salt, true);
		const exportIv = getSecureRandomBytes(DEFAULT_AES_IV_BYTES);
		const kek = await generateAesGcmMasterKey(false, DEFAULT_AES_BLOCK_BITS); // await importStringAsKey(serverKek);
		const jwk = await exportJwk(masterKey, kek, exportIv);
		const kaki = fromByteArray(new Uint8Array(jwk));
		debugger;
		setLocalStorageItem(localStorageKey, jwk, { itemType: 'object' });
	}
}