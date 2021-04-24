/* eslint-disable */
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

declare module 'primevue/utils' {
    export function UniqueComponentId(prefix: string = 'pv_id_'): string;
}

declare module "*.png" {
  const value: string;
  export default value;
}
