import DefaultTheme from "vitepress/theme";
import type { Theme } from "vitepress";
import Home from "./Home.vue";
import RuneDivider from "./RuneDivider.vue";
import RuleCatalog from "./RuleCatalog.vue";
import TerminalReport from "./TerminalReport.vue";
import CatalogPreview from "./CatalogPreview.vue";
import ForensicsSample from "./ForensicsSample.vue";
import EvidenceBadge from "./EvidenceBadge.vue";
import FalseGreenChain from "./FalseGreenChain.vue";
import ScoreExplainer from "./ScoreExplainer.vue";
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
    app.component("ForensicsSample", ForensicsSample);
    app.component("EvidenceBadge", EvidenceBadge);
    app.component("FalseGreenChain", FalseGreenChain);
    app.component("ScoreExplainer", ScoreExplainer);
  },
} satisfies Theme;
