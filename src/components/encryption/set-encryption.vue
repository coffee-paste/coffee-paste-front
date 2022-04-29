<template>
	<Card class="decryption-required-card">
		<template #header>
			<div :class="isDecryptionRequiredIcon" class="large-icon" />
		</template>
		<template #title>
			<div class="password-is-required-title">{{ passwordRequiredMessage ? 'ENCRYPTED NOTE' : 'SUBMIT ENCRYPTION' }}</div>
		</template>
		<template #content>
			<div class="content-container">
				<Divider />
				<div v-if="passwordRequiredMessage" class="content-line">{{ passwordRequiredMessage }}</div>
				<div v-if="isPasswordBasedDecryptionRequired">
					<div class="password-input">
						<span class="password-input-text">{{ passwordCodeNameMessage }}</span>
						<Password v-model="decryptionPassword" class="password-input-box-margins" :toggleMask="true" :feedback="false" />
						<Button
							:disabled="passwordDecryptButtonDisabled"
							:label="passwordRequiredMessage ? 'Decrypt' : 'Submit'"
							class="decrypt-button"
							@click="onDecrypt"
						/>
					</div>
				</div>
			</div>
		</template>
	</Card>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { PrimeIcons } from 'primevue/api';
import Password from 'primevue/password';
import { Encryption } from '@/infrastructure/generated/api';
import { ToastDuration, ToastSeverity } from '@/common-constants/prime-constants';
import { loadPassword } from '../../infrastructure/crypto/handlers/password-loader';

const SetEncryptionComponent = defineComponent({
	components: { Password },
	emits: {
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		encryptionConfigured: (e: MouseEvent) => true,
	},

	props: {
		passwordRequiredMessage: null,
		passwordVersionCodeName: null,
		encryption: null,
	},

	data() {
		return {
			isDecryptionRequiredIcon: PrimeIcons.LOCK,
			decryptionPassword: '',
		};
	},

	computed: {
		isPasswordBasedDecryptionRequired(): boolean {
			return this.$props.encryption === Encryption.PASSWORD;
		},
		passwordCodeNameMessage(): string {
			return `Enter the password corresponding to the code-name '${this.$props.passwordVersionCodeName}':`;
		},
		passwordDecryptButtonDisabled(): boolean {
			return this.decryptionPassword.length <= 0;
		},
	},

	methods: {
		onEncryptionConfigured(e: MouseEvent): void {
			this.$emit('encryptionConfigured', e);
		},
		async onDecrypt(e: MouseEvent): Promise<void> {
			const logPrefix: string = '[SetEncryptionComponent.onDecrypt]';
			console.log(`${logPrefix} Preparing decryption core for encryption method ${this.$props.encryption} code ${this.$props.passwordVersionCodeName} ...`);

			let succeeded = false;
			if (this.$props.encryption === Encryption.PASSWORD) {
				succeeded = await loadPassword(this.decryptionPassword);
			}

			if (!succeeded) {
				console.error(
					`${logPrefix} Failed to create/store a master key from a user-given password  encryption method ${this.$props.encryption} code ${this.$props.passwordVersionCodeName}`
				);
				this.$toast.add({
					severity: ToastSeverity.Warn,
					summary: 'Failed to prepare decryption module',
					detail: 'Please re-load the page and retry the operation',
					life: ToastDuration.Long,
				});
				return;
			}

			console.log(
				`${logPrefix} Successfully prepared a cryptography core for '${this.$props.encryption}' encryption, version '${this.$props.passwordVersionCodeName}'`
			);

			this.onEncryptionConfigured(e);
		},
	},
});

export const SetEncryption = SetEncryptionComponent;
export default SetEncryption;
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
