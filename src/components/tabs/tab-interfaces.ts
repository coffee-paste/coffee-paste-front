export interface INoteChangedEventArgs {
    noteId: string;
    contentHTML: string;
    contentText: string;
}

export interface ITab {
    id: string;
    name: string;
    contentHTML: string;
}