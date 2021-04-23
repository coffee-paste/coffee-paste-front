class EnvFacade {

    private _isDevMode: boolean = process.env.VUE_APP_LOCAL_DEV === 'true';
    public get isDevMode(): boolean {
        return this._isDevMode;
    }

    private _devModeApiKey?: string = process.env.VUE_APP_DEV_TOKEN;
    public get devModeApiKey(): string {
        return this._devModeApiKey || '';
    }

    private _apiUrl?: string = process.env.VUE_APP_API_URL;
    public get apiUrl(): string {
        return this._apiUrl || '';
    }
}

export const envFacade = new EnvFacade();