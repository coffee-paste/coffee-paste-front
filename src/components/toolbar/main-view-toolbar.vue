<template>
    <Toolbar class="main-toolbar-style">
        <template #left>
            <Button class="nav-button p-button p-component p-button-sm p-button-rounded p-button-outlined" label="Home" @click="$router.push('/')" />
            <Button class="nav-button p-button p-component p-button-sm p-button-rounded p-button-outlined" label="About" @click="$router.push('/about')" />
        </template>
        <template #right>
            <Button class="nav-button p-button-icon-only p-button-rounded p-button-info p-button-outlined p-mr-2" :icon="profileButtonIcon" />
        </template>
    </Toolbar>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import Toolbar from "primevue/toolbar";
import Button from "primevue/button";
import { PrimeIcons } from 'primevue/api';
const MainViewToolbarComponent = defineComponent({
    components: { Toolbar, Button },
    props: {
        profileImageB64: {
            type: String,
            required: false,
        },
    },
    data() {
        return {
            profileButtonIcon: this.profileImageB64 ? `data:image/jpg;base64,${this.profileImageB64}` : PrimeIcons.USER_EDIT,
        };
    },
});
export const MainViewToolbar = MainViewToolbarComponent;
export default MainViewToolbar;
</script>

<style lang="scss" scoped>
.main-toolbar-style {
    height: 65px;
    align-content: center;
    background-color: #24292E;
    margin-bottom: 15px;
}
.nav-button {
    margin-right: 10px;
    justify-content: center;
    color:#E3F2FD !important;
}
</style>