import { Encryption, Note, StatusNoteIdBody } from '../generated/api';

export interface INoteContents {
	contentText: string;
	contentHTML: string;
}

export interface INote extends Omit<Note, 'randomNoteSalt' | 'contentText'> {
	setStatus(status: StatusNoteIdBody): Promise<void>;
	setContents(contents: INoteContents): void;
	setEncryption(value: Encryption): Promise<void>;
	delete(): Promise<void>;
	dispose(): void;
}

export interface INotesPage {
	notes: INote[];
	totalCount: number;
}
