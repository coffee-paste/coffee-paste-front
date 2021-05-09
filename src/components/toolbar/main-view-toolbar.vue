<template>
    <Toolbar class="main-toolbar-style">
        <template #left>
            <Button class="nav-button p-button-sm p-button p-component p-button-secondary p-button-text" label="Home" @click="$router.push('/')" />
            <Button class="nav-button p-button-sm p-button p-component p-button-secondary p-button-text" label="About" @click="$router.push('/about')" />
        </template>

        <template #right>
            <div class="theme-selector">
                <CascadeSelect placeholder="Select theme" @click="initSelectedTheme" v-model="selectedTheme" :options="themeGroups" optionLabel="name" optionGroupLabel="name" @change="selectTheme" dataKey="code" :optionGroupChildren="['themes']" style="minWidth: 10rem" />
            </div>

            <div :class="`status-indicator ${statusMessageStyle}`">
                <Avatar :icon="`pi ${statusIcon}`" class="p-mr-2" size="small" shape="circle" v-tooltip.bottom="statusMsg" />
            </div>

            <Button class="nav-button p-button-icon-only p-button-rounded p-button-info p-button-outlined p-mr-2 avatar-icon" :icon="avatarBase64 || defaultIcon" @click="onProfileButtonClick">
                <img v-if="avatarBase64" alt="avatar" :src="avatarBase64" style="width: 40px" />
            </Button>
            <Menu :id="ariaId + '_overlay'" ref="menu" :model="profileMenuItems" :popup="true" />
        </template>
    </Toolbar>
</template>

<script lang="ts">
import { defineComponent, PropType } from "vue";
import Toolbar from "primevue/toolbar";
import Button from "primevue/button";
import Menu from "primevue/menu";
import { IStatus, StatusType } from "./menu-interfaces";
import { IVueMenuItem } from "../common/interfaces";
import { PrimeIcons } from "primevue/api";

/// <reference path="../../shims-vue.d.ts"/>
import { UniqueComponentId } from "primevue/utils";
import {
    getLocalStorageItem,
    LocalStorageKey,
    removeLocalStorageItem,
    setLocalStorageItem,
} from "@/infrastructure/local-storage";
import { AuthenticationApi, User } from "@/infrastructure/generated/api";
import { credentialsManager } from "@/infrastructure/session-management/credential-manager";
import { envFacade } from "@/infrastructure/env-facade";
import { themeGroups, ThemeItem } from "@/components/common/themes";



const MainViewToolbarComponent = defineComponent({
    components: { Toolbar, Button, Menu },
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
        }
    },
    created() {
        const profile = getLocalStorageItem<User>(LocalStorageKey.Profile, {
            itemType: "object",
        });
        if (profile?.avatarBase64) {
            this.avatarBase64 = `data:image/jpg;base64,${profile?.avatarBase64 || ""
                }`;
        }
    },
    data() {
        return {
            selectedTheme: null as unknown as ThemeItem,
            themeGroups,
            defaultIcon: PrimeIcons.USER_EDIT,
            avatarBase64: "",
            profileMenuItems: [
                {
                    label: "Profile",
                    command: () => console.log("'Profile' click"),
                },
                {
                    label: "Logout",
                    command: this.logout,
                },
            ] as IVueMenuItem[],
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
                    return 'pi-check-circle';
                case StatusType.Error:
                    return 'pi-exclamation-circle';
                case StatusType.Loading:
                    return 'pi-cloud-download';
                case StatusType.Unknown:
                case StatusType.Warning:
                default:
                    return 'pi-exclamation-triangle';
            }
        },
        statusMsg(): string {
            if (!this.msgStatus || this.status.statusType !== StatusType.Ok) {
                return this.status?.status;
            }

            const lastMsg = `${this.msgStatus.getHours()}:${this.msgStatus.getMinutes()}:${this.msgStatus.getSeconds()}`
            return `${this.status?.status}\n\nLast update ${lastMsg}`;
        }
    },
    methods: {
        // Once the 'CascadeSelect' clicked show the current theme as selected, before the first click just show the placeholder text
        initSelectedTheme() {
            this.selectedTheme = { code: getLocalStorageItem<string>(LocalStorageKey.Theme, { itemType: 'string' }) || '' } as ThemeItem;
        },
        selectTheme() {
            const theme = this.selectedTheme?.code;
            setLocalStorageItem<string>(LocalStorageKey.Theme, theme, { itemType: 'string' });
            location.reload();
        },
        async logout() {
            try {
                await new AuthenticationApi({
                    apiKey: credentialsManager.getToken(),
                }).logout();
                if (envFacade.isDevMode) {
                    credentialsManager.setToken("");
                }
                removeLocalStorageItem<User>(LocalStorageKey.Profile);
                this.$toast.add({
                    severity: "info",
                    summary: "Logout successful",
                    life: 3000,
                });
                this.$router.push("/");
            } catch (error) {
                this.$toast.add({
                    severity: "error",
                    summary: "Logout failed",
                    detail: "Please try again later",
                    life: 6000,
                });
            }
        },

        onProfileButtonClick(e: any /* Click event type は何？ */): void {
            (this.$refs.menu as Menu).toggle(e);
        },
    },
});
export const MainViewToolbar = MainViewToolbarComponent;
export default MainViewToolbar;
</script>

<style lang="scss" scoped>
.main-toolbar-style {
    height: 60px;
    align-content: center;
    background-color: var(--surface-600);
    margin-bottom: 25px;
    border: none;
    border-top-left-radius: 0px;
    border-top-right-radius: 0px;
}
.nav-button {
    margin-right: 10px;
    justify-content: center;
    color: #e3f2fd !important;
}
.avatar-icon {
    height: 2.5rem !important;
    width: 2.5rem !important;
}

.status-indicator {
    margin-right: 5px;
    padding-right: 10px;
    justify-content: center;
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
.theme-selector {
    margin-right: 20px;
}
</style>
