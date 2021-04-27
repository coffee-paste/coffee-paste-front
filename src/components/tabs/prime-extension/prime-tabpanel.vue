<template>
    <slot></slot>
</template>

<script>
export default {
    name: 'tabpanel',
    props: {
        header: null,
        disabled: Boolean,
        headerContextMenuBehavior: String
    }
}
</script>