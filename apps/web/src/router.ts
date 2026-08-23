import type { RouteRecordRaw } from "vue-router";
import HomePage from "./pages/HomePage.vue";
import BundlersPage from "./pages/BundlersPage.vue";
import RspackPage from "./pages/RspackPage.vue";
import RolldownPage from "./pages/RolldownPage.vue";
import CatalogCasePage from "./pages/CatalogCasePage.vue";

export const routes: RouteRecordRaw[] = [
  { path: "/", component: HomePage },
  {
    path: "/bundlers",
    component: BundlersPage,
    children: [
      { path: "", redirect: "/bundlers/rspack" },
      { path: "rspack", component: RspackPage },
      { path: "rolldown", component: RolldownPage },
      { path: "rolldown-rs-plugin", component: CatalogCasePage },
    ],
  },
  {
    path: "/examples",
    component: BundlersPage,
    children: [
      { path: "", redirect: "/examples/scatter-plot" },
      { path: "scatter-plot", component: CatalogCasePage },
      { path: "data-grid-benchmark", component: CatalogCasePage },
      { path: "trace-waterfall", component: CatalogCasePage },
    ],
  },
  {
    path: "/graphics",
    component: BundlersPage,
    children: [
      { path: "", redirect: "/graphics/threejs-cpu" },
      { path: "threejs-cpu", component: CatalogCasePage },
    ],
  },
  { path: "/:pathMatch(.*)*", redirect: "/" },
];
