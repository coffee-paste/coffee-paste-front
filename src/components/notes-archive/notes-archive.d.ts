export interface NotesArchiveProps {
}

declare class NotesArchive {
	$props: NotesArchiveProps;
	toggle(event: Event): void;
    show(event: Event, target?: any): void;
    hide(): void;
}

export default NotesArchive;
