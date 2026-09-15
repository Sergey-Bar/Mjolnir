import { describe, expect, it } from "vitest";
import {
  registerMarker,
  getMarkersForFramework,
  getAllMarkers,
  getMarkerCount,
} from "../../../src/rules/families/marker-registry.js";

describe("marker-registry", () => {
  const initialCount = getMarkerCount();

  it("has built-in markers", () => {
    expect(initialCount).toBeGreaterThan(0);
  });

  it("getAllMarkers returns all markers", () => {
    expect(getAllMarkers()).toHaveLength(initialCount);
  });

  it.each([
    "jest",
    "vitest",
    "playwright",
    "cypress",
    "junit",
    "testng",
    "nunit",
    "xunit",
    "pytest",
  ])("%s has registered markers", (framework) => {
    const markers = getMarkersForFramework(framework);
    expect(markers.length).toBeGreaterThan(0);
    for (const m of markers) {
      expect(m.framework).toBe(framework);
      expect(m.marker).toBeTruthy();
      expect(m.pattern).toBeTruthy();
      expect(m.semantics).toMatch(
        /^(skip|focus|retry|parameterize|fixture|category)$/,
      );
    }
  });

  it("getMarkersForFramework returns empty for unknown framework", () => {
    expect(getMarkersForFramework("unknown")).toHaveLength(0);
  });

  describe("extensibility", () => {
    it("registerMarker adds a new marker", () => {
      const before = getMarkerCount();
      registerMarker({
        marker: "@CustomSkip",
        framework: "custom-framework",
        semantics: "skip",
        pattern: "@CustomSkip",
      });
      expect(getMarkerCount()).toBe(before + 1);
      const markers = getMarkersForFramework("custom-framework");
      expect(markers).toHaveLength(1);
      expect(markers[0]?.marker).toBe("@CustomSkip");
    });

    it("registerMarker throws on duplicate", () => {
      expect(() =>
        registerMarker({
          marker: "@CustomSkip",
          framework: "custom-framework",
          semantics: "skip",
          pattern: "@CustomSkip",
        }),
      ).toThrow("already registered");
    });

    it("all patterns in registry are valid regex", () => {
      for (const marker of getAllMarkers()) {
        expect(() => new RegExp(marker.pattern)).not.toThrow();
      }
    });
  });

  describe("semantics coverage", () => {
    it("has skip markers", () => {
      const skipMarkers = getAllMarkers().filter((m) => m.semantics === "skip");
      expect(skipMarkers.length).toBeGreaterThan(0);
    });

    it("has focus markers", () => {
      const focusMarkers = getAllMarkers().filter(
        (m) => m.semantics === "focus",
      );
      expect(focusMarkers.length).toBeGreaterThan(0);
    });

    it("has retry markers", () => {
      const retryMarkers = getAllMarkers().filter(
        (m) => m.semantics === "retry",
      );
      expect(retryMarkers.length).toBeGreaterThan(0);
    });

    it("has parameterize markers", () => {
      const paramMarkers = getAllMarkers().filter(
        (m) => m.semantics === "parameterize",
      );
      expect(paramMarkers.length).toBeGreaterThan(0);
    });

    it("has fixture markers", () => {
      const fixtureMarkers = getAllMarkers().filter(
        (m) => m.semantics === "fixture",
      );
      expect(fixtureMarkers.length).toBeGreaterThan(0);
    });

    it("has category markers", () => {
      const catMarkers = getAllMarkers().filter(
        (m) => m.semantics === "category",
      );
      expect(catMarkers.length).toBeGreaterThan(0);
    });
  });
});
