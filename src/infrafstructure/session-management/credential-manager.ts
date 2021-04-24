import { envFacade } from "../env-facade";
import { getLocalStorageItem, LocalStorageKey, setLocalStorageItem } from "../local-storage";

class CredentialsManager {

    public getToken(): string {
        if (envFacade.isDevMode) {
            return getLocalStorageItem<string>(LocalStorageKey.DevToken, { itemType: "string" }) || '';
        }
        return '';
    }

    public setToken(token: string) {
        if (envFacade.isDevMode) {
            setLocalStorageItem<string>(
                LocalStorageKey.DevToken,
                token,
                { itemType: "string" }
            );
        }
    }
}

export const credentialsManager = new CredentialsManager();