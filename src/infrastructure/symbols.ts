
export interface OAuthProvider {
    name: string;
    displayName: string;
    icon: string;
    oauthUrl: string;
}

export enum Theme {
    Light = 'md-light-indigo',
    Dark = 'vela-purple',
}