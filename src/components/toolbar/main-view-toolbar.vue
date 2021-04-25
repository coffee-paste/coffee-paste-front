<template>
    <Toolbar class="main-toolbar-style">
        <template #left>
            <Button
                class="nav-button p-button p-component p-button-sm p-button-rounded p-button-outlined"
                label="Home"
                @click="$router.push('/')"
            />
            <Button
                class="nav-button p-button p-component p-button-sm p-button-rounded p-button-outlined"
                label="About"
                @click="$router.push('/about')"
            />
        </template>

        <template #right>
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
import { defineComponent } from "vue";
import Toolbar from "primevue/toolbar";
import Button from "primevue/button";
import Menu from "primevue/menu";
import { IMenuItem } from "./menu-interfaces";
import { PrimeIcons } from "primevue/api";

/// <reference path="../../shims-vue.d.ts"/>
import { UniqueComponentId } from "primevue/utils";
import {
    getLocalStorageItem,
    LocalStorageKey,
    removeLocalStorageItem,
} from "@/infrafstructure/local-storage";
import {
    AuthenticationApi,
    User,
} from "@/infrafstructure/api-client";
import { credentialsManager } from "@/infrafstructure/session-management/credential-manager";
import { envFacade } from "@/infrafstructure/env-facade";

const MainViewToolbarComponent = defineComponent({
    components: { Toolbar, Button, Menu },
    props: {
        profileImageB64: {
            type: String,
            required: false,
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
            ] as IMenuItem[],
        };
    },
    computed: {
        ariaId() {
            return UniqueComponentId();
        },
    },
    methods: {
        async logout() {
            await new AuthenticationApi({
                apiKey: credentialsManager.getToken(),
            }).logout();
            if (envFacade.isDevMode) {
                credentialsManager.setToken('');
            }
            removeLocalStorageItem<User>(LocalStorageKey.Profile);
            // window.location.href = `/`;
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
    height: 65px;
    align-content: center;
    background-color: #24292e;
    margin-bottom: 15px;
}
.nav-button {
    margin-right: 10px;
    justify-content: center;
    color: #e3f2fd !important;
}
</style>