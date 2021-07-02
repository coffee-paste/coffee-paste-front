/* eslint-disable import/export */
import { VNode } from 'vue';

export interface MenubarItem {
	label: string;
	icon?: string;
	command?: (e: { item: MenubarItem; e: unknown }) => void;
	items?: MenubarItem[];
}

interface TabViewExProps {
	activeIndex?: number;
}

export type TabViewEventArgs = { originalEvent: Event; index: number; item: T };
// eslint-disable-next-line @typescript-eslint/no-redeclare
export type TabViewEventArgs<T> = { originalEvent: Event; index: number; item: T };

declare class TabViewEx {
	$props: TabViewExProps;

	$emit(eventName: 'tab-change', e: TabViewEventArgs): this;
	$emit(eventName: 'tab-click', e: TabViewEventArgs): this;
	$emit(eventName: 'tab-header-context-menu', e: TabViewEventArgs): this;
	$slots: {
		'': VNode[];
	};
}

export default TabViewEx;
