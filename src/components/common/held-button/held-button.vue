<template>
	<Button type="button" class="p-px-3" @mousedown="onMouseDown" @mouseup="onMouseUp">
		<div v-if="loading" class="base-timer">
			<svg class="base-timer__svg" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
				<g class="base-timer__circle">
					<circle class="base-timer__path-elapsed" cx="50" cy="50" r="45"></circle>
					<path :stroke-dasharray="circleDasharray" class="base-timer__path-remaining" :class="remainingPathColor" d="
						M 50, 50
						m -45, 0
						a 45,45 0 1,0 90,0
						a 45,45 0 1,0 -90,0
					" />
				</g>
			</svg>
		</div>
	</Button>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

const PRESCISION_TICK_MS = 50;

// A value we had to play with a bit to get right
const FULL_DASH_ARRAY = 283;
// When the timer should change from green to orange
const WARNING_THRESHOLD = 10;
// When the timer should change from orange to red
const ALERT_THRESHOLD = 5;// The actual colors to use at the info, warning and alert threshholds
const COLOR_CODES = {
	info: {
		color: "green"
	},
	warning: {
		color: "orange",
		threshold: WARNING_THRESHOLD
	},
	alert: {
		color: "red",
		threshold: ALERT_THRESHOLD
	}
};

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
			loading: false
		};
	},

	computed: {
		timeLeft(): number {
			return this.holdDurationMs - this.timePassed;
		},

		timeFraction(): number {
			const rawTimeFraction = this.timeLeft / this.holdDurationMs;
			return rawTimeFraction - (1 / this.holdDurationMs) * (1 - rawTimeFraction);
		},

		circleDasharray(): string {
			const res = `${(this.timeFraction * FULL_DASH_ARRAY).toFixed(0)} ${FULL_DASH_ARRAY}`;
			return res;
		},

		remainingPathColor() {
			const { alert, warning, info } = COLOR_CODES;
			if (this.timeLeft <= alert.threshold) {
				return alert.color;
			} else if (this.timeLeft <= warning.threshold) {
				return warning.color;
			} else {
				return info.color;
			}
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
