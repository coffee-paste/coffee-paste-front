<template>
	<div>
		<slot/>
	</div>
</template>

<script>
export default {
    name: 'tabpanel',
    props: {
        header: null,
        disabled: Boolean,
        headerContextMenuBehavior: String,
		routeAllClicks: Boolean
    }
}
</script>
