<template>
	<div>
		<div>
			<ConfirmPopup />

			<OverlayPanel ref="renameOverlay" :showCloseIcon="true" :dismissable="true">
				<div class="p-field rename-overlay-inline-grid">
					<label class="note-name-input-label" for="newNoteNameInput">New name</label>
					<span class="texbox-with-button">
						<InputText ref="renameNoteTextInput" id="newNoteNameInput" class="p-inputtext-lg" type="text" v-model="this.noteRenameBoxValue" />
						<Button class="p-button-icon fit-content" icon="pi pi-check" @click="submitNoteNameChange" :disabled="!this.noteRenameBoxValue" />
					</span>
				</div>
			</OverlayPanel>

			<TabView @tab-click="onTabClick" :activeIndex="activeTabIndex">
				<TabPanel v-for="note in notes" :key="note.id">
					<template #header>
						<div class="tab-header">
							<span>{{ note.name }}</span>
							<span class="tab-header-menu">
								<span v-if="note.isEncrypted" class="pi pi-shield"></span>
								<i class="pi pi-ellipsis-v p-button-icon" @click="onTabHeaderMenuClick($event, note)"></i>
							</span>
						</div>
					</template>
					<NoteTab :note="note" @noteChanged="onChange" @contextmenu="onNoteRightClick($event, note)" />
				</TabPanel>

				<TabPanel key="createNewTabKey" headerContextMenuBehavior="kill-event" :routeAllClicks="true" @click="createNewNote">
					<template #header>
						<i class="p-button-icon pi pi-plus" />
					</template>
					<p class="empty-tab" />
				</TabPanel>
			</TabView>
		</div>
	</div>
	<ContextMenu ref="tabPanelContextMenu" :model="tabPanelContextMenuItems" />
</template>

<script lang="ts">
import { PrimeIcons } from 'primevue/api';
import { defineComponent, PropType } from 'vue';
import { getLocalStorageItem, LocalStorageKey, setLocalStorageItem } from '@/infrastructure/local-storage';
import { generateNewNoteName } from '@/common-constants/note-constants';
import { ToastDuration, ToastSeverity } from '@/common-constants/prime-constants';

// An extension of PrimeVue's TabView component. Was missing some events
import ContextMenu from 'primevue/contextmenu';
import ConfirmPopup from 'primevue/confirmpopup';
import OverlayPanel from 'primevue/overlaypanel';
import InputText from 'primevue/inputtext';
import { INote } from '@/infrastructure/notes/note-interfaces';
import { noteManager } from '@/infrastructure/notes/note-manager';
import { Encryption } from '@/infrastructure/generated/api';
import { getCryptoCore } from '@/infrastructure/crypto/core/aes-gcm/crypto-core-aes-gcm';
import TabPanel from './prime-extension/prime-tabpanel';
import TabView, { TabViewEventArgs } from './prime-extension/prime-tabview';
import { downloadAsText } from '../common/utils';
import { ContextMenuCommandEventArgs, IVueMenuItem } from '../common/interfaces/base-interfaces';

import { NoteTab } from './single-note-tab.vue';
import { INoteChangedEventArgs } from './tab-interfaces';

const NoteTabsComponent = defineComponent({
	components: { TabView, TabPanel, NoteTab, ContextMenu, ConfirmPopup, OverlayPanel, InputText },

	emits: {
		noteChanged: (e: INoteChangedEventArgs) => !!e.noteId,
		newNote: (newNote: INote) => newNote?.id,
		noteRightClick: (e: { originalEvent: MouseEvent; note: INote }) => e.originalEvent && e.note?.id,
	},

	props: {
		notes: {
			type: Array as PropType<INote[]>,
			required: true,
		},
	},

	mounted() {
		const cachedIndex = getLocalStorageItem<number>(LocalStorageKey.ActiveTabIndex, { itemType: 'number' }) || 0;
		if (cachedIndex >= this.notes.length) {
			this.activeTabIndex = this.notes.length ? this.notes.length - 1 : 0;
		} else {
			this.activeTabIndex = cachedIndex;
		}
	},

	data() {
		return {
			activeTabIndex: 0,
			contextedTabHeader: undefined as INote | undefined,
			cachedHtml: {} as { [key: string]: string },
			noteRenameBoxValue: '',
		};
	},
	computed: {
		tabPanelContextMenuItems(): IVueMenuItem[] {
			const isEncrypted = this.contextedTabHeader?.encryption === Encryption.PASSWORD;
			const label = isEncrypted ? 'Decrypt' : 'Encrypt';
			const icon = isEncrypted ? PrimeIcons.UNLOCK : PrimeIcons.LOCK;
			const newEncryption = isEncrypted ? Encryption.NONE : Encryption.PASSWORD;

			return [
				{ label: 'Rename', icon: PrimeIcons.PENCIL, command: this.renameNote },
				{ label: 'Download', icon: PrimeIcons.DOWNLOAD, command: this.downloadNoteAsHTML },
				{ label: 'Archive', icon: PrimeIcons.INBOX, command: this.archiveNote },
				{ label: 'Delete', icon: PrimeIcons.TRASH, command: this.deleteNote },
				{ label, icon, command: () => this.setNoteEncryption(this.contextedTabHeader as INote, newEncryption) },
			];
		},
	},
	methods: {
		onChange(e: INoteChangedEventArgs): void {
			// Keep changes in a cache, to allow download as HTML file
			this.cachedHtml[e.noteId] = e.contentHTML;
			this.$emit('noteChanged', e);
		},

		onTabClick(e: TabViewEventArgs): void {
			this.activeTabIndex = e.index;
			setLocalStorageItem<number>(LocalStorageKey.ActiveTabIndex, e.index, { itemType: 'number' });
		},

		onTabHeaderMenuClick(e: TabViewEventArgs, tab: INote): void {
			this.contextedTabHeader = tab;
			(this.$refs.tabPanelContextMenu as ContextMenu).show(e.originalEvent || e);
		},

		onNoteRightClick(originalEvent: MouseEvent, note: INote): void {
			this.$emit('noteRightClick', { originalEvent, note });
		},

		async renameNote(e: ContextMenuCommandEventArgs): Promise<void> {
			if (!this.contextedTabHeader) {
				console.warn(`[NoteTabs.renameNote] Could not determine target note`);
				return;
			}
			this.noteRenameBoxValue = this.contextedTabHeader?.name || '';
			(this.$refs.renameOverlay as OverlayPanel).show(e.originalEvent);
		},

		async downloadNoteAsHTML(): Promise<void> {
			if (!this.contextedTabHeader) {
				console.warn(`[NoteTabs.archiveNote] Could not determine target note`);
				return;
			}
			const contextNote = this.contextedTabHeader as INote;
			const html = this.cachedHtml[contextNote.id || ''] || this.notes.find((note) => note.id === contextNote.id)?.contentHTML;
			downloadAsText(`${contextNote.name}-${new Date().getTime()}.html`, html || '');
		},

		async archiveNote(e: ContextMenuCommandEventArgs): Promise<void> {
			if (!this.contextedTabHeader) {
				console.warn(`[NoteTabs.archiveNote] Could not determine target note`);
				return;
			}
			const id = this.contextedTabHeader?.id;
			const noteName = this.contextedTabHeader?.name || 'un-named note';
			this.$confirm.require({
				target: e.originalEvent.target,
				message: `Really archive note '${noteName}'?`,
				icon: PrimeIcons.QUESTION,
				accept: async () => {
					await noteManager.archiveNoteById(this.contextedTabHeader?.id || '');
					this.$toast.add({
						severity: ToastSeverity.Info,
						summary: 'Note archived',
						detail: `Note '${noteName}' has been archived`,
						life: ToastDuration.Long,
					});
					console.log(`[NoteTabs.archiveNote] Note '${noteName}' (${this.contextedTabHeader?.id}) successfully archived`);
					this.removeContextedNote(id);
				},
			});
		},

		async deleteNote(e: ContextMenuCommandEventArgs): Promise<void> {
			if (!this.contextedTabHeader) {
				console.warn(`[NoteTabs.deleteNote] Could not determine target note`);
				return;
			}
			const id = this.contextedTabHeader?.id;
			const noteName = this.contextedTabHeader?.name || 'un-named note';
			this.$confirm.require({
				target: e.originalEvent.target,
				message: `Really delete note '${noteName}'?`,
				icon: PrimeIcons.EXCLAMATION_TRIANGLE,
				accept: async () => {
					await noteManager.deleteNoteById(this.contextedTabHeader?.id || '');
					this.$toast.add({
						severity: ToastSeverity.Info,
						summary: 'Note deleted',
						detail: `Note '${noteName}' has been deleted`,
						life: ToastDuration.Long,
					});
					console.log(`[NoteTabs.deleteNote] Note '${noteName}' (${this.contextedTabHeader?.id}) has been deleted`);
					this.removeContextedNote(id);
				},
			});
		},

		async setNoteEncryption(note: INote, newEncryption: Encryption): Promise<void> {
			if (!note) {
				console.warn(`[NoteTabs.setNoteEncryption] Could not determine target note`);
				return;
			}

			if (!getCryptoCore(newEncryption).isReady) {
				this.$toast.add({
					severity: ToastSeverity.Warn,
					summary: `Please configure your system '${newEncryption}'`,
					detail: 'Please go to encryption settings',
					life: ToastDuration.Medium,
				});
				return;
			}

			try {
				await note.setEncryption(newEncryption);
			} catch (error) {
				this.$toast.add({
					severity: ToastSeverity.Error,
					summary: `Failed to set note encryption to '${newEncryption}'`,
					detail: 'Please try again later',
					life: ToastDuration.Medium,
				});
			}
		},

		async submitNoteNameChange(): Promise<void> {
			(this.$refs.renameOverlay as OverlayPanel).hide();
			const note = this.contextedTabHeader as INote;
			if (!this.contextedTabHeader) {
				console.warn(`[NoteTabs.submitNoteNameChange] Could not determine target note`);
				return;
			}
			note.name = this.noteRenameBoxValue || 'Unnamed note';
			this.$toast.add({
				severity: ToastSeverity.Info,
				summary: 'Note renamed',
				detail: `Note '${note.name}' has been renamed to '${this.noteRenameBoxValue}'`,
				life: ToastDuration.Short,
			});
			note.name = this.noteRenameBoxValue;
			console.log(`[NoteTabs.submitNoteNameChange] Note '${note.name}' (${note.id}) has been renamed`);
		},

		async createNewNote(): Promise<void> {
			try {
				const newNoteName = generateNewNoteName(this.notes as INote[]);
				const newNote = await noteManager.createNote({ name: newNoteName });
				console.log(`[NoteTabs.createNewNote] Created a new note with name '${newNote.name}' and ID '${newNote.id}'`);
				// eslint-disable-next-line vue/no-mutating-props
				this.notes.push(newNote);
				this.$emit('newNote', newNote);
			} catch (error) {
				this.$toast.add({
					severity: ToastSeverity.Error,
					summary: 'Failed to create a new note',
					detail: 'Please try again later',
					life: ToastDuration.Medium,
				});
			}
		},

		removeContextedNote(noteId: string): void {
			const index = this.notes.findIndex((note) => note.id === noteId);
			// eslint-disable-next-line vue/no-mutating-props
			this.notes.splice(index, 1);
			this.activeTabIndex = index > 0 ? index - 1 : 0;
		},
	},
});

export const NoteTabs = NoteTabsComponent;
export default NoteTabs;
</script>

<style lang="scss" scope>
.empty-tab {
	height: 77vh;
}
.p-contextmenu {
	max-width: 150px;
}
.rename-overlay-inline-grid {
	display: inline-grid;
	.texbox-with-button {
		display: flex;
		max-height: 40px;
		.fit-content {
			height: fit-content;
		}
	}
}
.note-name-input-label {
	margin-bottom: 10px;
}
.tab-header {
	.tab-header-menu {
		margin-left: 10px;
		margin-right: -15px;
	}
	&.--no-padding {
		padding: 0;
	}
}
</style>
