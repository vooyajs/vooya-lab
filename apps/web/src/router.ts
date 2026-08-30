import type { RouteRecordRaw } from "vue-router";
import HomePage from "./pages/HomePage.vue";
import BundlersPage from "./pages/BundlersPage.vue";
import RspackPage from "./pages/RspackPage.vue";
import RolldownPage from "./pages/RolldownPage.vue";
import { runnableCases } from "./cases/registry";

const generatedCaseRoutes: RouteRecordRaw[] = runnableCases.map((entry) => ({
  path: entry.route,
  component: () => entry.loadPage().then((module) => module.default),
  meta: { caseRoute: true },
}));

export const routes: RouteRecordRaw[] = [
  { path: "/", component: HomePage },
  ...generatedCaseRoutes,
  {
    path: "/bundlers",
    component: BundlersPage,
    children: [
      { path: "", redirect: "/bundlers/rspack" },
      { path: "rspack", component: RspackPage },
      { path: "rolldown", component: RolldownPage },
    ],
  },
  { path: "/experiments/browser-compiler", component: () => import("./pages/BrowserCompilerPage.vue") },
  { path: "/showcase/scatter-plot", redirect: "/cases/examples/scatter-plot" },
  { path: "/examples/scatter-plot", redirect: "/cases/examples/scatter-plot" },
  { path: "/:pathMatch(.*)*", redirect: "/" },
];
