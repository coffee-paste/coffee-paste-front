<template>
	<DataTable
		:value="visibleNotes"
		:lazy="true"
		:paginator="true"
		:rows="pageSize"
		:loading="loading"
		:globalFilterFields="[NAME, ID, CONTENT_TEXT, CREATION_TIME, LAST_MODIFIED_TIME]"
		:totalRecords="totalNoteCount"
		v-model:filters="filters"
		ref="dt"
		filterDisplay="row"
		responsiveLayout="scroll"
		@page="onPage($event)"
		@sort="onSort($event)"
	>
		<Column header="Name" class="base-column" filterMatchMode="startsWith" :field="NAME" :ref="NAME" :sortable="true">
			<template #filter="{ filterModel, filterCallback }">
				<InputText
					type="text"
					v-model="filterModel.value"
					@keydown.enter="filterCallback()"
					class="p-column-filter filter-input --text-input"
					placeholder="Search by name"
				/>
			</template>
		</Column>

		<Column
			header="Content"
			class="base-column"
			filterMatchMode="contains"
			:field="CONTENT_TEXT"
			:filterField="CONTENT_TEXT"
			:ref="CONTENT_TEXT"
			:sortable="true"
		>
			<template #filter="{ filterModel, filterCallback }">
				<InputText
					type="text"
					v-model="filterModel.value"
					@keydown.enter="filterCallback()"
					class="p-column-filter filter-input --text-input"
					placeholder="Search by content"
				/>
			</template>

			<template #body="slotProps">
				<div class="content-container-div">
					<div class="content-container-div-inner">
						<template v-if="!!slotProps.data[CONTENT_TEXT]">
							{{ slotProps.data[CONTENT_TEXT] }}
						</template>
						<Button v-else: label="Fetch content" @click="onFetchContentClick(slotProps.data)" />
					</div>
				</div>
			</template>
		</Column>

		<Column
			header="Created"
			class="base-column"
			dataType="date"
			filterMatchMode="dateAfter"
			:field="CREATION_TIME"
			:filterField="CREATION_TIME"
			:ref="CREATION_TIME"
			:sortable="true"
		>
			<template #filter="{ filterModel, filterCallback }">
				<InputText
					type="date"
					v-model="filterModel.value"
					@keydown.enter="filterCallback()"
					class="p-column-filter filter-input --date-input"
					placeholder="Search by creation time"
				/>
			</template>

			<template #body="slotProps">
				{{ formatDate(slotProps.data[CREATION_TIME]) }}
			</template>
		</Column>

		<Column
			header="Modified"
			class="base-column"
			dataType="date"
			filterMatchMode="dateAfter"
			:field="LAST_MODIFIED_TIME"
			:filterField="LAST_MODIFIED_TIME"
			:ref="LAST_MODIFIED_TIME"
			:sortable="true"
		>
			<template #filter="{ filterModel, filterCallback }">
				<InputText
					type="date"
					v-model="filterModel.value"
					@keydown.enter="filterCallback()"
					class="p-column-filter filter-input --date-input"
					placeholder="Search by modification time"
				/>
			</template>

			<template #body="slotProps">
				{{ formatDate(slotProps.data[LAST_MODIFIED_TIME]) }}
			</template>
		</Column>

		<Column header="Actions" class="base-column" :sortable="false">
			<ConfirmPopup />
			<template #body="slotProps">
				<span class="actions-column">
					<Button label="Restore" :class="restoreButtonClass" icon="pi pi-refresh" @click="onRestoreNoteClick($event, slotProps.data)" />

					<HeldButton label="Delete" class="action-button --delete" :loadedIconToUse="deleteButtonIcon" @click="onDeleteClick($event, slotProps.data)" />
				</span>
			</template>
		</Column>
	</DataTable>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import {
	CollectionOperators,
	FetchPageOptions,
	FilterOptions,
	MatchOperators,
	Note,
	NoteStatus,
	PageRequestFilter,
	PageRequestOrderBy,
	RelationOperators,
} from '@/infrastructure/generated/api';
import { ApiFacade } from '@/infrastructure/generated/proxies/api-proxies';
import { ToastDuration, ToastSeverity, dateStringToDate } from '@/common-constants/prime-constants';
import { FilterMatchMode } from 'primevue/api';

import OverlayPanel from 'primevue/overlaypanel';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import InputText from 'primevue/inputtext';
import ConfirmPopup from 'primevue/confirmpopup';
import { StandardDateFormatter } from '../../common-constants/date-formatters';
import { ITableLazyParams, TableFilters, TableFilterValue } from '../common/interfaces/table-interfaces';
import { PageRequest } from '../../infrastructure/generated/api';
import HeldButton from '../common/held-button/held-button';

// #region Constants
const NAME = 'name';
const ID = 'id';
const CONTENT_TEXT = 'contentText';
const CREATION_TIME = 'creationTime';
const LAST_MODIFIED_TIME = 'lastModifiedTime';
// #endregion Constants

const MS_PER_DAY = 86400000;
const DEFAULT_NOTE_ORDER: PageRequestOrderBy = { creationTime: PageRequestOrderBy.CreationTimeEnum.DESC };

function isUndefinedOrNull(o: unknown): boolean {
	return o === undefined || o === null;
}

function isValidFilter(fieldName: string, currentFilter: TableFilterValue | undefined): boolean {
	if (!currentFilter) {
		console.warn(`[NotesArchive.isValidFilter] Filter field ${fieldName} doesn't exist in the filter list`);
		return false;
	}
	// Empty string is valid
	if (!currentFilter?.value) {
		console.debug(`[NotesArchive.isValidFilter] Filter field ${fieldName} doesn't have a value and will be ignored`);
		return false;
	}

	if (currentFilter.matchMode === FilterMatchMode.BETWEEN) {
		const values = currentFilter.value as unknown as string[];
		if (values?.length < 2 || isUndefinedOrNull(values[0]) || isUndefinedOrNull(values[1])) {
			return false;
		}
	}
	return true;
}

const notesArchive = defineComponent({
	components: { DataTable, Column, InputText, ConfirmPopup, HeldButton },
	props: {
		ref: String,
	},
	data() {
		return {
			loading: false,
			visibleNotes: [] as Note[],
			totalNoteCount: 0 as number,
			pagingParams: {} as PageRequest,
			NAME,
			ID,
			CONTENT_TEXT,
			CREATION_TIME,
			LAST_MODIFIED_TIME,
			pageSize: 10,
			filters: {
				// Initial filter values for the component
				[NAME]: { value: '', matchMode: FilterMatchMode.STARTS_WITH },
				[CONTENT_TEXT]: { value: '', matchMode: FilterMatchMode.CONTAINS },
				[CREATION_TIME]: { value: '', matchMode: FilterMatchMode.DATE_IS },
				[LAST_MODIFIED_TIME]: { value: '', matchMode: FilterMatchMode.DATE_IS },
			} as TableFilters,
			isRestoreInProgress: false,
			// eslint-disable-next-line global-require
			deleteButtonIcon: require('primeicons/raw-svg/trash.svg'),
		};
	},
	computed: {
		restoreButtonClass(): string {
			return `p-button-icon-only p-button-raised p-button-rounded p-button-info action-button${this.isRestoreInProgress ? ' --rotatation-animation' : ''}`;
		},
	},

	mounted() {
		this.loading = true;

		this.pagingParams = {
			fromIndex: 0,
			pageSize: this.pageSize,
			orderBy: DEFAULT_NOTE_ORDER,
		};

		this.fetchData();
	},

	watch: {
		filters() {
			this.onFilter();
		},
	},

	methods: {
		toggle(event: Event): void {
			(this.$refs.overlayComponent as OverlayPanel).toggle(event);
		},

		show(event: Event): void {
			(this.$refs.overlayComponent as OverlayPanel).show(event);
		},

		hide(): void {
			(this.$refs.overlayComponent as OverlayPanel).hide();
		},

		async fetchData() {
			try {
				this.loading = true;
				console.log(`[NotesArchive.fetchData] Sending request payload ${JSON.stringify(this.pagingParams)}`);
				// Needs optimization- no reason to fetch the same notes over and over- need to cache them UI side
				const result = await ApiFacade.NotesApi.getNotesPage(this.pagingParams as PageRequest, FetchPageOptions.Backlog);
				this.totalNoteCount = result.totalCount;
				this.visibleNotes = result.notes;
			} catch {
				this.$toast.add({
					severity: ToastSeverity.Error,
					summary: 'Failed to fetch notes from server',
					detail: `Failed to fetch notes from the server. Please try again in a bit`,
					life: ToastDuration.Long,
				});
			} finally {
				this.loading = false;
			}
		},

		onPage(event: ITableLazyParams) {
			this.pagingParams = this.tableEventToPageRequest(event);
			this.fetchData();
		},

		onSort(event: ITableLazyParams) {
			// Keep the filters beside, before reseting the paginig
			const { filter } = this.pagingParams;
			this.pagingParams = this.tableEventToPageRequest(event);
			// Set back the filters
			this.pagingParams.filter = filter;
			this.fetchData();
		},

		onFilter() {
			this.pagingParams.filter = {};
			// eslint-disable-next-line guard-for-in
			for (const fieldName in this.filters) {
				this.pagingParams.filter = { ...this.pagingParams.filter, ...this.constructFiterOptions(fieldName as keyof TableFilters) };
			}
			this.fetchData();
		},

		async onFetchContentClick(note: Note): Promise<void> {
			console.debug(`[NotesArchive.onFetchContentClick] Fetching content for note ${note.name} (${note.id})`);
			this.visibleNotes[this.visibleNotes.indexOf(note)] = await ApiFacade.NotesApi.getNote(note.id);
		},

		async onRestoreNoteClick(event: MouseEvent, note: Note): Promise<void> {
			try {
				this.isRestoreInProgress = true;
				await ApiFacade.NotesApi.setNoteStatus({ status: NoteStatus.WORKSPACE }, note.id);
				this.isRestoreInProgress = false;
				this.removeFromVisibleNotes(note.id);
			} catch {
				this.isRestoreInProgress = false;
			}
		},

		async onDeleteClick(event: MouseEvent, note: Note): Promise<void> {
			await ApiFacade.NotesApi.deleteNotes(note.id);
			this.$toast.add({
				severity: ToastSeverity.Info,
				summary: 'Note deleted',
				detail: `Note '${note.name}' has been deleted`,
				life: ToastDuration.Long,
			});
			this.removeFromVisibleNotes(note.id);
			console.log(`[NotesArchive.onDeleteClick] Note '${note.name}' (${note.id}) has been deleted`);
		},

		tableEventToPageRequest(event: ITableLazyParams): PageRequest {
			let orderBy: PageRequestOrderBy;
			const sortField = event.sortField as keyof PageRequestOrderBy;
			const orderEnum = event.sortOrder === 1 ? 'ASC' : 'DESC';

			switch (sortField) {
				case 'name':
					orderBy = { [sortField]: orderEnum as unknown as PageRequestOrderBy.NameEnum };
					break;
				case 'creationTime':
					orderBy = { [sortField]: orderEnum as unknown as PageRequestOrderBy.CreationTimeEnum };
					break;
				case 'lastModifiedTime':
					orderBy = { [sortField]: orderEnum as unknown as PageRequestOrderBy.LastModifiedTimeEnum };
					break;
				case 'contentText':
					orderBy = { [sortField]: orderEnum as unknown as PageRequestOrderBy.ContentTextEnum };
					break;
				default:
					orderBy = DEFAULT_NOTE_ORDER;
					break;
			}

			return {
				orderBy,
				fromIndex: event.first,
				pageSize: this.pageSize,
			};
		},

		formatDate(d: number): string {
			return StandardDateFormatter.format(d);
		},

		constructFiterOptions(fieldName: keyof TableFilters): Partial<PageRequestFilter> {
			const opts: FilterOptions = {};
			const currentFilter = this.filters[fieldName];

			// isValidFilter handles validation. Adding the second check to quiet down Vetur
			if (!isValidFilter(fieldName, currentFilter) || !currentFilter) {
				return {};
			}

			switch (currentFilter?.matchMode) {
				case FilterMatchMode.STARTS_WITH:
					opts.match = { matchOperator: MatchOperators.StartWith, value: currentFilter.value };
					break;
				case FilterMatchMode.CONTAINS:
					opts.match = { matchOperator: MatchOperators.Contains, value: currentFilter.value };
					break;
				case FilterMatchMode.NOT_CONTAINS:
					opts.match = { matchOperator: MatchOperators.NotContains, value: currentFilter.value };
					break;
				case FilterMatchMode.ENDS_WITH:
					opts.match = { matchOperator: MatchOperators.EndWith, value: currentFilter.value };
					break;
				case FilterMatchMode.EQUALS:
					opts.match = { matchOperator: MatchOperators.Equals, value: currentFilter.value };
					break;
				case FilterMatchMode.NOT_EQUALS:
					opts.match = { matchOperator: MatchOperators.NotEquals, value: currentFilter.value };
					break;
				case FilterMatchMode.IN:
					opts.collection = { collectionOperator: CollectionOperators.InCollection, values: currentFilter.value as unknown as string[] };
					break;
				case FilterMatchMode.LESS_THAN:
					opts.relation = { relationOperator: RelationOperators.Less, value: parseInt(currentFilter.value, 10) };
					break;
				case FilterMatchMode.LESS_THAN_OR_EQUAL_TO:
					opts.relation = { relationOperator: RelationOperators.LessOrEquals, value: parseInt(currentFilter.value, 10) };
					break;
				case FilterMatchMode.GREATER_THAN:
					opts.relation = { relationOperator: RelationOperators.Greater, value: parseInt(currentFilter.value, 10) };
					break;
				case FilterMatchMode.GREATER_THAN_OR_EQUAL_TO:
					opts.relation = { relationOperator: RelationOperators.GreaterOrEquals, value: parseInt(currentFilter.value, 10) };
					break;
				case FilterMatchMode.BETWEEN:
					// eslint-disable-next-line no-case-declarations
					const rangeValues = currentFilter.value as unknown as string[];
					opts.range = { from: parseInt(rangeValues[0], 10), to: parseInt(rangeValues[1], 10) };
					break;
				case FilterMatchMode.DATE_IS:
					// eslint-disable-next-line no-case-declarations
					const selectedIsDate = dateStringToDate(currentFilter.value);
					// eslint-disable-next-line no-case-declarations
					const endOfSelectedIsDay = new Date(selectedIsDate.getTime() + MS_PER_DAY);
					opts.range = { from: selectedIsDate.getTime(), to: endOfSelectedIsDay.getTime() };
					break;
				case FilterMatchMode.DATE_IS_NOT:
					// eslint-disable-next-line no-case-declarations
					const selectedDate = dateStringToDate(currentFilter.value);
					// eslint-disable-next-line no-case-declarations
					const endOfSelectedDay = new Date(selectedDate.getTime() + MS_PER_DAY);
					opts.outRange = { from: selectedDate.getTime(), to: endOfSelectedDay.getTime() };
					break;
				case FilterMatchMode.DATE_BEFORE:
					opts.relation = { relationOperator: RelationOperators.Less, value: dateStringToDate(currentFilter.value).getTime() };
					break;
				case FilterMatchMode.DATE_AFTER:
					opts.relation = { relationOperator: RelationOperators.Greater, value: dateStringToDate(currentFilter.value).getTime() };
					break;
				default:
					console.warn(`[NotesArchive.constructFiterOptions] Unknown filter match mode ${currentFilter.matchMode}`);
					break;
			}
			return { [fieldName]: opts };
		},

		removeFromVisibleNotes(noteId: string) {
			this.visibleNotes.splice(
				this.visibleNotes.findIndex((currNote) => currNote.id === noteId),
				1
			); // Remove the note from the archive
		},
	},
});

export const NotesArchive = notesArchive;
export default NotesArchive;
</script>

<style lang="scss" scoped>
.filter-input {
	padding: 0.5rem;
	&.--text-input {
		width: 175px;
	}
	&.--date-input {
		width: 175px;
	}
}
.content-container-div {
	width: 100%;
	max-width: 20rem;
	max-height: 16rem;
	overflow: auto;
	.content-container-div-inner {
		align-self: center;
		text-overflow: ellipsis;
		word-break: break-word;
	}
}

.actions-column {
	display: flex;
	align-items: center;

	.action-button {
		margin-right: 12px;

		&.--rotatation-animation {
			animation: rotation 1s infinite linear;
		}

		&.--delete {
			width: 3.44em;
		}
	}
}

@keyframes rotation {
	from {
		transform: rotate(0deg);
	}
	to {
		transform: rotate(359deg);
	}
}
</style>
