import type { RouteRecordRaw } from "vue-router";
import HomePage from "./pages/HomePage.vue";
import BundlersPage from "./pages/BundlersPage.vue";
import RspackPage from "./pages/RspackPage.vue";
import RolldownPage from "./pages/RolldownPage.vue";

export const routes: RouteRecordRaw[] = [
  { path: "/", component: HomePage },
  {
    path: "/bundlers",
    component: BundlersPage,
    children: [
      { path: "rspack", component: RspackPage },
      { path: "rolldown", component: RolldownPage },
    ],
  },
  { path: "/:pathMatch(.*)*", redirect: "/" },
];
