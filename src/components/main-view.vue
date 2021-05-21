<template>
    <div class="main-view">
        <MainViewToolbar :status="channelStatus" :msgStatus="msgStatus" />
        <div v-if="firstInitialization" class="initialization-loader-conteiner">
            <ProgressSpinner strokeWidth="3" style="width:150px;height:150px" />
        </div>
        <div v-else>
            <NoteTabs :key="lastNoteFeedUpdate" :notes="notes" @noteChanged="onNoteChanged" @newNote="onNewNote" />
        </div>
    </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { NoteTabs } from "./tabs/note-tabs.vue";
import { INoteChangedEventArgs, INoteTab } from "./tabs/tab-interfaces";
import { MainViewToolbar } from "./toolbar/main-view-toolbar.vue";
import { IStatus, StatusType } from "./toolbar/menu-interfaces";
import { NotesSocket } from '../infrastructure/notes-socket';
import { globalConfig } from './common/global';
import { generateNewNoteName } from "@/string-constants/note-constants";
import { ApiFacade } from "@/infrastructure/generated/proxies/api-proxies";
import { NoteUpdateEvent, OutgoingNoteUpdate } from "@/infrastructure/generated/api/channel-spec";
import { ToastDuration, ToastSeverity } from "@/string-constants/prime-constants";

const channelStatus = {
    unknown: { status: 'Unknown Issue', statusType: StatusType.Error },
    loading: { status: 'Connection Initializing', statusType: StatusType.Loading },
    noNotes: { status: 'No notes found', statusType: StatusType.Warning },
    error: { status: 'Connection Error', statusType: StatusType.Error },
    workspaceFetchFailed: { status: 'Failed to fetch workspace', statusType: StatusType.Error },
    open: { status: 'Connection OK', statusType: StatusType.Ok },
    closed: { status: 'Connection Closed', statusType: StatusType.Error },
}

let ws: NotesSocket;

export default defineComponent({
    components: { NoteTabs, MainViewToolbar },
    async created() {
        // Load notes
        await this.loadNotes();
        // Open updated feed channel
        await this.openChannel();
        // Set first intialization as true
        this.firstInitialization = false;
    },
    data() {
        return {
            firstInitialization: true,
            channelStatus: channelStatus.unknown as IStatus,
            msgStatus: null as unknown as Date,
            notes: [] as INoteTab[],
            lastNoteFeedUpdate: `${new Date().getTime()}`,
        };
    },
    methods: {
        async openChannel() {
            try {
                const channelSession = await ApiFacade.NotesApi.getChannelKey();
                globalConfig.ChannelSession = channelSession;

                ws = new NotesSocket(channelSession);
                this.channelStatus = channelStatus.loading;
                ws.onopen = () => {
                    this.channelStatus = channelStatus.open;
                };

                ws.onerror = () => {
                    this.channelStatus = channelStatus.error;
                };

                ws.onclose = () => {
                    this.channelStatus = channelStatus.closed;
                    this.openChannel();
                };

                ws.onmessage = (msg) => {
                    const outgoingNoteUpdate = JSON.parse(msg.data) as OutgoingNoteUpdate;
                    console.log(`Incoming message:  ${JSON.stringify(outgoingNoteUpdate)}`);

                    if (outgoingNoteUpdate.event !== NoteUpdateEvent.FEED) {
                        // Currently, if the update is not content update, re-render all page.
                        // TODO: chnage only required property (or add/remove the note)
                        this.loadNotes();
                        return;
                    }

                    this.lastNoteFeedUpdate = `${new Date().getTime()}`;
                    this.msgStatus = new Date();
                    const changedNote = this.notes.find((n) => n.id === outgoingNoteUpdate.noteId);

                    if (!changedNote) {
                        // Thre is a new note, so rload notes
                        this.loadNotes();
                        return;
                    }

                    changedNote.contentHTML = outgoingNoteUpdate.contentHTML;
                    changedNote.lastNoteFeedUpdate = `${new Date().getTime()}`;
                };
            } catch (error) {
                this.channelStatus = channelStatus.workspaceFetchFailed;
                console.log(error);
            }
        },
        async loadNotes() {
            this.channelStatus = channelStatus.loading;

            try {
                this.notes = (await ApiFacade.NotesApi.getOpenNotes()) as INoteTab[];
                if (!this.notes?.length) {
                    this.channelStatus = channelStatus.noNotes;
                    this.$toast.add({
                        severity: ToastSeverity.Warn,
                        summary: channelStatus.noNotes.status,
                        detail:
                            "There isn't a single note in your workspace! Creating one right... now...",
                        life: ToastDuration.Long,
                    });
                    const name = generateNewNoteName([]);
                    const id = await ApiFacade.NotesApi.createNote({ name });
                    this.$toast.add({
                        severity: ToastSeverity.Success,
                        summary: "New note created",
                        detail: "Your very first note is ready for use",
                        life: ToastDuration.Medium,
                    });

                    this.notes = [
                        {
                            id,
                            name,
                            contentHTML: "",
                            lastNoteFeedUpdate: `${new Date().getTime()}`,
                        },
                    ];
                }

                this.lastNoteFeedUpdate = `${new Date().getTime()}`;
                this.channelStatus = channelStatus.open;

            } catch (error) {
                this.channelStatus = channelStatus.workspaceFetchFailed;
                this.$toast.add({
                    severity: ToastSeverity.Error,
                    summary: channelStatus.workspaceFetchFailed.status,
                    detail: "Please check your connection and try again later",
                    life: ToastDuration.Long,
                });
                console.log(error);
            }
        },
        onNoteChanged(e: INoteChangedEventArgs): void {
            if (!ws) {
                console.error("No websocket open, cannot send update");
                return;
            }
            ws.sendNoteUpdate(e);
            this.msgStatus = new Date();
        },
        async onNewNote(newNote: INoteTab): Promise<void> {

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
    .initialization-loader-conteiner {
        margin-top: 30vh;
    }
}

.p-cascadeselect-label {
    padding: 0.5rem 0.5rem !important;
}
</style>
