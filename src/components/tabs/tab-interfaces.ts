export interface INoteChangedEventArgs {
	noteId: string;
	contentHTML: string;
	contentText: string;
}

export interface INoteTab {
	id: string;
	name?: string;
	contentHTML?: string;
	lastNoteFeedUpdate?: string;
}
