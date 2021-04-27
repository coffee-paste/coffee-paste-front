
<template>
    <div>
        <div>
            <TabView
                @tab-click="onTabClick"
                :activeIndex="activeTabIndex"
                @tab-header-context-menu="onTabHeaderRightClick"
            >
                <TabPanel v-for="tab in tabs" :key="tab.id" :header="tab.name">
                    <NoteTab
                        :id="tab.id"
                        :content="tab.contentHTML"
                        @noteChanged="onChange"
                        :lastNoteFeedUpdate="tab.lastNoteFeedUpdate"
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



import { PrimeIcons } from "primevue/api";
import { INoteChangedEventArgs, INoteTab } from "./tab-interfaces";
import { defineComponent, PropType } from "vue";
import { NoteTab } from "./single-note-tab.vue";
import { TabViewEventArgs } from "./prime-extension/prime-tabview";

import {
    getLocalStorageItem,
    LocalStorageKey,
    setLocalStorageItem,
} from "@/infrafstructure/local-storage";

// An extension of PrimeVue's TabView component. Was missing some events
import TabView from "./prime-extension/prime-tabview";
import TabPanel from "./prime-extension/prime-tabpanel";
//import TabPanel from "primevue/tabpanel";
import ContextMenu from "primevue/contextmenu";
import { IVueMenuItem } from "../common/interfaces";
import { NotesApi, NoteStatus } from "@/infrafstructure/api-client";
import { credentialsManager } from "@/infrafstructure/session-management/credential-manager";

const CREATE_TAB_KEY = `create-new-tab_${Math.random()}`;

const NoteTabsComponent = defineComponent({
    components: { TabView, TabPanel, NoteTab, ContextMenu },
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
        const cachedIndex =
            getLocalStorageItem<number>(LocalStorageKey.ActiveTabIndex, {
                itemType: "number",
            }) || 0;
        if (cachedIndex >= this.tabs.length) {
            this.activeTabIndex = this.tabs.length ? this.tabs.length - 1 : 0;
        } else {
            this.activeTabIndex = cachedIndex;
        }
    },
    data() {
        return {
            tabs: this.notes || [],
            newTabKey: CREATE_TAB_KEY,
            activeTabIndex: 0,
            tabPanelContextMenuItems: [
                { label: "Rename", icon: PrimeIcons.PENCIL, command: this.renameNote },
                { label: "Archive", icon: PrimeIcons.INBOX, command: this.archiveNote },
                { label: "Delete", icon: PrimeIcons.TRASH, command: this.deleteNote },
            ] as IVueMenuItem[],
            contextedTabHeader: {index: undefined, note: undefined } as  { index?: number, note?: INoteTab } | undefined
        };
    },
    methods: {
        onChange(e: INoteChangedEventArgs): void {
            this.$emit("noteChanged", e);
        },
        onTabClick(e: TabViewEventArgs): void {
            this.activeTabIndex = e.index;
            setLocalStorageItem<number>(
                LocalStorageKey.ActiveTabIndex,
                e.index,
                { itemType: "number" }
            );
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

        async renameNote(e: MouseEvent): Promise<void> {
            if (!isTabHeaderContextOk(this.contextedTabHeader)) {
                console.warn(`[NoteTabs.renameNote] Could not determine target note`);
                return;
            }
            console.log(`INACTIVE --- Renaming note ${this.contextedTabHeader!.note!.name} (${this.contextedTabHeader!.note!.id})`);
        },

        async archiveNote(e: MouseEvent): Promise<void> {
            if (!isTabHeaderContextOk(this.contextedTabHeader)) {
                console.warn(`[NoteTabs.archiveNote] Could not determine target note`);
                return;
            }
            console.log(`Archiving note ${this.contextedTabHeader!.note!.name} (${this.contextedTabHeader!.note!.id})`);
            await new NotesApi({ apiKey: credentialsManager.getToken() }).setNotes({status: NoteStatus.BACKLOG }, this.contextedTabHeader!.note!.id);
            console.log(`Note ${this.contextedTabHeader!.note!.name} (${this.contextedTabHeader!.note!.id}) successfully archived`);
            this.notes.splice(this.contextedTabHeader!.index!, 1);
        },

        async deleteNote(e: MouseEvent): Promise<void> {
            if (!isTabHeaderContextOk(this.contextedTabHeader)) {
                console.warn(`[NoteTabs.deleteNote] Could not determine target note`);
                return;
            }
            console.log(`INACTIVE --- Deleting note ${this.contextedTabHeader!.note!.name} (${this.contextedTabHeader!.note!.id})`);
        }
    },
});

function isTabHeaderContextOk(context?: { index?: number, note?: INoteTab }): boolean {
    const isOk = !!context && context.index !== undefined && !!context.note;
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
</style>