export interface IMenuItem {
    label: string;
    icon?: string;
    command?: () => void;
    url?: string;
    to?: string;
}