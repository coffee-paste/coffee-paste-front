import { fromByteArray, toByteArray } from 'base64-js';
import {
	DEFAULT_PBKDF2_ITERATIONS,
	BinaryData,
	SubtleCryptoAlgorithm,
	ShaType,
	AesBlockSize,
	DEFAULT_AES_BLOCK_BITS,
	AesGcmTagLength,
	DEFAULT_AES_GCM_TAG_BITS,
	DEFAULT_PBKDF2_SALT_BYTES,
	DEFAULT_PBKDF2_KEY_USAGES,
	DEFAULT_AES_GCM_KEY_USAGES,
	IAesGcmEncryptedBlob,
	DEFAULT_AES_IV_BYTES,
} from './crypto-low-level-definitions';

const Subtle = window?.crypto.subtle;

export function isCryptographyAvailable(): boolean {
	return !!Subtle;
}

export function getSecureRandomBytes(length: number): Uint8Array {
	return window.crypto.getRandomValues(new Uint8Array(length));
}

export function getPbkdf2Salt(): Uint8Array {
	return getSecureRandomBytes(DEFAULT_PBKDF2_SALT_BYTES);
}

export async function generateAesGcmKey(
	exportable: boolean,
	length: AesBlockSize = DEFAULT_AES_BLOCK_BITS,
	keyUsages: KeyUsage[] = DEFAULT_AES_GCM_KEY_USAGES
): Promise<CryptoKey> {
	return Subtle.generateKey({ length, name: 'AES-GCM' }, exportable, keyUsages);
}

export async function generateAesGcmMasterKey(exportable: boolean, length: AesBlockSize = DEFAULT_AES_BLOCK_BITS): Promise<CryptoKey> {
	return generateAesGcmKey(exportable, length);
}

export async function importKeyForPbkdf2(toImport: BinaryData, keyUsage: KeyUsage[] = DEFAULT_PBKDF2_KEY_USAGES): Promise<CryptoKey> {
	return Subtle.importKey('raw', toImport, { name: SubtleCryptoAlgorithm.PBKDF2 }, false, keyUsage);
}

export async function importBase64KeyForPbkdf2(toImport: string, keyUsage: KeyUsage[] = DEFAULT_PBKDF2_KEY_USAGES): Promise<CryptoKey> {
	return importKeyForPbkdf2(toByteArray(toImport), keyUsage);
}

export async function importStringKeyForPbkdf2(toImport: string, keyUsage: KeyUsage[] = DEFAULT_PBKDF2_KEY_USAGES): Promise<CryptoKey> {
	return importKeyForPbkdf2(new TextEncoder().encode(toImport), keyUsage);
}

export async function importBase64AesGcmKey(toImport: string, exportable: boolean, keyUsage = DEFAULT_AES_GCM_KEY_USAGES): Promise<CryptoKey> {
	return Subtle.importKey('raw', toByteArray(toImport), { name: SubtleCryptoAlgorithm.AesGcm }, exportable, keyUsage);
}

export async function createMasterKey(
	password: string,
	salt: BinaryData,
	exportable = false,
	blockSize: AesBlockSize = DEFAULT_AES_BLOCK_BITS,
	iterations: number = DEFAULT_PBKDF2_ITERATIONS,
	hash: ShaType = ShaType.Sha512
): Promise<CryptoKey> {
	const importedPbkdf = await importStringKeyForPbkdf2(password);
	const algorithm: Pbkdf2Params = { salt, hash, iterations, name: SubtleCryptoAlgorithm.PBKDF2 };
	const masterKeyMaterial = await Subtle.deriveBits(algorithm, importedPbkdf, blockSize);
	const result = await Subtle.importKey('raw', masterKeyMaterial, SubtleCryptoAlgorithm.HKDF, exportable, ['deriveKey', 'deriveBits']);
	console.log('Master key created');
	return result;
}

export async function deriveAesGcmSubKey(
	masterKey: CryptoKey,
	salt: BinaryData,
	info: BinaryData,
	exportable = false,
	hash: ShaType = ShaType.Sha512,
	targetBlockSize: AesBlockSize = DEFAULT_AES_BLOCK_BITS,
	keyUsages: KeyUsage[] = DEFAULT_AES_GCM_KEY_USAGES
): Promise<CryptoKey> {
	const opts: HkdfParams = {
		name: SubtleCryptoAlgorithm.HKDF,
		salt,
		info,
		hash,
	};
	console.log(`MK: ${masterKey.usages}, ${JSON.stringify(masterKey.algorithm)}`);
	return Subtle.deriveKey(opts, masterKey, { name: SubtleCryptoAlgorithm.AesGcm, length: targetBlockSize }, exportable, keyUsages);
}

export async function encryptAesGcm(
	key: CryptoKey,
	data: BinaryData,
	additionalData?: BinaryData,
	iv?: BinaryData,
	tagLength: AesGcmTagLength = DEFAULT_AES_GCM_TAG_BITS
): Promise<IAesGcmEncryptedBlob> {
	if (!iv) {
		// eslint-disable-next-line no-param-reassign
		iv = getSecureRandomBytes(DEFAULT_AES_IV_BYTES);
	}

	const opts: AesGcmParams = {
		name: SubtleCryptoAlgorithm.AesGcm,
		iv,
		tagLength,
	};

	if (additionalData) {
		opts.additionalData = additionalData;
	}

	return {
		b64EncryptedData: fromByteArray(new Uint8Array(await Subtle.encrypt(opts, key, data))),
		b64AdditionalData: additionalData ? fromByteArray(additionalData as Uint8Array) : undefined,
		b64Iv: fromByteArray(iv as Uint8Array),
	};
}

export async function decryptAesGcm(
	encryptedKeyBlob: IAesGcmEncryptedBlob,
	key: CryptoKey,
	tagLength: AesGcmTagLength = DEFAULT_AES_GCM_TAG_BITS
): Promise<ArrayBuffer> {
	const opts: AesGcmParams = {
		name: SubtleCryptoAlgorithm.AesGcm,
		iv: toByteArray(encryptedKeyBlob.b64Iv),
		tagLength,
	};

	if (encryptedKeyBlob.b64AdditionalData) {
		opts.additionalData = toByteArray(encryptedKeyBlob.b64AdditionalData);
	}

	const cipherText = toByteArray(encryptedKeyBlob.b64EncryptedData);
	try {
		return await Subtle.decrypt(opts, key, cipherText);
	} catch (error) {
		console.log(`[CryptoLowLevel.decryptAesGcm] Failed to decrypt AES-GCM data- ${error}`);
		throw error;
	}
}

export async function exportRawAesGcmKey(
	keyToExport: CryptoKey,
	kek: CryptoKey,
	additionalData?: BinaryData,
	tagLength: AesGcmTagLength = DEFAULT_AES_GCM_TAG_BITS
): Promise<IAesGcmEncryptedBlob> {
	const iv = getSecureRandomBytes(DEFAULT_AES_IV_BYTES);
	const wrapAlgorithm: AesGcmParams = {
		name: SubtleCryptoAlgorithm.AesGcm,
		iv,
		tagLength,
	};

	if (additionalData) {
		wrapAlgorithm.additionalData = additionalData;
	}

	const binaryJwk = await Subtle.wrapKey('raw', keyToExport, kek, wrapAlgorithm);

	return {
		b64Iv: fromByteArray(iv),
		b64EncryptedData: fromByteArray(new Uint8Array(binaryJwk)),
		b64AdditionalData: additionalData ? fromByteArray(additionalData as Uint8Array) : undefined,
	};
}

export async function importRawKey(
	encryptedKeyBlob: IAesGcmEncryptedBlob,
	kek: CryptoKey,
	exportable = false,
	keyUsages: KeyUsage[] = DEFAULT_AES_GCM_KEY_USAGES,
	tagLength: AesGcmTagLength = DEFAULT_AES_GCM_TAG_BITS
): Promise<CryptoKey> {
	const unwrapAlgorithm: AesGcmParams = {
		name: SubtleCryptoAlgorithm.AesGcm,
		iv: toByteArray(encryptedKeyBlob.b64Iv),
		additionalData: encryptedKeyBlob.b64AdditionalData ? toByteArray(encryptedKeyBlob.b64AdditionalData) : undefined,
		tagLength,
	};
/*
	try {
		const results = await Subtle.unwrapKey(
			'raw',
			toByteArray(encryptedKeyBlob.b64EncryptedData),
			kek,
			unwrapAlgorithm,
			{ name: SubtleCryptoAlgorithm.HKDF },
			exportable,
			keyUsages
		);
		console.log(`Unwrapped key: ${results.usages}`);
		return results;
	} catch (err) {
		console.log(`Unwrap failed: ${err}`);
		throw err;
	}
*/

	const decrypted = await decryptAesGcm(encryptedKeyBlob, kek);
	return Subtle.importKey('raw', decrypted, SubtleCryptoAlgorithm.HKDF, exportable, ['deriveBits', 'deriveKey']);
}
