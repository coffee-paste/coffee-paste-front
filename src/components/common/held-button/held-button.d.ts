interface HeldButtonProps {
	/**
	 * The number of milliseconds the button needs to be held before a `click` event is raised
	 *
	 * @type {number}
	 * @memberof HeldButtonProps
	 */
	holdDurationMs?: number;

	/**
	 * A resolved and loaded icon to use
	 *
	 * @example require('primeicons/raw-svg/trash.svg')
	 *
	 * @type {string}
	 * @memberof HeldButtonProps
	 */
	loadedIconToUse?: string;

	/**
	 * The CSS color to use for the 'completed' portion of the button's progress indicator
	 *
	 * @type {string}
	 * @memberof HeldButtonProps
	 */
	completedPathColor?: string; // @types/color has types for CSS colors. Not including for now as it has quite a few dependencies

	/**
	 * The CSS color to use for the 'remaining' portion of the button's progress indicator
	 *
	 * @type {string}
	 * @memberof HeldButtonProps
	 */
	remainingPathColor?: string;

	/**
	 * The CSS color to use for the button's outer border
	 *
	 * @type {string}
	 * @memberof HeldButtonProps
	 */
	borderColor?: string;
}

declare class HeldButton {
	$props: HeldButtonProps;
	$emit(eventName: 'click', e: MouseEvent): this;
}

export default HeldButton;
