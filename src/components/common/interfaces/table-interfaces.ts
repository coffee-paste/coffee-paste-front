import { PageRequestFilter } from "@/infrastructure/generated/api";

export type TableFilterValue = { value: string, matchMode: FilterMatchMode };

export type TableFilters = {
	[Property in keyof PageRequestFilter]: TableFilterValue
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

export interface ITableLazyParams {
	originalEvent: Event;
	first: number;
	rows: number;
	sortField: string | null;
	sortOrder: string | null;
	multiSortMeta: any[];
	filters: { [key: string]: { value: string, matchMode: string } };
	filterMatchModes: { [key: string]: FilterMatchMode };
}
