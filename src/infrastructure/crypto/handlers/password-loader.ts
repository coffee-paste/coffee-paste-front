import { Encryption } from '@/infrastructure/generated/api';
import { ApiFacade } from '@/infrastructure/generated/proxies/api-proxies';
import { getCryptoCore } from '../core/aes-gcm/crypto-core-aes-gcm';
import { DEFAULT_AES_BLOCK_BITS } from '../low-level/crypto-low-level-definitions';

export async function loadPassword(plainPassword: string): Promise<boolean> {
	// Replace with a fetch from store/server
	const cryptoCore = getCryptoCore(Encryption.PASSWORD);
	if (cryptoCore.isReady) {
		return true;
	}

	try {
		const kekB64 = await ApiFacade.UsersApi.getUserLocalStorageKeyEncryptionKey();
		const saltB64 = await ApiFacade.UsersApi.getUserLocalStorageSalt();

		// This needs to change to perform a transient decryption without overwriting the MK...
		// The way it is right now, every password attempt overwrite the MK which is really bad.
		// A temporary solution.
		const succeeded = await cryptoCore.createAndStoreMasterKey(plainPassword, {
			kekB64,
			aesGcm: { saltB64, blockSize: DEFAULT_AES_BLOCK_BITS },
		});

		return succeeded;
	} catch (error) {
		console.error(`Failed to loadPassword - ${error.message}`);
		return false;
	}
}

export async function loadPasswordMasterKey(): Promise<boolean> {
	// Replace with a fetch from store/server
	const cryptoCore = getCryptoCore(Encryption.PASSWORD);
	if (cryptoCore.isReady) {
		return true;
	}

	try {
		const kekB64 = await ApiFacade.UsersApi.getUserLocalStorageKeyEncryptionKey();
		const succeeded = await cryptoCore.loadMasterKey(kekB64);

		return succeeded;
	} catch (error) {
		console.error(`Failed to loadPasswordMasterKey - ${error.message}`);
		return false;
	}
}
