<template>
	<Card v-if="isDecryptionRequired" class="decryption-required-card">
		<template #header>
			<div :class="isDecryptionRequiredIcon" class="large-icon" />
		</template>
		<template #title>
			<div class="password-is-required-title">ENCRYPTED NOTE</div>
		</template>
		<template #content>
			<div class="content-container">
				<Divider />
				<div class="content-line">{{ passwordRequiredMessage }} To view it, please fill up the required decryption information</div>
				<div v-if="isPasswordBasedDecryptionRequired">
					<div class="password-input">
						<span class="password-input-text">{{ passwordCodeNameMessage }}</span>
						<Password v-model="decryptionPassword" class="password-input-box-margins" :toggleMask="true" :feedback="false" />
						<Button :disabled="passwordDecryptButtonDisabled" label="Decrypt" class="decrypt-button" @click="onDecrypt" />
					</div>
				</div>
			</div>
		</template>
	</Card>

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
import Password from 'primevue/password';
import { Encryption } from '@/infrastructure/generated/api';
import { getCryptoCore } from '@/infrastructure/crypto/core/aes-gcm/crypto-core-aes-gcm';
import { DEFAULT_AES_BLOCK_BITS } from '@/infrastructure/crypto/low-level/crypto-low-level-definitions';
import { ToastDuration, ToastSeverity } from '@/common-constants/prime-constants';
import { INoteChangedEventArgs } from './tab-interfaces';

const NoteTabComponent = defineComponent({
	components: { Password },
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

			// Replace with a fetch from store/server
			const kekB64 = 'suKNPDkzQpZV7z8QpsqzZRqRPtvlejqsRsx9cW6z2d8=';
			const saltB64 = 'NNNNPDkzQpZV7z8QpsqzZRqRPtvlejqsRsx9cW6z2d8=';

			// This needs to change to perform a transient decryption without overwriting the MK...
			// The way it is right now, every password attempt overwrite the MK which is really bad.
			// A temporary solution.
			const succeeded = await getCryptoCore(this.note.encryption).createAndStoreMasterKey(this.decryptionPassword, {
				kekB64,
				aesGcm: { saltB64, blockSize: DEFAULT_AES_BLOCK_BITS },
			});

			if (!succeeded) {
				console.error(`${logPrefix} Failed to create/store a master key from a user-given password`);
				this.$toast.add({
					severity: ToastSeverity.Warn,
					summary: 'Failed to prepare decryption module',
					detail: 'Please re-load the page and retry the operation',
					life: ToastDuration.Long,
				});
				return;
			}

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

<style lang="scss" scoped>
.decryption-required-card {
	width: 80vw;
	display: inline-block;
	font-size: 1rem;

	.password-is-required-title {
	}

	.p-divider-solid {
		border-top-style: solid;
		border-top-width: 0.15rem;
		margin-top: 0.25rem;
		margin-bottom: 2rem;
	}

	.large-icon {
		font-size: 5vh;
		margin-top: 3rem;
		margin-bottom: 0.5rem;
	}

	.content-container {
		width: 95%;
		display: inline-block;
		text-align: left;
		.content-line {
			&.--first {
				margin-top: 0rem;
			}

			margin-top: 0.5rem;
			margin-bottom: 0.5rem;
		}
	}

	.password-input {
		margin-top: 2em;

		.password-input-text {
			margin-right: 1.5rem;
		}

		.password-input-box-margins {
			margin-top: 1rem;
			margin-right: 0.8rem;
		}

		::v-deep(.p-password-input) {
			padding-top: 0.5em;
			padding-bottom: 0.5em;
			width: 100%;
		}

		.decrypt-button {
			margin-top: 0.5rem;
			height: 2.3rem;
		}
	}
}
</style>
