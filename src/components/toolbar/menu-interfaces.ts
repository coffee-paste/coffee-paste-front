export enum StatusType {
    Ok = 'Ok',
    Error = 'Error',
    Unknown = 'Unknown',
    Loading = 'Loading',
    Warning = 'Warning'
}

export interface IStatus {
    status: string;
    statusType: StatusType;
}
