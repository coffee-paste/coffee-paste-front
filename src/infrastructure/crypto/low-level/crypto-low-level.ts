import {
	DEFAULT_PBKDF2_ITERATIONS,
	BinaryData, SubtleCryptoAlgorithm,
	ShaType,
	AesBlockSize,
	DEFAULT_AES_BLOCK_BITS,
	AesGcmTagLength,
	DEFAULT_AES_GCM_TAG_BITS,
	DEFAULT_PBKDF2_SALT_BYTES
} from "./crypto-low-level-definitions";

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

export async function generateAesGcmMasterKey(exportable: boolean, length: AesBlockSize = DEFAULT_AES_BLOCK_BITS): Promise<CryptoKey> {
	return await generateAesGcmKey(exportable, length, ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']);
}

export async function generateAesGcmKey(
	exportable: boolean,
	length: AesBlockSize = DEFAULT_AES_BLOCK_BITS,
	keyUsages: KeyUsage[]
): Promise<CryptoKey> {

	return await Subtle.generateKey({ length, name: 'AES-GCM' }, exportable, keyUsages);
}

export async function importStringAsKey(toImport: string, keyUsage: KeyUsage[] = ['deriveKey', 'deriveBits']) {
	return await Subtle.importKey(
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
	blockSize: AesBlockSize = DEFAULT_AES_BLOCK_BITS,
	keyUsages: KeyUsage[] = ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey'],
	hash: ShaType = ShaType.Sha512,
	iterations: number = DEFAULT_PBKDF2_ITERATIONS
): Promise<CryptoKey> {
	const opts: Pbkdf2Params = {
		hash,
		salt,
		iterations,
		name: SubtleCryptoAlgorithm.PBKDF2
	};

	return await Subtle.deriveKey(
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
	targetBlockSize: AesBlockSize = DEFAULT_AES_BLOCK_BITS,
	keyUsages: KeyUsage[] = ['encrypt', 'decrypt']
) {

	const opts: HkdfParams = {
		name: SubtleCryptoAlgorithm.HKDF,
		salt,
		info,
		hash
	};

	return await Subtle.deriveKey(
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
	iv: BinaryData,
	additionalData?: BinaryData,
	tagLength: AesGcmTagLength = DEFAULT_AES_GCM_TAG_BITS
): Promise<ArrayBuffer> {

	const opts: AesGcmParams = {
		name: SubtleCryptoAlgorithm.AesGcm,
		iv,
		tagLength
	};

	if (additionalData) {
		opts.additionalData = additionalData;
	}

	return await Subtle.encrypt(opts, key, data);
}

export async function decryptAesGcm(
	key: CryptoKey,
	data: BinaryData,
	iv: BinaryData,
	additionalData?: BinaryData,
	tagLength: AesGcmTagLength = DEFAULT_AES_GCM_TAG_BITS

): Promise<ArrayBuffer> {

	const opts: AesGcmParams = {
		name: SubtleCryptoAlgorithm.AesGcm,
		iv,
		tagLength
	};

	if (additionalData) {
		opts.additionalData = additionalData;
	}

	return await Subtle.decrypt(opts, key, data);
}

export async function exportJwk(
	keyToExport: CryptoKey,
	kek: CryptoKey,
	iv: BinaryData,
	additionalData?: BinaryData,
	tagLength: AesGcmTagLength = DEFAULT_AES_GCM_TAG_BITS

): Promise<ArrayBuffer> {

	const wrapAlgorithm: AesGcmParams = {
		name: SubtleCryptoAlgorithm.AesGcm,
		iv,
		tagLength
	};

	if (additionalData) {
		wrapAlgorithm.additionalData = additionalData;
	}

	return await Subtle.wrapKey(
		'jwk',
		keyToExport,
		kek,
		wrapAlgorithm
	);
}
