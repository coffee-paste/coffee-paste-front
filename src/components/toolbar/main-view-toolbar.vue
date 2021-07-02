<template>
	<Menubar :model="menubarItems" class="main-toolbar-style">
		<template #start>
			<!-- <div class="app-icon-container">
                <Avatar image="https://raw.githubusercontent.com/coffee-paste/coffee-paste-front/develop/src/assets/coffee-paste.png" class="p-mr-2 app-icon" size="large" shape="square" />
            </div> -->
		</template>
		<template #end>
			<div class="main-toolbar-end-container">
				<div :class="`status-indicator ${statusMessageStyle}`">
					<Avatar :icon="`pi ${statusIcon}`" class="p-mr-2" size="small" shape="circle" v-tooltip.bottom="statusMsg" />
				</div>
				<Button
					class="nav-button p-button-icon-only p-button-rounded p-button-info p-button-outlined p-mr-2 avatar-icon"
					:icon="avatarBase64 || defaultIcon"
					@click="onProfileButtonClick"
				>
					<img v-if="avatarBase64" alt="avatar" :src="avatarBase64" style="width: 40px" />
				</Button>
				<Menu :id="ariaId + '_overlay'" ref="menu" :model="profileMenuItems" :popup="true" />
			</div>
		</template>
	</Menubar>
	<!-- Off dismissable from outside, otherwaise, click on dropdown will close the modal -->
	<OverlayPanel ref="archiveOverlay" :baseZIndex="-100" :dismissable="false">
		<div>
			<NotesArchive />
		</div>
	</OverlayPanel>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';
import Button from 'primevue/button';
import Menu from 'primevue/menu';
import OverlayPanel from 'primevue/overlaypanel';
import { PrimeIcons } from 'primevue/api';

/// <reference path='../../shims-vue.d.ts'/>
import { UniqueComponentId } from 'primevue/utils';
import { getLocalStorageItem, LocalStorageKey, removeLocalStorageItem, setLocalStorageItem } from '@/infrastructure/local-storage';
import { AuthenticationApi, User } from '@/infrastructure/generated/api';
import { credentialsManager } from '@/infrastructure/session-management/credential-manager';
import { envFacade } from '@/infrastructure/env-facade';
import { themeGroups, ThemeItem } from '@/components/common/themes';
import { ContextMenuCommandEventArgs, IVueMenuItem } from '../common/interfaces/base-interfaces';
import { IStatus, StatusType } from './menu-interfaces';
import NotesArchive from '../notes-archive/notes-archive';
import { MenubarItem } from '../tabs/prime-extension/prime-tabview';

/** On theme selecte keep the selection in the local storage ans reload page */
function onThemeSelected(e: { item: ThemeItem }) {
	setLocalStorageItem<string>(LocalStorageKey.Theme, e.item.code, { itemType: 'string' });
	window.location.reload();
}

// Build Menubar menu item from the temes collection
const themeGroupsMenu: MenubarItem[] = [];
// For each group in the themes
for (const themeGroup of themeGroups) {
	// Create sub menu of the availalbe themes
	const themeMenuItems: MenubarItem[] = [];
	for (const theme of themeGroup.themes) {
		themeMenuItems.push({ ...theme, label: theme.name, command: onThemeSelected } as unknown as MenubarItem);
	}
	// Add them group with the sub-menu to the options
	themeGroupsMenu.push({
		label: themeGroup.name,
		items: themeMenuItems,
	});
}

const MainViewToolbarComponent = defineComponent({
	components: { Button, Menu, OverlayPanel, NotesArchive },
	props: {
		profileImageB64: {
			type: String,
			required: false,
		},
		status: {
			type: Object as PropType<IStatus>,
			required: false,
			default: { status: StatusType.Unknown, statusType: StatusType.Unknown },
		},
		msgStatus: {
			type: Date,
			required: false,
		},
	},
	created() {
		const profile = getLocalStorageItem<User>(LocalStorageKey.Profile, {
			itemType: 'object',
		});
		if (profile?.avatarBase64) {
			this.avatarBase64 = `data:image/jpg;base64,${profile?.avatarBase64 || ''}`;
		}
	},
	data() {
		return {
			selectedTheme: null as unknown as ThemeItem,
			themeGroups,
			defaultIcon: PrimeIcons.USER_EDIT,
			avatarBase64: '',
			profileMenuItems: [
				{
					label: 'Profile',
					command: () => console.log("'Profile' click"),
				},
				{
					label: 'Logout',
					command: this.logout,
				},
			] as IVueMenuItem[],
			menubarItems: [
				{
					label: 'Home',
					icon: PrimeIcons.HOME,
					command: () => {
						this.$router.push('/');
					},
				},
				{
					label: 'Theme',
					icon: PrimeIcons.TABLE,
					items: themeGroupsMenu,
				},
				{
					label: 'About',
					icon: PrimeIcons.INFO_CIRCLE,
					command: () => {
						this.$router.push('/about');
					},
				},
				{
					label: 'Archive',
					icon: PrimeIcons.FOLDER_OPEN,
					command: (event: ContextMenuCommandEventArgs) => {
						(this.$refs.archiveOverlay as OverlayPanel).toggle(event.originalEvent);
					},
				},
			],
		};
	},
	computed: {
		ariaId(): string {
			return UniqueComponentId();
		},
		statusMessageStyle(): string {
			switch (this.status.statusType) {
				case StatusType.Ok:
					return '--ok-status';
				case StatusType.Error:
					return '--error-status';
				default:
					return '--warning-status';
			}
		},
		statusIcon(): string {
			switch (this.status.statusType) {
				case StatusType.Ok:
					return PrimeIcons.CHECK_CIRCLE;
				case StatusType.Error:
					return PrimeIcons.EXCLAMATION_CIRCLE;
				case StatusType.Loading:
					return PrimeIcons.CLOUD_DOWNLOAD;
				case StatusType.Unknown:
				case StatusType.Warning:
				default:
					return PrimeIcons.EXCLAMATION_TRIANGLE;
			}
		},
		statusMsg(): string {
			if (!this.msgStatus || this.status.statusType !== StatusType.Ok) {
				return this.status?.status;
			}

			const lastMsg = `${this.msgStatus.getHours()}:${this.msgStatus.getMinutes()}:${this.msgStatus.getSeconds()}`;
			return `${this.status?.status}\n\nLast update ${lastMsg}`;
		},
	},
	methods: {
		// Once the 'CascadeSelect' clicked show the current theme as selected, before the first click just show the placeholder text
		initSelectedTheme() {
			this.selectedTheme = { code: getLocalStorageItem<string>(LocalStorageKey.Theme, { itemType: 'string' }) || '' } as ThemeItem;
		},
		selectTheme() {
			const theme = this.selectedTheme?.code;
			setLocalStorageItem<string>(LocalStorageKey.Theme, theme, { itemType: 'string' });
			window.location.reload();
		},
		async logout() {
			try {
				await new AuthenticationApi({
					apiKey: credentialsManager.getToken(),
				}).logout();
				if (envFacade.isDevMode) {
					credentialsManager.setToken('');
				}
				removeLocalStorageItem(LocalStorageKey.Profile);
				this.$toast.add({
					severity: 'info',
					summary: 'Logout successful',
					life: 3000,
				});
				this.$router.push('/');
			} catch (error) {
				this.$toast.add({
					severity: 'error',
					summary: 'Logout failed',
					detail: 'Please try again later',
					life: 6000,
				});
			}
		},

		onProfileButtonClick(e: MouseEvent): void {
			(this.$refs.menu as Menu).toggle(e);
		},

		onArchiveButtonClick(e: MouseEvent) {
			(this.$refs.archiveOverlayRef as OverlayPanel).toggle(e);
		},
	},
});
export const MainViewToolbar = MainViewToolbarComponent;
export default MainViewToolbar;
</script>

<style lang="scss" scoped>
.main-toolbar-style {
	background-color: var(--surface-b);
	margin-bottom: 15px;
	.app-icon-container {
		margin-right: 15px;
		.app-icon {
			background-color: var(--bluegray-200);
		}
	}

	.main-toolbar-end-container {
		display: flex;
		.status-indicator {
			margin-right: 5px;
			padding-right: 10px;
			margin-top: 5px;
			&.--ok-status {
				color: var(--primary-color-text);
			}
			&.--error-status {
				color: var(--pink-600);
			}
			&.--warning-status {
				color: var(--yellow-600);
			}
		}
	}

	.avatar-icon {
		height: 2.5rem !important;
		width: 2.5rem !important;
	}
}
</style>
