
<template>
    <div>
        <div>
            <TabView>
                <TabPanel v-for="tab in tabs" :key="tab.id" :header="tab.name">
                    <NoteTab
                        :id="tab.id"
                        :content="tab.content"
                        @noteChanged="noteChanged"
                    />
                </TabPanel>
                <TabPanel title="+" />
            </TabView>
        </div>
    </div>
</template>


<script lang='ts'>

import TabView from "primevue/tabview";
import TabPanel from "primevue/tabpanel";
import { INoteChangedEventArgs, ITab } from "./tab-interfaces";
import { defineComponent, PropType } from "vue";
import { NoteTab } from './single-note-tab.vue';

const NoteTabsComponent = defineComponent({
    components: { TabView, TabPanel, NoteTab },
    emits: {
        noteChanged: (e: INoteChangedEventArgs) => !!e.noteId,
    },
    props: {
        tabs: {
            type: Array as PropType<ITab[]>,
            required: true,
        },
    },
    data() {
        return {
            tab: this.tabs,
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
    },
});

export const NoteTabs = NoteTabsComponent;
export default NoteTabs;

</script>

<style lang="scss" scope>
</style>