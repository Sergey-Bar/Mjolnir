import { h } from "vue";
import DefaultTheme from "vitepress/theme";
import type { Theme } from "vitepress";
import Home from "./Home.vue";
import SignalDivider from "./SignalDivider.vue";
import TrustLadder from "./TrustLadder.vue";
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
  // Through the Layout's slot, not the theme's `NotFound` key: the
  // default Layout draws its own 404 and never consults that key, so
  // this page had been replaced by the stock one on every missing URL.
  Layout: () =>
    h(DefaultTheme.Layout, null, { "not-found": () => h(NotFound) }),
  enhanceApp({ app }) {
    app.component("Home", Home);
    app.component("SignalDivider", SignalDivider);
    app.component("TrustLadder", TrustLadder);
    app.component("RuleCatalog", RuleCatalog);
    app.component("TerminalReport", TerminalReport);
    app.component("CatalogPreview", CatalogPreview);
    app.component("ForensicsSample", ForensicsSample);
    app.component("EvidenceBadge", EvidenceBadge);
    app.component("FalseGreenChain", FalseGreenChain);
    app.component("ScoreExplainer", ScoreExplainer);
  },
} satisfies Theme;
