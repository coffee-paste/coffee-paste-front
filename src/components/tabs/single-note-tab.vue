<template>
	<SetEncryption
		v-if="isDecryptionRequired"
		:passwordRequiredMessage="passwordRequiredMessage"
		@encryptionConfigured="onDecrypt"
		:passwordVersionCodeName="this.note.passwordVersionCodeName"
		:encryption="this.note.encryption"
	/>

	<Editor
		v-else
		:key="lastNoteUpdate"
		v-model="contentHTML"
		toolbar="full"
		@text-change="onChange"
		placeholder="Take a coffee and start pasting..."
		editorStyle="height: 77vh"
	>
		<template #toolbar>
			<span class="ql-formats">
				<select class="ql-font"></select>
				<select class="ql-size"></select>
			</span>
			<span class="ql-formats">
				<button class="ql-bold"></button>
				<button class="ql-italic"></button>
				<button class="ql-underline"></button>
				<button class="ql-strike"></button>
			</span>
			<span class="ql-formats">
				<select class="ql-color"></select>
				<select class="ql-background"></select>
			</span>
			<span class="ql-formats">
				<button class="ql-script" value="sub"></button>
				<button class="ql-script" value="super"></button>
			</span>
			<span class="ql-formats">
				<button class="ql-header" value="1"></button>
				<button class="ql-header" value="2"></button>
				<button class="ql-blockquote"></button>
				<button class="ql-code-block"></button>
			</span>
			<span class="ql-formats">
				<button class="ql-list" value="ordered"></button>
				<button class="ql-list" value="bullet"></button>
				<button class="ql-indent" value="-1"></button>
				<button class="ql-indent" value="+1"></button>
			</span>
			<span class="ql-formats">
				<button class="ql-direction" value="rtl"></button>
				<select class="ql-align"></select>
			</span>
			<span class="ql-formats">
				<button class="ql-link"></button>
				<button class="ql-image"></button>
				<button class="ql-video"></button>
				<!-- Formula doesn't work properly  -->
				<!-- <button class="ql-formula"></button> -->
			</span>
			<span class="ql-formats">
				<button class="ql-clean"></button>
			</span>
		</template>
	</Editor>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { INote } from '@/infrastructure/notes/note-interfaces';
import { PrimeIcons } from 'primevue/api';
import { Encryption } from '@/infrastructure/generated/api';
import { getCryptoCore } from '@/infrastructure/crypto/core/aes-gcm/crypto-core-aes-gcm';
import { ToastDuration, ToastSeverity } from '@/common-constants/prime-constants';
import { INoteChangedEventArgs } from './tab-interfaces';
import { SetEncryption } from '../encryption/set-encryption.vue';

const NoteTabComponent = defineComponent({
	components: { SetEncryption },
	emits: {
		noteChanged: (e: INoteChangedEventArgs) => !!e.noteId,
	},

	props: {
		note: {
			type: Object as () => INote,
			required: true,
		},
	},

	mounted() {
		this.note.updated.attach((sender) => {
			// Not the prettiest. This overcomes the fact that the underlying 'NoteWrapper' component is not a Vue one
			// and ensures the view is truly 2-way-bound to the view-model
			this.lastNoteInternalUpdate = `${new Date().getTime()}`;
			this.contentHTML = sender.contentHTML;
		});
	},

	data() {
		return {
			lastNoteInternalUpdate: `${new Date().getTime()}`,
			contentHTML: this.note.contentHTML,
			isDecryptionRequiredIcon: PrimeIcons.LOCK,
			decryptionPassword: '',
			noteManuallyDecrypted: false,
		};
	},

	computed: {
		lastNoteUpdate(): string {
			return `${this.lastNoteInternalUpdate}:${this.note?.lastModifiedTime}`;
		},
		isDecryptionRequired(): boolean {
			return this.note.encryption !== Encryption.NONE && !this.noteManuallyDecrypted && !getCryptoCore(this.note.encryption).isReady;
		},
		isPasswordBasedDecryptionRequired(): boolean {
			return this.note.encryption === Encryption.PASSWORD;
		},
		passwordRequiredMessage(): string {
			return `This note has been encrypted with a ${this.note.encryption.toString().toLowerCase()}.`;
		},
		passwordCodeNameMessage(): string {
			return `Enter the password corresponding to the code-name '${this.note.passwordVersionCodeName}':`;
		},
		passwordDecryptButtonDisabled(): boolean {
			return this.decryptionPassword.length <= 0;
		},
	},

	methods: {
		onChange(e: { htmlValue: string; textValue: string }): void {
			this.note.setContents({ contentHTML: e.htmlValue, contentText: e.textValue });

			this.$emit('noteChanged', {
				noteId: this.note.id,
				contentHTML: e.htmlValue,
				contentText: e.textValue,
			});
		},
		async onDecrypt(): Promise<void> {
			const logPrefix: string = '[SingleNoteTab.onDecrypt]';
			console.log(`${logPrefix} Preparing decryption core for note '${this.note.name}' (${this.note.id})`);

			// Force a re-compute of `isDecryptionRequired` (thereby re-rendering the page) by updating `noteManuallyDecrypted`
			if (await this.note.initializeEncryption()) {
				this.noteManuallyDecrypted = true;
				this.$toast.add({
					severity: ToastSeverity.Info,
					summary: 'Decryption complete',
					life: ToastDuration.Short,
				});
			} else {
				this.$toast.add({
					severity: ToastSeverity.Warn,
					summary: 'Failed to decrypt',
					detail: `Failed to decrypt note '${this.note.name}'. Is your password correct?`,
					life: ToastDuration.Medium,
				});
			}
		},
	},
});

export const NoteTab = NoteTabComponent;
export default NoteTab;
</script>

<style lang="scss" scoped></style>
