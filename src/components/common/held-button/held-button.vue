<template>
	<div @mousedown="onMouseDown" @mouseup="onMouseUp" @mouseout="onMouseUp">

		<div class="vectoric-button">
			<svg viewBox="0 0 42 42" class="doughnut">
				<circle class="doughnut-hole" :cx="svgCx" :cy="svgCy" :r="svgRadius" fill="#FFF" />
				<circle class="doughnut-ring" :cx="svgCx" :cy="svgCy" :r="svgRadius" fill="transparent" stroke="#D2D3D4" stroke-width="3" />
				<circle
					class="doughnut-segment"
					:stroke-dasharray="relativeFill"
					:cx="svgCx"
					:cy="svgCy"
					:r="svgRadius"
				/>
				<svg v-if="loadedIconToUse" x="50%" y="50%" class="icon-element">
					<image :xlink:href="loadedIconToUse" height="27" width="27" transform="translate(-13.5, -13.5)" />
				</svg>
				<circle class="doughnut-border" :cx="svgCx" :cy="svgCy" :r="svgRadius + 2.4" fill="transparent" stroke-width="2" />
			</svg>
		</div>
	</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

const PRESCISION_TICK_MS = 50;

const heldButton = defineComponent({

	emits: {
		click: (event: MouseEvent) => !!event
	},

	props: {
		holdDurationMs: {
			type: Number,
			default: 1500
		},
		loadedIconToUse: {
			type: String,
			default: undefined
		},
	},

	data() {
		return {
			timerHandle: 0,
			precisionTimerHandle: 0,
			timePassed: 0,
			loading: false,
			svgCy: 21,
			svgCx: 21,
			svgRadius: 15.91549430918954
		};
	},

	computed: {

		timeLeft(): number {
			return this.holdDurationMs - this.timePassed;
		},

		relativeFill(): string {
			const remainingPercentage = (this.timeLeft / this.holdDurationMs) * 100;
			const filledPercentage = 100 - remainingPercentage;
			return `${remainingPercentage} ${filledPercentage}`;
		},
	},

	methods: {

		onMouseDown(event: MouseEvent): void {
			this.timerHandle = setInterval(() => { this.onDurationElapsed(event) }, this.holdDurationMs);
			this.precisionTimerHandle = setInterval(this.onPresicionTick, PRESCISION_TICK_MS);
			this.loading = true;
		},

		onMouseUp(event: MouseEvent): void {
			this.stopTimers();
			this.loading = false;
		},

		onDurationElapsed(event: MouseEvent): void {
			this.$emit('click', event);
			this.stopTimers();
			this.loading = false;
		},

		onPresicionTick(): void {
			this.timePassed += PRESCISION_TICK_MS;
		},

		stopTimers(): void {
			clearInterval(this.timerHandle);
			clearInterval(this.precisionTimerHandle);
			this.timePassed = 0;
		}
	},

	unmounted(): void {
		this.stopTimers();
	},
});

export const HeldButton = heldButton;
export default HeldButton;

</script>

<style lang="scss" scoped>

.vectoric-button {

	.icon-element {
		overflow: auto;
	}

	.doughnut-segment {
		fill: transparent;
		stroke: var(--pink-400);
		stroke-width: 3;
		stroke-dashoffset: 0;
	}

	.doughnut-border {
		stroke: var(--blue-500);
	}
}

</style>
