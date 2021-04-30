
<template>
    <div>
        <div>
            <ConfirmPopup />

            <OverlayPanel ref="renameOverlay" :showCloseIcon="true" :dismissable="true">
                <div class="p-field rename-overlay-inline-grid">
                    <label class="note-name-input-label" for="newNoteNameInput">New name</label>
                    <span class="texbox-with-button">
                        <InputText ref="renameNoteTextInput" id="newNoteNameInput" class="p-inputtext-lg" type="text" v-model="this.noteRenameBoxValue" />
                        <Button class="pi pi-check p-button-icon" @click="sumbitNoteNameChange" :disabled="!this.noteRenameBoxValue"/>
                    </span>
                </div>
            </OverlayPanel>

            <TabView
                @tab-click="onTabClick"
                :activeIndex="activeTabIndex"
                @tab-header-context-menu="onTabHeaderRightClick"
            >
                <TabPanel v-for="tab in tabs" :key="tab.id" :header="tab.name">
                    <NoteTab
                        :id="tab.id"
                        :content="tab.contentHTML"
                        :lastNoteFeedUpdate="tab.lastNoteFeedUpdate"
                        @noteChanged="onChange"
                        @contextmenu="onNoteRightClick($event, tab)"
                    />
                </TabPanel>

                <TabPanel :key="newTabKey" headerContextMenuBehavior="kill-event" header="+">
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
import { ContextMenuCommandEventArgs, IVueMenuItem } from '../common/interfaces';
import { NotesApi, NoteStatus } from '@/infrastructure/api';
import { credentialsManager } from '@/infrastructure/session-management/credential-manager';

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

const CREATE_TAB_KEY = `create-new-tab_${Math.random()}`;

const NoteTabsComponent = defineComponent({
    components: { TabView, TabPanel, NoteTab, ContextMenu, ConfirmPopup, OverlayPanel, InputText },
    emits: {
        noteChanged: (e: INoteChangedEventArgs) => !!e.noteId,
        newNote: () => true,
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
            newTabKey: CREATE_TAB_KEY,
            activeTabIndex: 0,
            tabPanelContextMenuItems: [
                { label: "Rename", icon: PrimeIcons.PENCIL, command: this.renameNote },
                { label: "Archive", icon: PrimeIcons.INBOX, command: this.archiveNote },
                { label: "Delete", icon: PrimeIcons.TRASH, command: this.deleteNote },
            ] as IVueMenuItem[],
            contextedTabHeader: { index: undefined, note: undefined } as  { index?: number, note?: INoteTab } | undefined,
            noteRenameBoxValue: ''
        };
    },
    methods: {
        onChange(e: INoteChangedEventArgs): void {
            this.$emit("noteChanged", e);
        },
        onTabClick(e: TabViewEventArgs): void {
            this.activeTabIndex = e.index;
            setLocalStorageItem<number>(LocalStorageKey.ActiveTabIndex, e.index, { itemType: "number" });
            if (!this.tabs || e.index === this.tabs.length) {
                this.$emit("newNote");
            }
        },
        onTabHeaderRightClick(e: TabViewEventArgs): void {
            this.contextedTabHeader = { index: e.index, note: this.tabs[e.index] };
            (this.$refs.tabPanelContextMenu as ContextMenu).show(e.originalEvent);
        },

        onNoteRightClick(originalEvent: MouseEvent, note: INoteTab): void {
            this.$emit("noteRightClick", { originalEvent, note });
        },

        async renameNote(e: ContextMenuCommandEventArgs): Promise<void> {
            if (!isTabHeaderContextOk(this.contextedTabHeader)) {
                console.warn(`[NoteTabs.renameNote] Could not determine target note`);
                return;
            }
            this.noteRenameBoxValue = this.contextedTabHeader?.note?.name || '';
            (this.$refs.renameOverlay as OverlayPanel).show(e.originalEvent);
        },

        async archiveNote(e: ContextMenuCommandEventArgs): Promise<void> {
            if (!isTabHeaderContextOk(this.contextedTabHeader)) {
                console.warn(`[NoteTabs.archiveNote] Could not determine target note`);
                return;
            }

            const noteName = this.contextedTabHeader?.note?.name || 'un-named note';
            this.$confirm.require({
                target: e.originalEvent.target,
                message: `Really archive note '${noteName}'?`,
                icon: PrimeIcons.QUESTION,
                accept: async () => {
                    await new NotesApi({ apiKey: credentialsManager.getToken() }).setNotes({status: NoteStatus.BACKLOG }, this.contextedTabHeader!.note!.id);
                    this.$toast.add({
                        severity: "info",
                        summary: "Note archived",
                        detail: `Note '${noteName}' has been archived`,
                        life: 10000,
                    });
                    console.log(`[NoteTabs.archiveNote] Note '${noteName}' (${this.contextedTabHeader!.note!.id}) successfully archived`);
                    this.removeContextedNote();
                },
            });
        },

        async deleteNote(e: ContextMenuCommandEventArgs): Promise<void> {
            if (!isTabHeaderContextOk(this.contextedTabHeader)) {
                console.warn(`[NoteTabs.deleteNote] Could not determine target note`);
                return;
            }

            const noteName = this.contextedTabHeader?.note?.name || 'un-named note';
            this.$confirm.require({
                target: e.originalEvent.target,
                message: `Really delete note '${noteName}'?`,
                icon: PrimeIcons.EXCLAMATION_TRIANGLE,
                accept: async () => {
                    await new NotesApi({ apiKey: credentialsManager.getToken() }).deleteNotes(this.contextedTabHeader!.note!.id); 
                    this.$toast.add({
                        severity: "info",
                        summary: "Note deleted",
                        detail: `Note '${noteName}' has been deleted`,
                        life: 10000,
                    });
                    console.log(`[NoteTabs.deleteNote] Note '${noteName}' (${this.contextedTabHeader!.note!.id}) has been deleted`);
                    this.removeContextedNote();
                },
            });
        },
        async sumbitNoteNameChange(): Promise<void> {
            (this.$refs.renameOverlay as OverlayPanel).hide();
            const note = this.notes[this.contextedTabHeader!.index!];
            await new NotesApi({ apiKey: credentialsManager.getToken() }).setNotesName({ name: this.noteRenameBoxValue || 'Unnamed note'}, note.id); 
            this.$toast.add({
                severity: "info",
                summary: "Note renamed",
                detail: `Note '${note.name}' has been renamed to '${this.noteRenameBoxValue}'`,
                life: 5000,
            });
            note.name = this.noteRenameBoxValue;
            console.log(`[NoteTabs.sumbitNoteNameChange] Note '${note.name}' (${note.id}) has been renamed`);
        },
        removeContextedNote(): void {
            this.notes.splice(this.contextedTabHeader!.index!, 1);
        },
    },
});

function isTabHeaderContextOk(context?: { index?: number, note?: INoteTab }): boolean {
    const isOk = !!context && context.index !== undefined && !!context.note?.id;
    if (!isOk) {
        console.warn('[NoteTabs.isTabHeaderContextOk] Tab header context in incorrect');
    }
    return isOk;
}

export const NoteTabs = NoteTabsComponent;
export default NoteTabs;

</script>

<style lang="scss" scope>
.empty-tab {
    height: 72vh;
}
.p-contextmenu {
    max-width: 150px;
}
.rename-overlay-inline-grid {
    display: inline-grid;
    .texbox-with-button {
        display: flex;
        max-height: 40px;
    }
}
.note-name-input-label {
    margin-bottom: 10px;
}
</style>
