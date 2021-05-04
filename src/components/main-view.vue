<template>
	<div class="main-view">
		<MainViewToolbar :status="channelStatus" />
		<NoteTabs :key="lastNoteFeedUpdate" :notes="notes" @noteChanged="onNoteChanged" @newNote="onNewNote" />
		<!-- <div class="status-container">
            MSG STATUS: <strong>{{ msgStatus }}</strong>
        </div> -->
	</div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { NoteTabs } from "./tabs/note-tabs.vue";
import { INoteChangedEventArgs, INoteTab } from "./tabs/tab-interfaces";
import { MainViewToolbar } from "./toolbar/main-view-toolbar.vue";
import { IStatus, StatusType } from "./toolbar/menu-interfaces";
import { NotesSocket } from '../infrastructure/notes-socket';
import { generateNewNoteName } from "@/string-constants/note-constants";
import { ApiFacade } from "@/infrastructure/generated/proxies/api-proxies";
import { ToastDuration, ToastSeverity } from "@/string-constants/prime-constants";

const channelStatus = {
	unknown: { status: 'Unknown', statusType: StatusType.Error },
	loading: { status: 'Loading', statusType: StatusType.Ok },
	noNotes: { status: 'No notes found', statusType: StatusType.Warning },
	error: { status: 'Error', statusType: StatusType.Error },
	workspaceFetchFailed: { status: 'Failed to fetch workspace', statusType: StatusType.Error },
	open: { status: 'OK', statusType: StatusType.Ok },
	closed: { status: 'Closed', statusType: StatusType.Error },
}

let ws: NotesSocket;

export default defineComponent({
	components: { NoteTabs, MainViewToolbar },
	created() {
		// Load notes
		this.loadNotes();
		// Open updated feed channel
		this.openChannel();
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
		async openChannel() {
			try {
				const channelKey = await ApiFacade.NotesApi.getChannelKey();

				ws = new NotesSocket(channelKey);

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
					const { noteId, contentHTML } = JSON.parse(msg.data);
					console.log(`Incoming message:  ${JSON.stringify(msg.data)}`);
					this.lastNoteFeedUpdate = `${new Date().getTime()}`;
					this.msgStatus = `RECIVED AT ${new Date().toString()}`;
					const changedNote = this.notes.find((n) => n.id === noteId);

					if (!changedNote) {
						// Thre is a new note, so rload notes
						this.loadNotes();
						return;
					}

					changedNote.contentHTML = contentHTML;
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
			this.msgStatus = `SENT AT ${new Date().toString()}`;
		},
		async onNewNote(newNote: INoteTab): Promise<void> {
			ws.sendNoteUpdate({ noteId: newNote.id });
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
