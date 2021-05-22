<template>
    <div>
        <div>
            <ConfirmPopup />

            <OverlayPanel ref="renameOverlay" :showCloseIcon="true" :dismissable="true">
                <div class="p-field rename-overlay-inline-grid">
                    <label class="note-name-input-label" for="newNoteNameInput">New name</label>
                    <span class="texbox-with-button">
                        <InputText ref="renameNoteTextInput" id="newNoteNameInput" class="p-inputtext-lg" type="text" v-model="this.noteRenameBoxValue" />
                        <Button class="p-button-icon fit-content" icon="pi pi-check" @click="sumbitNoteNameChange" :disabled="!this.noteRenameBoxValue" />
                    </span>
                </div>
            </OverlayPanel>

            <TabView @tab-click="onTabClick" :activeIndex="activeTabIndex">
                <TabPanel v-for="tab in tabs" :key="tab.id">
                    <template #header>
                        <div class="tab-header">
                            <span>{{tab.name}}</span>
                            <span class="tab-header-menu">
                                <i class="pi pi-ellipsis-v p-button-icon" @click="onTabHeaderMenuClick($event, tab)"></i>
                            </span>
                        </div>
                    </template>
                    <NoteTab :id="tab.id" :content="tab.contentHTML" :lastNoteFeedUpdate="tab.lastNoteFeedUpdate" @noteChanged="onChange" @contextmenu="onNoteRightClick($event, tab)" />
                </TabPanel>

                <TabPanel key="createNewTabKey" headerContextMenuBehavior="kill-event" :routeAllClicks="true" @click="createNewNote">
                    <template #header>
                        <i class="p-button-icon pi pi-plus"/>
                    </template>
                    <p class="empty-tab" />
                </TabPanel>

            </TabView>
        </div>
    </div>
    <ContextMenu ref="tabPanelContextMenu" :model="tabPanelContextMenuItems" />
</template>


<script lang='ts'>

import { PrimeIcons } from 'primevue/api';
import { INoteChangedEventArgs, INoteTab } from './tab-interfaces';
import { defineComponent, PropType } from 'vue';
import { NoteTab } from './single-note-tab.vue';
import { TabViewEventArgs } from './prime-extension/prime-tabview';
import { getLocalStorageItem, LocalStorageKey, setLocalStorageItem } from '@/infrastructure/local-storage';
import { ContextMenuCommandEventArgs, IVueMenuItem } from '../common/interfaces/base-interfaces';
import { Note, NoteStatus } from '@/infrastructure/generated/api';
import { generateNewNoteName } from '@/common-constants/note-constants';
import { ApiFacade } from '@/infrastructure/generated/proxies/api-proxies';
import { downloadAsText } from '../common/utils';
import { globalConfig } from '../common/global';
import { ToastDuration, ToastSeverity } from '../../string-constants/prime-constants';

// An extension of PrimeVue's TabView component. Was missing some events
import TabView from "./prime-extension/prime-tabview";
import TabPanel, { TabPanelProps } from "./prime-extension/prime-tabpanel";
import ContextMenu from "primevue/contextmenu";
import ConfirmPopup from 'primevue/confirmpopup';
import OverlayPanel from 'primevue/overlaypanel';
import InputText from 'primevue/inputtext';


interface INoteTabPanel extends INoteTab, TabPanelProps {
    // Joins a note's data and a normal tab panel props
}

const NoteTabsComponent = defineComponent({
    components: { TabView, TabPanel, NoteTab, ContextMenu, ConfirmPopup, OverlayPanel, InputText },
    emits: {
        noteChanged: (e: INoteChangedEventArgs) => !!e.noteId,
        newNote: (newNote: INoteTab) => newNote?.id,
        noteRightClick: (e: { originalEvent: MouseEvent; note: INoteTab }) =>
            e.originalEvent && e.note?.id,
    },
    props: {
        notes: {
            type: Array as PropType<INoteTab[]>,
            required: true,
        },
    },
    mounted() {
        const cachedIndex = getLocalStorageItem<number>(LocalStorageKey.ActiveTabIndex, { itemType: "number", }) || 0;
        if (cachedIndex >= this.tabs.length) {
            this.activeTabIndex = this.tabs.length ? this.tabs.length - 1 : 0;
        } else {
            this.activeTabIndex = cachedIndex;
        }
    },
    data() {
        return {
            tabs: (this.notes || []) as INoteTabPanel[],
            activeTabIndex: 0,
            tabPanelContextMenuItems: [
                { label: "Rename", icon: PrimeIcons.PENCIL, command: this.renameNote },
                { label: "Download", icon: PrimeIcons.DOWNLOAD, command: this.downloadNoteAsHTML },
                { label: "Archive", icon: PrimeIcons.INBOX, command: this.archiveNote },
                { label: "Delete", icon: PrimeIcons.TRASH, command: this.deleteNote },
            ] as IVueMenuItem[],
            contextedTabHeader: undefined as INoteTab | undefined,
            cachedHtml: {} as { [key: string]: string },
            noteRenameBoxValue: ''
        };
    },
    methods: {

        onChange(e: INoteChangedEventArgs): void {
			// Keep changes in a cache, to allow download as HTML file
            this.cachedHtml[e.noteId] = e.contentHTML;
            this.$emit("noteChanged", e);
        },

        onTabClick(e: TabViewEventArgs): void {
            this.activeTabIndex = e.index;
            setLocalStorageItem<number>(LocalStorageKey.ActiveTabIndex, e.index, { itemType: "number" });
        },

        onTabHeaderMenuClick(e: TabViewEventArgs, tab: INoteTab): void {
            this.contextedTabHeader = tab;
            (this.$refs.tabPanelContextMenu as ContextMenu).show(e.originalEvent || e);
        },

        onNoteRightClick(originalEvent: MouseEvent, note: INoteTab): void {
            this.$emit("noteRightClick", { originalEvent, note });
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
			const note = this.contextedTabHeader as Note;
			const html = this.cachedHtml[note.id || ''] || this.tabs.find(t => t.id === note.id)?.contentHTML;
            downloadAsText(`${note.name}-${new Date().getTime()}.html`, html || '');
        },
        async archiveNote(e: ContextMenuCommandEventArgs): Promise<void> {
            if (!this.contextedTabHeader) {
                console.warn(`[NoteTabs.archiveNote] Could not determine target note`);
                return;
            }
            const id = this.contextedTabHeader!.id;
            const noteName = this.contextedTabHeader!.name || 'un-named note';
            this.$confirm.require({
                target: e.originalEvent.target,
                message: `Really archive note '${noteName}'?`,
                icon: PrimeIcons.QUESTION,
                accept: async () => {
                    await ApiFacade.NotesApi.setNotes({ status: NoteStatus.BACKLOG }, this.contextedTabHeader!.id, globalConfig.ChannelSession);
                    this.$toast.add({
                        severity: ToastSeverity.Info,
                        summary: "Note archived",
                        detail: `Note '${noteName}' has been archived`,
                        life: ToastDuration.Long,
                    });
                    console.log(`[NoteTabs.archiveNote] Note '${noteName}' (${this.contextedTabHeader!.id}) successfully archived`);
                    this.removeContextedNote(id);
                },
            });
        },

        async deleteNote(e: ContextMenuCommandEventArgs): Promise<void> {
            if (!this.contextedTabHeader) {
                console.warn(`[NoteTabs.deleteNote] Could not determine target note`);
                return;
            }
            const id = this.contextedTabHeader!.id;
            const noteName = this.contextedTabHeader?.name || 'un-named note';
            this.$confirm.require({
                target: e.originalEvent.target,
                message: `Really delete note '${noteName}'?`,
                icon: PrimeIcons.EXCLAMATION_TRIANGLE,
                accept: async () => {
                    await ApiFacade.NotesApi.deleteNotes(this.contextedTabHeader!.id, globalConfig.ChannelSession);
                    this.$toast.add({
                        severity: ToastSeverity.Info,
                        summary: "Note deleted",
                        detail: `Note '${noteName}' has been deleted`,
                        life: ToastDuration.Long,
                    });
                    console.log(`[NoteTabs.deleteNote] Note '${noteName}' (${this.contextedTabHeader!.id}) has been deleted`);
                    this.removeContextedNote(id);
                },
            });
        },
        async sumbitNoteNameChange(): Promise<void> {
            (this.$refs.renameOverlay as OverlayPanel).hide();
            const note = this.contextedTabHeader as INoteTab;
            if (!this.contextedTabHeader) {
                console.warn(`[NoteTabs.sumbitNoteNameChange] Could not determine target note`);
                return;
            }
            await ApiFacade.NotesApi.setNotesName({ name: this.noteRenameBoxValue || 'Unnamed note' }, note.id, globalConfig.ChannelSession);
            this.$toast.add({
                severity: ToastSeverity.Info,
                summary: "Note renamed",
                detail: `Note '${note.name}' has been renamed to '${this.noteRenameBoxValue}'`,
                life: ToastDuration.Short,
            });
            note.name = this.noteRenameBoxValue;
            console.log(`[NoteTabs.sumbitNoteNameChange] Note '${note.name}' (${note.id}) has been renamed`);
        },

        async createNewNote(): Promise<void> {
            try {
                const newNoteName = generateNewNoteName(this.notes as Note[]);
                const newNoteId = await ApiFacade.NotesApi.createNote({ name: newNoteName }, globalConfig.ChannelSession);
                console.log(`[NoteTabs.createNewNote] Created a new note with name '${newNoteName}' and ID '${newNoteId}'`);
                const newNote: INoteTab = { id: newNoteId, name: newNoteName };
                this.notes.push(newNote);
                this.$emit("newNote", newNote);
            } catch (error) {
                this.$toast.add({
                    severity: ToastSeverity.Error,
                    summary: "Failed to create a new note",
                    detail: "Please try again later",
                    life: ToastDuration.Medium,
                });
            }
        },

        removeContextedNote(noteId: string): void {
            const index = this.notes.findIndex(note => note.id === noteId);
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
