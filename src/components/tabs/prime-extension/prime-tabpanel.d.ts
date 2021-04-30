import { VNode } from 'vue';

export interface TabPanelProps {
    header?: any;
    disabled?: boolean;

    /**
     * 'normal' - Allow the parent TabView to decide behavior
     * 'no-event' - Do not raise a direct 'contextmenu' event from this tab's header
     * 'stop-propagation' - Do not raise a direct 'contextmenu' event from this tab's header and stop the event's propagation to the TabView
     * 'stop-immediate-propagation' - Do not raise a direct 'contextmenu' event from this tab's header and stop the event's propagation to any other handlers
     * 'kill-event' - Do not raise any event and suppress all event bubbling as well as the normal browser event
     *
     * @type {('normal' | 'no-event' | 'stop-propagation' | 'stop-immediate-propagation' | 'kill-event')}
     * @memberof TabPanelProps
     */
    headerContextMenuBehavior?: 'normal' | 'no-event' | 'stop-propagation' | 'stop-immediate-propagation' | 'kill-event';
}

declare class TabPanel {
    $props: TabPanelProps;
    $slots: {
        '': VNode[];
    }
}

export default TabPanel;