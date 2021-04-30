<template>
    <div class="main-view">
        <MainViewToolbar :status="channelStatus" />
        <NoteTabs
            :key="lastNoteFeedUpdate"
            :notes="notes"
            @noteChanged="onNoteChanged"
            @newNote="onNewNote"
        />
        <div class="status-container">
            MSG STATUS: <strong>{{ msgStatus }}</strong>
        </div>
    </div>
</template>

<script lang="ts">
import { NotesApi } from "@/infrastructure/api";
import { defineComponent } from "vue";
import { NoteTabs } from "./tabs/note-tabs.vue";
import { INoteChangedEventArgs, INoteTab } from "./tabs/tab-interfaces";
import { credentialsManager } from "../infrastructure/session-management/credential-manager";
import { MainViewToolbar } from "./toolbar/main-view-toolbar.vue";
import { IStatus, StatusType } from "./toolbar/menu-interfaces";
import { NotesSocket } from "../infrastructure/notes-socket";
import { NoteStringConstants } from '../string-constants/note-constants';

const channelStatus = {
    unknown: { status: 'Unknown', statusType: StatusType.Error },
    loading: { status: 'Loading', statusType: StatusType.Ok },
    noNotes: { status: 'No notes found', statusType: StatusType.Warning },
    error: { status: 'Error', statusType: StatusType.Error },
    workspaceFetchFailed: { status: 'Failed to fetch workspace', statusType: StatusType.Error },
    open: { status: 'OK', statusType: StatusType.Ok },
    closed: { status: 'Closed', statusType: StatusType.Error },
}

let ws: WebSocket;

export default defineComponent({
    components: { NoteTabs, MainViewToolbar },
    created() {
        this.load();
    },
    data() {
        return {
            channelStatus: channelStatus.unknown as IStatus,
            msgStatus: "UNKNOWN",
            notes: [] as INoteTab[],
            lastNoteFeedUpdate: `${new Date().getTime()}`,
        };
    },
    methods: {
        async load() {
            this.channelStatus = channelStatus.loading;

            try {
                this.notes = (await new NotesApi({ apiKey: credentialsManager.getToken() }).getOpenNotes()) as INoteTab[];
                if (this.notes?.length > 0 !== true) {
                    this.channelStatus = channelStatus.noNotes;
                    this.$toast.add({
                        severity: "warn",
                        summary: channelStatus.noNotes.status,
                        detail: "There isn't a single note in your workspace! Creating one right... now...",
                        life: 10000,
                    });
                    await new NotesApi({ apiKey: credentialsManager.getToken() }).createNote({ name: NoteStringConstants.NewNote });
                    this.$toast.add({
                        severity: "success",
                        summary: "New note created",
                        detail: "Your very first note is ready for use",
                        life: 6000,
                    });
                    return;
                }

                const channelKey = await new NotesApi({ apiKey: credentialsManager.getToken() }).getChannelKey();

                this.lastNoteFeedUpdate = `${new Date().getTime()}`;

                ws = new NotesSocket(channelKey);

                ws.onopen = () => {
                    this.channelStatus = channelStatus.open;
                };

                ws.onerror = () => {
                    this.channelStatus = channelStatus.error;
                };

                ws.onclose = () => {
                    this.channelStatus = channelStatus.closed;
                    this.load();
                };

                ws.onmessage = (msg) => {
                    const { noteId, contentHTML } = JSON.parse(msg.data);
                    console.log(
                        `Incoming message:  ${JSON.stringify(msg.data)}`
                    );
                    this.lastNoteFeedUpdate = `${new Date().getTime()}`;
                    this.msgStatus = `RECIVED AT ${new Date().toString()}`;
                    const changedNote = this.notes.find((n) => n.id === noteId);

                    if (!changedNote) {
                        this.notes.push({
                            contentHTML,
                            id: noteId,
                            name: "", // TODO add this prop to the message
                            lastNoteFeedUpdate: `${new Date().getTime()}`,
                        });
                        return;
                    }

                    changedNote.contentHTML = contentHTML;
                    changedNote.lastNoteFeedUpdate = `${new Date().getTime()}`;
                };
            } catch (error) {
                this.channelStatus = channelStatus.workspaceFetchFailed;
                this.$toast.add({
                    severity: "error",
                    summary: channelStatus.workspaceFetchFailed.status,
                    detail:
                        "Please check your connection and try again later",
                    life: 10000,
                });
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
            try {
                console.log("Creating a new note...");
                const newNoteId = await new NotesApi({ apiKey: credentialsManager.getToken() }).createNote({ name: NoteStringConstants.NewNote });
                this.notes.push({ id: newNoteId, name: NoteStringConstants.NewNote });
            } catch (error) {
                this.$toast.add({
                    severity: "error",
                    summary: "Failed to create a new note",
                    detail: "Please try again later",
                    life: 6000,
                });
            }
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
