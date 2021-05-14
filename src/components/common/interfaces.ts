import { PrimeIcons } from "primevue/api"

// Manually typed from documentation at https?://www.primefaces.org/primevue/showcase/#/menumodel.
// Concrete type/interface/class not found in PrimeVue source

export type ContextMenuCommandEventArgs = { originalEvent: Event, item: IVueMenuItem };

export interface IVueMenuItem {

    /**
     * Text of the item
     *
     * @type {string}
     * @memberof IVueMenuItem
     */
    label?: string;

    /**
     * Icon of the item
     *
     * @type {keyof typeof PrimeIcons}
     * @memberof IVueMenuItem
     */
    icon?: keyof typeof PrimeIcons;

    /**
     * Path of the route
     *
     * @type {string}
     * @memberof IVueMenuItem
     */
    to?: string;

    /**
     * Callback to execute when item is clicked
     *
     * @type {Function}
     * @memberof IVueMenuItem
     */
    command?: Function;

    /**
     * External link to navigate when item is clicked
     *
     * @type {string}
     * @memberof IVueMenuItem
     */
    url?: string;

    /**
     * An array of children menuitems
     *
     * @type {IVueMenuItem[]}
     * @memberof IVueMenuItem
     */
    items?: IVueMenuItem[];

    /**
     * When set as true, disables the menuitem
     *
     * @type {boolean}
     * @memberof IVueMenuItem
     */
    disabled?: boolean;

    /**
     * A boolean or a function to return a boolean to specify if the item is visible
     *
     * @type {(boolean | ())}
     * @memberof IVueMenuItem
     */
    visible?: boolean | (() => boolean);

    /**
     * Specifies where to open the linked document
     *
     * @type {string}
     * @memberof IVueMenuItem
     */
    target?: string;

    /**
     * Defines the item as a separator
     *
     * @type {boolean}
     * @memberof IVueMenuItem
     */
    separator?: boolean;

    /**
     * Inline style of the menuitem
     *
     * @type {object}
     * @memberof IVueMenuItem
     */
    style?: object;

    /**
     * Style class of the menuitem
     *
     * @type {string}
     * @memberof IVueMenuItem
     */
	class?: string;
}

/**
 * Filter match mode for DataTable and possibly similar components
 * @description Defined as a const in /primvue/api/Api but causes compilation issues
 *
 * @export
 * @enum {number}
 */
export enum FilterMatchMode {
	STARTS_WITH = 'startsWith',
	CONTAINS = 'contains',
	NOT_CONTAINS = 'notContains',
	ENDS_WITH = 'endsWith',
	EQUALS = 'equals',
	NOT_EQUALS = 'notEquals',
	IN = 'in',
	LESS_THAN = 'lt',
	LESS_THAN_OR_EQUAL_TO = 'lte',
	GREATER_THAN = 'gt',
	GREATER_THAN_OR_EQUAL_TO = 'gte',
	BETWEEN = 'between',
	DATE_IS = 'dateIs',
	DATE_IS_NOT = 'dateIsNot',
	DATE_BEFORE = 'dateBefore',
	DATE_AFTER = 'dateAfter'
}