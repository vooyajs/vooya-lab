/// <reference types="vite/client" />

declare module "*.rs" {
  const component: import("vue").Component;
  export default component;
}
