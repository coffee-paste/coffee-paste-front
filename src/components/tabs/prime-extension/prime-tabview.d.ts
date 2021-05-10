import { VNode } from 'vue';

export interface MenubarItem {
    label: string;
    icon?: string;
    command?: (e: { item: MenubarItem, e: any }) => void;
    items?: MenubarItem[];
}

interface TabViewExProps {
    activeIndex?: number;
}

export type TabViewEventArgs = { originalEvent: Event, index: number };
export type TabViewEventArgs<T> = { originalEvent: Event, item: T };

declare class TabViewEx {
    $props: TabViewExProps;
    $emit(eventName: 'tab-change', e: TabViewEventArgs): this;
    $emit(eventName: 'tab-click', e: TabViewEventArgs): this;
    $emit(eventName: 'tab-header-context-menu', e: TabViewEventArgs): this;
    $slots: {
        '': VNode[];
    }
}

export default TabViewEx;
