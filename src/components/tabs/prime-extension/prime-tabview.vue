<template>
	<div class="p-tabview p-component">
		<ul ref="nav" class="p-tabview-nav" role="tablist">
			<li
				role="presentation"
				v-for="(tab, i) of tabs"
				:key="getKey(tab, i)"
				:class="[{ 'p-highlight': d_activeIndex === i, 'p-disabled': isTabDisabled(tab) }]"
			>
				<a
					role="tab"
					class="p-tabview-nav-link"
					@click="onTabClick($event, i)"
					@keydown="onTabKeydown($event, i)"
					@contextmenu="onTabHeaderContextMenu($event, i)"
					:tabindex="isTabDisabled(tab) ? null : '0'"
					:aria-selected="d_activeIndex === i"
					v-ripple
				>
					<span class="p-tabview-title" v-if="tab.props && tab.props.header">{{ tab.props.header }}</span>
					<component :is="tab.children.header" v-if="tab.children && tab.children.header"></component>
				</a>
			</li>
			<li ref="inkbar" class="p-tabview-ink-bar"></li>
		</ul>
		<div class="p-tabview-panels">
			<div v-for="(tab, i) of tabs" :key="getKey(tab, i)" class="p-tabview-panel" role="tabpanel" v-show="d_activeIndex === i">
				<component :is="tab"></component>
			</div>
		</div>
	</div>
</template>

<script>
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { DomHandler } from 'primevue/utils';
import Ripple from 'primevue/ripple';

export default {
	emits: ['update:activeIndex', 'tab-change', 'tab-click', 'tab-header-context-menu'],
	props: {
		activeIndex: {
			type: Number,
			default: 0,
		},
	},
	data() {
		return {
			d_activeIndex: this.activeIndex,
		};
	},
	watch: {
		activeIndex(newValue) {
			this.d_activeIndex = newValue;
		},
	},
	updated() {
		this.updateInkBar();
	},
	mounted() {
		this.updateInkBar();
	},
	methods: {
		onTabClick(event, i) {
			const tab = this.tabs[i];
			if (!this.isTabDisabled(tab) && i !== this.d_activeIndex) {
				this.d_activeIndex = i;
				this.$emit('update:activeIndex', this.d_activeIndex);

				this.$emit('tab-change', {
					originalEvent: event,
					index: i,
				});
			}

			this.$emit('tab-click', {
				originalEvent: event,
				index: i,
			});

			// Due to the structure and padding, icon buttons, for instance have a very small click-registering area
			// Can use the 'routeAllClicks' prop to instruct the TabView component to route all clicks to the tab's click handler
			if (tab?.props?.routeAllClicks && tab.props.onClick) {
				tab.props.onClick(event);
			}
		},
		onTabKeydown(event, i) {
			if (event.which === 13) {
				this.onTabClick(event, i);
			}
		},
		onTabHeaderContextMenu(event, i) {
			// Options are: 'normal' | 'no-event' | 'stop-propagation' | 'stop-immediate-propagation'
			switch (this.tabs[i]?.props?.headerContextMenuBehavior) {
				case undefined:
				case 'normal':
					this.$emit('tab-header-context-menu', {
						originalEvent: event,
						index: i,
					});
					break;
				case 'stop-propagation':
					event.stopPropagation();
					break;
				case 'stop-immediate-propagation':
					event.stopImmediatePropagation();
					break;
				case 'kill-event':
					event.stopImmediatePropagation();
					event.preventDefault();
					break;
				default:
			}
		},
		updateInkBar() {
			const tabHeader = this.$refs.nav.children[this.d_activeIndex];
			this.$refs.inkbar.style.width = `${DomHandler.getWidth(tabHeader)}px`;
			this.$refs.inkbar.style.left = `${DomHandler.getOffset(tabHeader).left - DomHandler.getOffset(this.$refs.nav).left}px`;
		},
		getKey(tab, i) {
			return tab.props && tab.props.header ? tab.props.header : i;
		},
		isTabDisabled(tab) {
			return tab.props && tab.props.disabled;
		},
		isTabPanel(child) {
			return child.type.name === 'tabpanel';
		},
	},
	computed: {
		tabs() {
			const tabs = [];
			this.$slots.default().forEach((child) => {
				if (this.isTabPanel(child)) {
					tabs.push(child);
				} else if (child.children.length > 0) {
					child.children.forEach((nestedChild) => {
						if (this.isTabPanel(nestedChild)) {
							tabs.push(nestedChild);
						}
					});
				}
			});
			return tabs;
		},
	},
	directives: {
		ripple: Ripple,
	},
};
</script>

<style scoped>
.p-tabview-nav {
	display: flex;
	margin: 0;
	padding: 0;
	list-style-type: none;
	flex-wrap: wrap;
}

.p-tabview-nav-link {
	cursor: pointer;
	user-select: none;
	display: flex;
	align-items: center;
	position: relative;
	text-decoration: none;
	overflow: hidden;
}

.p-tabview-ink-bar {
	display: none;
	z-index: 1;
}

.p-tabview-nav-link:focus {
	z-index: 1;
}

.p-tabview-title {
	line-height: 1;
}
</style>
