
<template>
    <div>
        <div>
            <TabView @tab-click="onTabClick">
                <TabPanel v-for="tab in tabs" :key="tab.id" :header="tab.name">
                    <NoteTab
                        :id="tab.id"
                        :content="tab.content"
                        @noteChanged="noteChanged"
                    />
                </TabPanel>
                <TabPanel :key="newTabKey" header="+" >
                    <p class="empty-tab" />
                </TabPanel>
            </TabView>
        </div>
    </div>
</template>


<script lang='ts'>
import TabView from "primevue/tabview";
import TabPanel from "primevue/tabpanel";
import { INoteChangedEventArgs, INoteTab } from "./tab-interfaces";
import { defineComponent, PropType } from "vue";
import { NoteTab } from "./single-note-tab.vue";

const CREATE_TAB_KEY = "create-new-tab";

const NoteTabsComponent = defineComponent({
    components: { TabView, TabPanel, NoteTab },
    emits: {
        noteChanged: (e: INoteChangedEventArgs) => !!e.noteId,
        newNote: () => true,
    },
    props: {
        tabs: {
            type: Array as PropType<INoteTab[]>,
            required: true,
        },
    },
    data() {
        return {
            tab: this.tabs,
            newTabKey: CREATE_TAB_KEY,
        };
    },
    methods: {
        onChange(e: INoteChangedEventArgs): void {
            this.$emit("noteChanged", {
                noteId: e.noteId,
                contentHTML: e.contentHTML,
                contentText: e.contentText,
            });
        },
        onTabClick(e: { originalEvent: {isTrusted: boolean}, index: number }): void {
            if (!this.tabs || e.index === this.tabs.length) {
                this.$emit("newNote");
            }
        },
    },
});

export const NoteTabs = NoteTabsComponent;
export default NoteTabs;
</script>

<style lang="scss" scope>
.empty-tab {
    height: 72vh;
}
</style>