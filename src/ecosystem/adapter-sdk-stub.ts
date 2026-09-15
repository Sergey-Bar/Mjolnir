/**
 * Adapter SDK Stub (ECO-002).
 *
 * CONDITIONAL GATE: This feature is gated on community adoption.
 * It ships when ≥2 community adapters are submitted for frameworks
 * not natively supported by Mjolnir. Until then, this is a placeholder
 * documenting the planned interface.
 *
 * The Adapter SDK will provide a stable public API for third-party
 * framework adapters, including:
 * - File discovery contract
 * - Test declaration extraction
 * - Parse mode negotiation (AST → regex fallback)
 */

export interface AdapterSDKGateStatus {
  readonly featureId: "ECO-002";
  readonly gate: "community-adoption";
  readonly threshold: 2;
  readonly description: string;
  readonly currentAdapters: number;
  readonly met: boolean;
}

export const ADAPTER_SDK_GATE: AdapterSDKGateStatus = {
  featureId: "ECO-002",
  gate: "community-adoption",
  threshold: 2,
  description:
    "Gated on ≥2 community adapters being submitted for unsupported frameworks.",
  currentAdapters: 0,
  met: false,
};

export interface AdapterSDKStub {
  /** Register a framework adapter. */
  registerAdapter(adapter: AdapterDefinition): void;
}

export interface AdapterDefinition {
  id: string;
  name: string;
  filePatterns: string[];
  discoverFiles(root: string): string[];
  extractTestDeclarations(
    filePath: string,
    fileText: string,
  ): TestDeclaration[];
}

export interface TestDeclaration {
  name: string;
  line: number;
  column: number;
  type: "test" | "describe" | "hook";
}
