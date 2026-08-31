import DefaultTheme from "vitepress/theme";
import type { Theme } from "vitepress";
import Home from "./Home.vue";
import RuneDivider from "./RuneDivider.vue";
import "./styles/vars.css";
import "./styles/custom.css";

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component("Home", Home);
    app.component("RuneDivider", RuneDivider);
  },
} satisfies Theme;
