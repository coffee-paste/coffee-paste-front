<template>
	<div @mousedown="onMouseDown" @mouseup="onMouseUp" @mouseout="onMouseUp">
		<div class="vectoric-button">
			<svg viewBox="0 0 42 42" class="doughnut">
				<circle class="doughnut-hole" :cx="svgCx" :cy="svgCy" :r="svgRadius" />
				<circle class="doughnut-ring" :cx="svgCx" :cy="svgCy" :r="svgRadius" :stroke="doughnutRingColor" />
				<circle class="doughnut-segment" :stroke="doughnutSegmentColor" :stroke-dasharray="relativeFill" :cx="svgCx" :cy="svgCy" :r="svgRadius" />

				<svg v-if="loadedIconToUse" x="50%" y="50%" class="icon-element">
					<image :xlink:href="loadedIconToUse" height="27" width="27" transform="translate(-13.5, -13.5)" />
				</svg>

				<circle class="doughnut-border" :stroke="doughnutBorderColor" :cx="svgCx" :cy="svgCy" :r="svgRadius + 2.4" />
			</svg>
		</div>
	</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

const PRESCISION_TICK_MS = 50;

let DEFAULT_STYLE: CSSStyleDeclaration;
let DEFAULT_REMAINING_PATH_COLOR: string;
let DEFAULT_COMPLETED_PATH_COLOR: string;
let DEFAULT_BORDER_COLOR: string;

const heldButton = defineComponent({
	emits: {
		click: (event: MouseEvent) => !!event,
	},

	beforeMount(): void {
		// Has do be done after hoisting, to get the applied styles
		DEFAULT_STYLE = getComputedStyle(document.body);
		DEFAULT_REMAINING_PATH_COLOR = DEFAULT_STYLE.getPropertyValue('--cyan-800');
		DEFAULT_COMPLETED_PATH_COLOR = DEFAULT_STYLE.getPropertyValue('--pink-500');
		DEFAULT_BORDER_COLOR = DEFAULT_STYLE.getPropertyValue('--blue-500');
	},

	props: {
		holdDurationMs: {
			type: Number,
			default: 1500,
		},
		loadedIconToUse: {
			type: String,
			default: undefined,
		},
		completedPathColor: {
			type: String,
			default: undefined, // '#D2D3D4'
		},
		remainingPathColor: {
			type: String,
			default: undefined,
		},
		borderColor: {
			type: String,
			default: undefined,
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
			svgRadius: 15.91549430918954,
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

		doughnutRingColor(): string {
			return this.completedPathColor || DEFAULT_COMPLETED_PATH_COLOR; // '#D2D3D4' is a decent default as well
		},

		doughnutSegmentColor(): string {
			return this.remainingPathColor || DEFAULT_REMAINING_PATH_COLOR;
		},

		doughnutBorderColor(): string {
			return this.borderColor || DEFAULT_BORDER_COLOR;
		},
	},

	methods: {
		onMouseDown(event: MouseEvent): void {
			this.timerHandle = setInterval(() => {
				this.onDurationElapsed(event);
			}, this.holdDurationMs);
			this.precisionTimerHandle = setInterval(this.onPresicionTick, PRESCISION_TICK_MS);
			this.loading = true;
		},

		// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
		},
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
	display: grid;

	.icon-element {
		overflow: auto;
	}

	.doughnut-hole {
		fill: var(--surface-0);
	}

	.doughnut-ring {
		fill: transparent;
		stroke-width: 3;
	}

	.doughnut-segment {
		fill: transparent;
		stroke-width: 3;
		stroke-dashoffset: 0;
	}

	.doughnut-border {
		fill: transparent;
		stroke-width: 2;
	}
}
</style>
