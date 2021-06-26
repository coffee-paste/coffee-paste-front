export type BinaryData = Int8Array | Int16Array | Int32Array | Uint8Array | Uint16Array | Uint32Array | Uint8ClampedArray | Float32Array | Float64Array | DataView | ArrayBuffer;

export enum ShaType {
	Sha1 = 'SHA-1',
	Sha256 = 'SHA-256',
	Sha384 = 'SHA-384',
	Sha512 = 'SHA-512'
}

export enum SubtleCryptoAlgorithm {
	RsaOaep = 'RSA-OAEP',
	PBKDF2 = 'PBKDF2',
	AesCtr = 'AES-CTR',
	AesCbc = 'AES-CBC',
	AesGcm = 'AES-GCM',
	HKDF = 'HKDF'
}

export type AesBlockSize = 128 | 192 | 256;

export type AesGcmTagLength = 32 | 64 | 96 | 104 | 112 | 120 | 128;

export const DEFAULT_AES_GCM_TAG_BITS: AesGcmTagLength = 128;

export const DEFAULT_AES_BLOCK_BITS: AesBlockSize = 256;

export const DEFAULT_AES_IV_BYTES: number = 96;

//#region PBKDF2

export const DEFAULT_PBKDF2_SALT_BYTES: number = 32;

export const DEFAULT_PBKDF2_ITERATIONS: number = 1000; // Increase after R&D complete!

//#endregion PBKDF2
