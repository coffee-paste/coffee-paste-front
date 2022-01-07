<template>
	<div class="main-view">
		<MainViewToolbar :status="channelStatus" :msgStatus="msgStatus" />
		<div v-if="firstInitialization" class="initialization-loader-container">
			<ProgressSpinner strokeWidth="3" style="width: 150px; height: 150px" />
		</div>
		<div v-else>
			<NoteTabs :key="lastModifiedTime" :notes="notes" @noteChanged="onNoteChanged" @newNote="onNewNote" />
		</div>
	</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { ToastDuration, ToastSeverity } from '@/common-constants/prime-constants';
import { generateNewNoteName } from '@/common-constants/note-constants';
import { NoteUpdateEvent } from '@/infrastructure/generated/api/channel-spec';
import { noteManager } from '@/infrastructure/notes/note-manager';
import { INote } from '@/infrastructure/notes/note-interfaces';
import { getCryptoCore } from '@/infrastructure/crypto/core/aes-gcm/crypto-core-aes-gcm';
import { Encryption } from '@/infrastructure/generated/api';
import { IStatus, StatusType } from './toolbar/menu-interfaces';
import { MainViewToolbar } from './toolbar/main-view-toolbar.vue';
import { INoteTab } from './tabs/tab-interfaces';
import { NoteTabs } from './tabs/note-tabs.vue';

const channelStatus = {
	unknown: { status: 'Unknown Issue', statusType: StatusType.Error },
	loading: { status: 'Connection Initializing', statusType: StatusType.Loading },
	noNotes: { status: 'No notes found', statusType: StatusType.Warning },
	error: { status: 'Connection Error', statusType: StatusType.Error },
	workspaceFetchFailed: { status: 'Failed to fetch workspace', statusType: StatusType.Error },
	open: { status: 'Connection OK', statusType: StatusType.Ok },
	closed: { status: 'Connection Closed', statusType: StatusType.Error },
};

export default defineComponent({
	components: { NoteTabs, MainViewToolbar },
	async created() {
		const kekB64 = 'suKNPDkzQpZV7z8QpsqzZRqRPtvlejqsRsx9cW6z2d8=';
		const cryptoCore = getCryptoCore(Encryption.PASSWORD);
		const masterKeyLoaded = await cryptoCore.loadMasterKey(kekB64);
		console.log(`Master key ${masterKeyLoaded ? 'successfully loaded' : 'was not loaded'}`);

		/*
		const saltB64 = 'NNNNPDkzQpZV7z8QpsqzZRqRPtvlejqsRsx9cW6z2d8=';
		if (!(await cryptoCore.loadMasterKey(kekB64))) {
			await cryptoCore.createAndStoreMasterKey('1234', {
				kekB64,
				aesGcm: {
					saltB64,
					blockSize: DEFAULT_AES_BLOCK_BITS,
				},
			});
		}
		*/

		await noteManager.initialize();
		// Open updated feed channel
		await this.attachChannelHandlers();

		// Load notes
		await this.loadNotes();

		// Set first initialization as true
		this.firstInitialization = false;
	},
	data() {
		return {
			firstInitialization: true,
			channelStatus: channelStatus.unknown as IStatus,
			msgStatus: null as unknown as Date,
			notes: [] as INote[],
			lastModifiedTime: `${new Date().getTime()}`,
		};
	},
	methods: {
		async attachChannelHandlers() {
			try {
				noteManager.socket.opened.attach(() => {
					this.channelStatus = channelStatus.open;
				});

				noteManager.socket.error.attach(() => {
					this.channelStatus = channelStatus.error;
				});

				noteManager.socket.closed.attach(() => {
					this.channelStatus = channelStatus.closed;
					this.attachChannelHandlers();
				});

				noteManager.socket.message.attach((sender, messagePayload) => {
					console.log(`Incoming message:  ${JSON.stringify(messagePayload)}`);

					if (messagePayload.event !== NoteUpdateEvent.FEED) {
						// Currently, if the update is not content update, re-render all page.
						// TODO: change only required property (or add/remove the note)
						this.loadNotes();
						return;
					}

					this.lastModifiedTime = `${new Date().getTime()}`;
					this.msgStatus = new Date();

					const changedNote = this.notes.find((n) => n.id === messagePayload.noteId);
					if (!changedNote) {
						// There is a new note, so reload notes
						this.loadNotes();
					}
				});
			} catch (error) {
				this.channelStatus = channelStatus.workspaceFetchFailed;
				console.log(error);
			}
		},
		async loadNotes() {
			this.channelStatus = channelStatus.loading;

			try {
				this.notes = await noteManager.getOpenNotes();
				if (!this.notes?.length) {
					this.channelStatus = channelStatus.noNotes;
					this.$toast.add({
						severity: ToastSeverity.Warn,
						summary: channelStatus.noNotes.status,
						detail: "There isn't a single note in your workspace! Creating one right... now...",
						life: ToastDuration.Long,
					});
					const name = generateNewNoteName([]);
					const newNote = await noteManager.createNote({ name });
					this.$toast.add({
						severity: ToastSeverity.Success,
						summary: 'New note created',
						detail: 'Your very first note is ready for use',
						life: ToastDuration.Medium,
					});

					this.notes = [newNote];
				}

				this.lastModifiedTime = `${new Date().getTime()}`;
				this.channelStatus = channelStatus.open;
			} catch (error) {
				// If it's 401, the action already handled ny the API proxy
				if (error?.status === 401) {
					return;
				}
				this.channelStatus = channelStatus.workspaceFetchFailed;
				this.$toast.add({
					severity: ToastSeverity.Error,
					summary: channelStatus.workspaceFetchFailed.status,
					detail: 'Please check your connection and try again later',
					life: ToastDuration.Long,
				});
				console.log(error);
			}
		},
		onNoteChanged(/* e: INoteChangedEventArgs */): void {
			// noteManager.sendNoteUpdate(e); Test whether this is needed  now...
			this.msgStatus = new Date();
		},

		async onNewNote(newNote: INoteTab): Promise<void> {
			console.log(`[MainView.onNewNote] New note ${newNote.name} (${newNote.id}) created`);
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
	.initialization-loader-container {
		margin-top: 30vh;
	}
}

.p-cascadeselect-label {
	padding: 0.5rem 0.5rem !important;
}
</style>
