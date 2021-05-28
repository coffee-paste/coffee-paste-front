<template>
	<div @mousedown="onMouseDown" @mouseup="onMouseUp">

		<div class="base-timer">
			<svg viewBox="0 0 42 42" class="doughnut">
				<g>
					<circle class="doughnut-hole" :cx="svgCx" :cy="svgCy" :r="svgRadius" fill="#FFF" />
					<circle class="doughnut-ring" :cx="svgCx" :cy="svgCy" :r="svgRadius" fill="transparent" stroke="#d2d3d4" stroke-width="3" />
					<circle
						class="doughnut-segment"
						fill="transparent"
						stroke="#ce4b99"
						stroke-width="3"
						stroke-dashoffset="0"
						:stroke-dasharray="relativeFill"
						:cx="svgCx"
						:cy="svgCy"
						:r="svgRadius"
					/>

					<image x="50%" y="50%" :xlink:href="require('primeicons/raw-svg/trash.svg')" height="200" width="200" />
				</g>
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
			default: 1000
		}
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

		doughnutColor() {
		
		}
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
