import { DEFAULT_PBKDF2_ITERATIONS, BinaryData, SubtleCryptoAlgorithm, ShaType, AesBlockSize, DEFAULT_AES_BLOCK, AesGcmTagLength, DEFAULT_AES_GCM_TAG_LENGTH } from "./cryptocore-definitions";

const CryptoCore = window?.crypto.subtle;

export function isCryptographyAvailable(): boolean {
	return !!CryptoCore;
}

export function getSecureRandomBytes(length: number): Uint8Array {
	const result = new Uint8Array(length);
	return window.crypto.getRandomValues(result);
}

export async function generateAesGcmMasterKey(exportable: boolean, length: AesBlockSize = DEFAULT_AES_BLOCK): Promise<CryptoKey> {
	return await generateAesGcmKey(exportable, length, ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']);
}

export async function generateAesGcmKey(
	exportable: boolean,
	length: AesBlockSize = DEFAULT_AES_BLOCK,
	keyUsages: KeyUsage[]
): Promise<CryptoKey> {

	return await CryptoCore.generateKey({ length, name: 'AES-GCM' }, exportable, keyUsages);
}

export async function importStringAsKey(toImport: string, keyUsage: KeyUsage[] = ['deriveKey', 'deriveBits']) {
	return await CryptoCore.importKey(
		"raw",
		new TextEncoder().encode(toImport),
		SubtleCryptoAlgorithm.PBKDF2,
		false,
		keyUsage
	);
}

export async function deriveAesGcmKey(
	password: string,
	salt: BinaryData,
	exportable: boolean = false,
	blockSize: AesBlockSize = DEFAULT_AES_BLOCK,
	keyUsages: KeyUsage[] = ['encrypt', 'decrypt', 'deriveKey', 'deriveBits'],
	hash: ShaType = ShaType.Sha512,
	iterations: number = DEFAULT_PBKDF2_ITERATIONS
): Promise<CryptoKey> {
	const opts: Pbkdf2Params = {
		hash,
		salt,
		iterations,
		name: SubtleCryptoAlgorithm.PBKDF2
	};

	return await CryptoCore.deriveKey(
		opts,
		await importStringAsKey(password),
		{ name: SubtleCryptoAlgorithm.AesGcm, length: blockSize },
		exportable,
		keyUsages
	);
}

export async function deriveAesGcmSubKey(
	masterKey: CryptoKey,
	salt: BinaryData,
	info: BinaryData,
	exportable: boolean = true,
	hash: ShaType = ShaType.Sha512,
	targetBlockSize: AesBlockSize = DEFAULT_AES_BLOCK,
	keyUsages: KeyUsage[] = ['encrypt', 'decrypt']
) {

	const opts: HkdfParams = {
		name: SubtleCryptoAlgorithm.HKDF,
		salt,
		info,
		hash
	};

	return await CryptoCore.deriveKey(
		opts,
		masterKey,
		{ name: SubtleCryptoAlgorithm.AesGcm, length: targetBlockSize },
		exportable,
		keyUsages
	);
}

export async function encryptAesGcm(
	key: CryptoKey,
	data: BinaryData,
	additionalData: BinaryData,
	iv: BinaryData,
	tagLength: AesGcmTagLength = DEFAULT_AES_GCM_TAG_LENGTH
): Promise<ArrayBuffer> {
	const opts: AesGcmParams = {
		name: SubtleCryptoAlgorithm.AesGcm,
		additionalData,
		iv,
		tagLength
	};
	return await CryptoCore.encrypt(opts, key, data);
}

export async function decryptAesGcm(
	key: CryptoKey,
	data: BinaryData,
	additionalData: BinaryData,
	iv: BinaryData,
	tagLength: AesGcmTagLength = DEFAULT_AES_GCM_TAG_LENGTH
): Promise<ArrayBuffer> {

	const opts: AesGcmParams = {
		name: SubtleCryptoAlgorithm.AesGcm,
		additionalData,
		iv,
		tagLength
	};
	return await CryptoCore.decrypt(opts, key, data);
}