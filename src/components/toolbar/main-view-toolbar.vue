<template>
    <Toolbar class="main-toolbar-style">
        <template #left>
            <Button
                class="nav-button p-button-sm p-button p-component p-button-secondary p-button-text"
                label="Home"
                @click="$router.push('/')"
            />
            <Button
                class="nav-button p-button-sm p-button p-component p-button-secondary p-button-text"
                label="About"
                @click="$router.push('/about')"
            />
        </template>

        <template #right>
            <div class="status-indicator">
                <span class="--label"> Status: </span>
                <span :class="statusMessageStyle"> {{status.status}} </span>
            </div>

            <Button
                class="nav-button p-button-icon-only p-button-rounded p-button-info p-button-outlined p-mr-2"
                :icon="avatarBase64 || defaultIcon"
                @click="onProfileButtonClick"
            >
                <img
                    v-if="avatarBase64"
                    alt="avatar"
                    :src="avatarBase64"
                    style="width: 40px"
                />
            </Button>
            <Menu
                :id="ariaId + '_overlay'"
                ref="menu"
                :model="profileMenuItems"
                :popup="true"
            />
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
} from "@/infrafstructure/local-storage";
import { AuthenticationApi, User } from "@/infrafstructure/api-client";
import { credentialsManager } from "@/infrafstructure/session-management/credential-manager";
import { envFacade } from "@/infrafstructure/env-facade";

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
    },
    created() {
        const profile = getLocalStorageItem<User>(LocalStorageKey.Profile, {
            itemType: "object",
        });
        if (profile?.avatarBase64) {
            this.avatarBase64 = `data:image/jpg;base64,${
                profile?.avatarBase64 || ""
            }`;
        }
    },
    data() {
        return {
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
        }
    },
    methods: {
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
    background-color: #24292e;
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

.status-indicator {
    margin-right: 5px;
    padding-right: 10px;
    justify-content: center;
    .--label {
        color: #e3f2fd;
        margin-right: 5px;
    }
    .--ok-status {
        color: green;
    }
    .--error-status {
        color: red;
    }
    .--warning-status {
        color:yellow;
    }
}
</style>