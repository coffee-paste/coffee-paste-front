
<template>
    <div>
        <div>
            <TabView @tab-click="onTabClick" :activeIndex="activeTabIndex">
                <TabPanel v-for="tab in tabs" :key="tab.id" :header="tab.name">
                    <NoteTab
                        :id="tab.id"
                        :content="tab.contentHTML"
                        @noteChanged="onChange"
                        :lastNoteFeedUpdate="tab.lastNoteFeedUpdate"
                    />
                </TabPanel>
                <TabPanel :key="newTabKey" header="+">
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
import {
    getLocalStorageItem,
    LocalStorageKey,
    setLocalStorageItem,
} from "@/infrafstructure/local-storage";

const CREATE_TAB_KEY = "create-new-tab";

const NoteTabsComponent = defineComponent({
    components: { TabView, TabPanel, NoteTab },
    emits: {
        noteChanged: (e: INoteChangedEventArgs) => !!e.noteId,
        newNote: () => true,
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
        };
    },
    methods: {
        onChange(e: INoteChangedEventArgs): void {
            this.$emit("noteChanged", e);
        },
        onTabClick(e: { originalEvent: { isTrusted: boolean }, index: number }): void {
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