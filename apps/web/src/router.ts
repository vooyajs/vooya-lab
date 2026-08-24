import type { RouteRecordRaw } from "vue-router";
import HomePage from "./pages/HomePage.vue";
import BundlersPage from "./pages/BundlersPage.vue";
import RspackPage from "./pages/RspackPage.vue";
import RolldownPage from "./pages/RolldownPage.vue";
import { ScatterPlotDemoPage } from "@lab-cases/examples/scatter-plot";

export const routes: RouteRecordRaw[] = [
  { path: "/", component: HomePage },
  { path: "/showcase/scatter-plot", component: ScatterPlotDemoPage },
  {
    path: "/bundlers",
    component: BundlersPage,
    children: [
      { path: "", redirect: "/bundlers/rspack" },
      { path: "rspack", component: RspackPage },
      { path: "rolldown", component: RolldownPage },
    ],
  },
  { path: "/examples/scatter-plot", redirect: "/showcase/scatter-plot" },
  { path: "/:pathMatch(.*)*", redirect: "/" },
];
