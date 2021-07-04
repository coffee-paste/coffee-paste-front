// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface NotesArchiveProps {}

declare class NotesArchive {
	$props: NotesArchiveProps;
	toggle(event: Event): void;
	show(event: Event, target?: unknown): void;
	hide(): void;
}

export default NotesArchive;
