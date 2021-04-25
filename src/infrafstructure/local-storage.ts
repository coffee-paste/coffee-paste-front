

export enum LocalStorageKey {
    Profile = "PROFILE",
    DevToken = "DEV_TOKEN",
    LoginWith = "LOGIN_WITH",
    ActiveTabIndex = "ACTIVE_TAB_INDEX",
    IsLocalDev = "IS_LOCAL_DEV",
}

const g = typeof '';
export interface LocalStorageItemOptions {
    itemType: 'number' | 'string' | 'object' | 'boolean';
}

export function getLocalStorageItem<T>(localStorageKey: LocalStorageKey, LocalStorageItemOptions: LocalStorageItemOptions): T | undefined {
    const rawItem = localStorage.getItem(localStorageKey);

    if (rawItem === null) {
        return undefined;
    }

    switch (LocalStorageItemOptions.itemType) {
        case 'string':
            return rawItem as unknown as T;
        case 'number':
            return parseInt(rawItem, 10) as unknown as T;
        case 'object':
            return JSON.parse(rawItem) as T;
        case 'boolean':
            return (rawItem === 'true') as unknown as T;
    }
}

export function setLocalStorageItem<T>(localStorageKey: LocalStorageKey, value: T, LocalStorageItemOptions: LocalStorageItemOptions) {
    let stringToStore: any;

    switch (LocalStorageItemOptions.itemType) {
        case 'string':
            stringToStore = value;
            break;
        case 'number':
        case 'boolean':
            stringToStore = `${value}`;
            break;
        case 'object':
            stringToStore = JSON.stringify(value);
            break;
    }

    localStorage.setItem(localStorageKey, stringToStore);
}

export function removeLocalStorageItem<T>(localStorageKey: LocalStorageKey) {
    localStorage.removeItem(localStorageKey);
}
