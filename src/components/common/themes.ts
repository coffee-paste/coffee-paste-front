export interface ThemeItem {
	name: string;
	code: string;
}

export interface ThemeGroup {
	name: string;
	themes: ThemeItem[];
}

export const themeGroups: ThemeGroup[] = [
	{
		name: 'Material design',
		themes: [
			{
				name: 'Light indigo',
				code: 'md-light-indigo',
			},
			{
				name: 'Light deeppurple',
				code: 'md-light-deeppurple',
			},
			{
				name: 'Dark indigo',
				code: 'md-dark-indigo',
			},
			{
				name: 'Dark deeppurple',
				code: 'md-dark-deeppurple',
			},
		],
	},
	{
		name: 'Bootstrap',
		themes: [
			{
				name: 'Light blue',
				code: 'bootstrap4-light-blue',
			},
			{
				name: 'Light purple',
				code: 'bootstrap4-light-purple',
			},
			{
				name: 'Dark blue',
				code: 'bootstrap4-dark-blue',
			},
			{
				name: 'Dark purple',
				code: 'bootstrap4-dark-purple',
			},
		],
	},
	{
		name: 'MDC',
		themes: [
			{
				name: 'Light indigo',
				code: 'mdc-light-indigo',
			},
			{
				name: 'Light deeppurple',
				code: 'mdc-light-deeppurple',
			},
			{
				name: 'Dark indigo',
				code: 'mdc-dark-indigo',
			},
			{
				name: 'Dark deeppurple',
				code: 'mdc-dark-deeppurple',
			},
		],
	},
	{
		name: 'Fluent',
		themes: [
			{
				name: 'Light',
				code: 'fluent-light',
			},
		],
	},
	{
		name: 'Saga',
		themes: [
			{
				name: 'Blue',
				code: 'saga-blue',
			},
			{
				name: 'Green',
				code: 'saga-green',
			},
			{
				name: 'Orange',
				code: 'saga-orange',
			},
			{
				name: 'Purple',
				code: 'saga-purple',
			},
		],
	},
	{
		name: 'Vela',
		themes: [
			{
				name: 'Blue',
				code: 'vela-blue',
			},
			{
				name: 'Green',
				code: 'vela-green',
			},
			{
				name: 'Orange',
				code: 'vela-orange',
			},
		],
	},
	{
		name: 'Arya',
		themes: [
			{
				name: 'Blue',
				code: 'arya-blue',
			},
			{
				name: 'Green',
				code: 'arya-green',
			},
			{
				name: 'Orange',
				code: 'arya-orange',
			},
			{
				name: 'Purple',
				code: 'arya-purple',
			},
		],
	},
	{
		name: 'Nova',
		themes: [
			{
				name: 'Classic',
				code: 'nova',
			},
			{
				name: 'Alt',
				code: 'nova-alt',
			},
			{
				name: 'Accent',
				code: 'nova-accent',
			},
			{
				name: 'Vue',
				code: 'nova-vue',
			},
		],
	},
	{
		name: 'Luna',
		themes: [
			{
				name: 'Amber',
				code: 'luna-amber',
			},
			{
				name: 'Blue',
				code: 'luna-blue',
			},
			{
				name: 'Green',
				code: 'luna-green',
			},
		],
	},
	{
		name: 'Rhea',
		themes: [
			{
				name: 'Classic',
				code: 'rhea',
			},
		],
	},
];
