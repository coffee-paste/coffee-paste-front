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
		<Column header="Name"
			class="base-column"
			filterMatchMode="startsWith"
			:field="NAME"
			:ref="NAME"
			:sortable="true"
		>
			<template #filter="{filterModel,filterCallback}">
				<InputText
					type="text"
					v-model="filterModel.value"
					@keydown.enter="filterCallback()"
					class="p-column-filter"
					placeholder="Search by name" 
				/>
			</template>
		</Column>

		<Column header="Content"
			class="base-column"
			filterMatchMode="contains"
			:field="CONTENT_TEXT"
			:filterField="CONTENT_TEXT"
			:ref="CONTENT_TEXT"
			:sortable="true"
		>

			<template #filter="{filterModel,filterCallback}">
				<InputText
					type="text"
					v-model="filterModel.value"
					@keydown.enter="filterCallback()"
					class="p-column-filter"
					placeholder="Search by content" 
				/>
			</template>

			<template #body="slotProps">
				<div class="content-container-div">
				<div  class="content-container-div-inner">
					<template v-if="!!slotProps.data[CONTENT_TEXT]" >
						{{slotProps.data[CONTENT_TEXT]}}
					</template>
					<Button v-else: label="Fetch content" @click="onFetchContentClick(slotProps.data)" />
				</div>
				</div>
			</template>

		</Column>

		<Column header="Created"
			class="base-column"
			filterMatchMode="dateIs"
			:field="CREATION_TIME"
			:filterField="CREATION_TIME"
			:ref="CREATION_TIME"
			:sortable="true"
		>

			<template #filter="{filterModel,filterCallback}">
				<InputText 
					type="date" 
					v-model="filterModel.value"
					@keydown.enter="filterCallback()" 
					class="p-column-filter" 
					placeholder="Search by creation time" 
				/>
			</template>

			<template #body="slotProps">
				 {{formatDate(slotProps.data[CREATION_TIME])}}
			</template>

		</Column>

		<Column header="Modified"
			class="base-column"
			filterMatchMode="dateIs"
			:field="LAST_MODIFIED_TIME"
			:filterField="LAST_MODIFIED_TIME"
			:ref="LAST_MODIFIED_TIME"
			:sortable="true"
		>

			<template #filter="{filterModel,filterCallback}">
				<InputText 
					type="date" 
					v-model="filterModel.value"
					@keydown.enter="filterCallback()" 
					class="p-column-filter" 
					placeholder="Search by modification time" 
				/>
			</template>

			<template #body="slotProps">
				 {{formatDate(slotProps.data[LAST_MODIFIED_TIME])}}
			</template>

		</Column>

		<Column header="Actions"
			class="base-column"
			:sortable="false"
		>
			<template #body="slotProps">
				<span>
					<Button label="Restore" @click="onRestoreNoteClick(slotProps.data)" />
					<Button label="Delete" @click="onDeleteClick(slotProps.data)" />
				</span>
			</template>

		</Column>

	</DataTable>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { Note } from '@/infrastructure/generated/api';
import { ApiFacade } from '@/infrastructure/generated/proxies/api-proxies';
import { PageRequest } from '../../infrastructure/generated/api';
import { FilterMatchMode } from '../common/interfaces';
import { StandardDateFormatter } from '../../common-constants/date-formatters';

import OverlayPanel from 'primevue/overlaypanel';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';

//#region Constants
const NAME = 'name';
const ID = 'id';
const CONTENT_TEXT = 'contentText';
const CREATION_TIME = 'creationTime';
const LAST_MODIFIED_TIME = 'lastModifiedTime';
//#endregion Constants

const DEFAULT_NOTE_ORDER = { [CREATION_TIME]: PageRequest.OrderByEnum.DESC.toString() };


interface ITableLazyParams {
	originalEvent: Event;
	first: number;
	rows: number;
	sortField: string | null;
	sortOrder: string | null;
	multiSortMeta: any[];
	filters: { [key: string]: { value: string, matchMode: string } };
	filterMatchModes: { [key: string]: FilterMatchMode };
}


const notesArchive = defineComponent({
	components: { OverlayPanel, DataTable, Column, InputText, Button },
	props: {
		ref: String
	},
	data() {
		return {
			loading: false,
			visibleNotes: [] as Note[],
			totalNoteCount: 0 as number,
			pagingParams: {} as PageRequest,
			NAME: NAME,
			ID: ID,
			CONTENT_TEXT: CONTENT_TEXT,
			CREATION_TIME: CREATION_TIME,
			LAST_MODIFIED_TIME: LAST_MODIFIED_TIME,
			pageSize: 10,
			filters: {
				// Initial filter values for the component
				[NAME]: { value: '', matchMode: FilterMatchMode.STARTS_WITH },
				[ID]: { value: '', matchMode: FilterMatchMode.CONTAINS },
				[CONTENT_TEXT]: { value: '', matchMode: FilterMatchMode.CONTAINS },
				[CREATION_TIME]: { value: '', matchMode: FilterMatchMode.DATE_IS },
				[LAST_MODIFIED_TIME]: { value: '', matchMode: FilterMatchMode.DATE_IS },
			}
		}
	},

	mounted() {
		this.loading = true;

		this.pagingParams = {
			fromIndex: 0,
			pageSize: this.pageSize,
			orderBy: DEFAULT_NOTE_ORDER
		};

		this.loadLazyData();
	},

	 watch: {
        filters() {
            this.onFilter();
        }
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

		async loadLazyData() {
			this.loading = true;
			console.log(`Request: ${JSON.stringify(this.pagingParams)}`);
			// Needs optimization- no reason to fetch the same notes over and over- need to cache them UI side
			const result = await ApiFacade.NotesApi.getBacklogNotesPage(this.pagingParams as PageRequest);
			this.totalNoteCount = result.totalCount;
			this.visibleNotes = result.notes;
			this.loading = false;
		},

		onPage(event: ITableLazyParams) {
			this.pagingParams = this.tableEventToPageRequest(event);
			this.loadLazyData();
		},

		onSort(event: ITableLazyParams) {
			this.pagingParams = this.tableEventToPageRequest(event);
			this.loadLazyData();
		},

		onFilter() {
			this.loading = true;
			console.log(`Filters: ${JSON.stringify(this.filters)}`);
			this.loadLazyData();
		},

		onFetchContentClick(note: Note): void {
			console.warn(`[UN-IMPLEMENTED] [NotesArchive.onFetchContentClick] Should fetch content for note ${note.name} (${note.id})`);
			//this.visibleNotes[this.visibleNotes.indexOf(note)] = await ApiFacade.NotesApi.
		},

		onRestoreNoteClick(note: Note): void {

		},

		onDeleteClick(note: Note): void {

		},

		tableEventToPageRequest(event: ITableLazyParams): PageRequest {
			return {
				fromIndex: event.first,
				pageSize: this.pageSize,
				orderBy: event.sortField
					? { [event.sortField]: event.sortOrder || PageRequest.OrderByEnum.DESC.toString() }
					: DEFAULT_NOTE_ORDER
			};
		},

		formatDate(d: number): string {
			return StandardDateFormatter.format(d);
		}
	}
});

export const NotesArchive = notesArchive;
export default NotesArchive;

</script>

<style lang="scss" scoped>
	.content-container-div {
		width: 100%;
		.content-container-div-inner {
			align-self: center;
		}
	}
</style>