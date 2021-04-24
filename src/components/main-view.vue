<template>
    <div class="main-view">
        <MainViewToolbar/>
        <NoteTabs 
            :tabs="notes"
            @noteChanged="onNoteChanged" 
            @newNote="onNewNote"
        />
        <div class="status-container">
            CHANNEL STATUS: <strong>{{ status }}</strong> <br />
            MSG STATUS: <strong>{{ msgStatus }}</strong>
        </div>
    </div>
</template>

<script lang="ts">
import { NotesApi } from "@/infrafstructure/api-client";
import { defineComponent } from "vue";
import { NoteTabs } from "./tabs/note-tabs.vue";
import { INoteChangedEventArgs, INoteTab } from "./tabs/tab-interfaces";
import { credentialsManager } from "../infrafstructure/session-management/credential-manager";
import { MainViewToolbar } from "./toolbar/main-view-toolbar.vue";
import { NotesSocket } from "../infrafstructure/notes-socket";

let ws: WebSocket;

export default defineComponent({
    components: { NoteTabs, MainViewToolbar },
    created() {
        this.load();
    },
    data() {
        return {
            status: "UNKNOWN",
            msgStatus: "UNKNOWN",
            lastFeedUpdate: `${new Date().getTime()}`,
            notes: [] as INoteTab[],
        };
    },
    methods: {
        async load() {
            this.status = "LOADING";

            try {
                console.log(`Fetching open notes...`);
                this.notes = (await new NotesApi({ apiKey: credentialsManager.getToken() }).getOpenNotes()) as INoteTab[];
                console.log(`Done! Content: ${JSON.stringify(this.notes)}`);

                if (this.notes?.length > 0 !== true) {
                    this.status = "NO NOTES FOUND";
                    return;
                }

                ws = new NotesSocket();

                ws.onopen = () => { this.status = "OPEN"; };

                ws.onerror = () => {this.status = "ERROR"; };

                ws.onclose = () => {
                    this.status = "CLOSE";
                    this.load();
                };

                ws.onmessage = (msg) => {
                    const data = JSON.parse(msg.data);
                    console.log(`Incoming message:  ${JSON.stringify(msg.data)}`);
                    this.lastFeedUpdate = `${new Date().getTime()}`;
                    this.msgStatus = `RECIVED AT ${new Date().toString()}`;
                };

            } catch (error) {
                this.status = "ERROR FETCH WORKSPACE";
                console.log(error);
            }
        },
        onNoteChanged(e: INoteChangedEventArgs): void {
            if (!ws) {
                console.error("No websocket open, cannot send update");
                return;
            }
            ws.send(
                JSON.stringify({
                    noteId: e.noteId,
                    contentHTML: e.contentHTML,
                    contentText: e.contentText,
                })
            );
            this.msgStatus = `SENT AT ${new Date().toString()}`;
        },
        async onNewNote(): Promise<void> {
            console.log('Creating new note...')
            const newNoteId = await new NotesApi({apiKey: credentialsManager.getToken()}).createNotes();
            this.notes.push({id: newNoteId });
        },
    },
});
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style lang="scss">
.main-view {
    // Fix new line issue https://github.com/quilljs/quill/issues/1074
    * {
        margin: 0;
    }
    .status-container {
        margin-top: 1em;
    }
}
</style>
