import DefaultTheme from "vitepress/theme";
import type { Theme } from "vitepress";
import Home from "./Home.vue";
import RuneDivider from "./RuneDivider.vue";
import RuleCatalog from "./RuleCatalog.vue";
import TerminalReport from "./TerminalReport.vue";
import CatalogPreview from "./CatalogPreview.vue";
import NotFound from "./NotFound.vue";
import "./styles/vars.css";
import "./styles/custom.css";

export default {
  extends: DefaultTheme,
  NotFound,
  enhanceApp({ app }) {
    app.component("Home", Home);
    app.component("RuneDivider", RuneDivider);
    app.component("RuleCatalog", RuleCatalog);
    app.component("TerminalReport", TerminalReport);
    app.component("CatalogPreview", CatalogPreview);
  },
} satisfies Theme;
