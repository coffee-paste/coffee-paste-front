<template>
	<div class="home">
		<!-- <img alt="Vue logo" src="../assets/logo.png" /> -->
		<MainView />
	</div>
</template>

<script lang="ts">
import { Options, Vue } from 'vue-class-component';
import MainView from '@/components/main-view.vue'; // @ is an alias to /src

@Options({
	components: {
		MainView,
	},
})
export default class Home extends Vue {}
</script>
