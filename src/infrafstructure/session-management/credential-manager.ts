import { envFacade } from "../env-facade";

class CredentialsManager {

    public getToken(): string {
        if (envFacade.isDevMode) {
            return envFacade.devModeApiKey;
        }
        return localStorage.getItem('token') || '';
    }
}

export const credentialsManager = new CredentialsManager();