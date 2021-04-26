export interface IMenuItem {
    label: string;
    icon?: string;
    command?: () => void;
    url?: string;
    to?: string;
}

export enum StatusType {
    Ok = 'Ok',
    Error = 'Error',
    Unknown = 'Unknown',
    Warning = 'Warning'
}

export interface IStatus {
    status: string;
    statusType: StatusType;
}