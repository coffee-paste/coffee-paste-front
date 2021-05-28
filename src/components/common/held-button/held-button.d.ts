interface HeldButtonProps {
	label?: string;
	icon?: string;
	iconPos?: string;
	badge?: string;
	badgeClass?: string;
	loading?: boolean;
	loadingIcon?: string;
	holdDurationMs?: number;
	loadedIconToUse?: string;
}

declare class HeldButton {
	$props: HeldButtonProps;
	$emit(eventName: 'click', e: MouseEvent): this;
}

export default HeldButton;
