class EnvFacade {

    private _isDevMode: boolean = process.env.VUE_APP_LOCAL_DEV === 'true';
    public get isDevMode(): boolean {
        return this._isDevMode;
    }

    private _apiUrl?: string = process.env.VUE_APP_API_URL;
    public get apiUrl(): string {
        return this._apiUrl || '';
    }
    
    private _googleClientId?: string = process.env.VUE_APP_GOOGLE_CLIENT_ID;
    public get googleClientId(): string {
        return this._googleClientId || '';
    }

    private _githubClientId?: string = process.env.VUE_APP_GITHUB_CLIENT_ID;
    public get githubClientId(): string {
        return this._githubClientId || '';
    }

    private _gitlabClientId?: string = process.env.VUE_APP_GITLAB_CLIENT_ID;
    public get gitlabClientId(): string {
        return this._gitlabClientId || '';
    }

}

export const envFacade = new EnvFacade();