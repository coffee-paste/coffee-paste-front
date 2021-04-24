/* eslint-disable */
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

declare module 'primevue/utils' {
    export function UniqueComponentId(prefix: string = 'pv_id_'): string;
}
