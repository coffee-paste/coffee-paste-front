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
                :icon="profileButtonIcon"
                @click="onProfileButtonClick"
            />

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
import { IMenuItem } from "./menu-interfaces"
import { PrimeIcons } from "primevue/api";

/// <reference path="../../shims-vue.d.ts"/>
import { UniqueComponentId } from "primevue/utils";

const MainViewToolbarComponent = defineComponent({
    components: { Toolbar, Button, Menu },
    props: {
        profileImageB64: {
            type: String,
            required: false,
        },
    },
    data() {
        return {
            profileButtonIcon: this.profileImageB64
                ? `data:image/jpg;base64,${this.profileImageB64}`
                : PrimeIcons.USER_EDIT,

            profileMenuItems: [{
                label: 'Profile',
                 command: () => console.log("'Profile' click")
            }, {
                label: 'Logout',
                command: () => console.log("'Logout' click")
            }] as IMenuItem[]
        };
    },
    computed: {
        ariaId() {
            return UniqueComponentId();
        },
    },
    methods: {
        onProfileButtonClick(e: any /* Click event type は何？ */): void {
            (this.$refs.menu as Menu).toggle(e);
        }
    }
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