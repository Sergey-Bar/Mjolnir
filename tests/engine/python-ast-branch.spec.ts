import { describe, expect, it } from "vitest";
import type { Tree } from "web-tree-sitter";

import {
  pythonWithRaisesBlocks,
  getPythonTree,
} from "../../src/engine/python-ast.js";
import { parsePythonAst } from "../../src/engine/tree-sitter-ast.js";

describe("python-ast branch coverage (lines 79-92 — pythonWithRaisesBlocks internals)", () => {
  it("handles a with-statement without a raises call (no call match)", async () => {
    const text = `import pytest

def test_x():
    with open("file") as f:
        f.read()
`;
    const tree = (await parsePythonAst(text)) as Tree;
    try {
      const blocks = pythonWithRaisesBlocks(tree);
      expect(blocks).toEqual([]);
    } finally {
      tree.delete();
    }
  });

  it("handles a with-statement with a raises call but no block (edge case)", async () => {
    const text = `import pytest

def test_x():
    with pytest.raises(ValueError):
        pass
`;
    const tree = (await parsePythonAst(text)) as Tree;
    try {
      const blocks = pythonWithRaisesBlocks(tree);
      expect(blocks).toHaveLength(1);
      expect(blocks[0]?.exceptionText).toBe("ValueError");
      expect(blocks[0]?.broadException).toBe(false);
      expect(blocks[0]?.blockStatements).toBe(1);
      expect(blocks[0]?.hasMatch).toBe(false);
    } finally {
      tree.delete();
    }
  });

  it("detects broad exception types (Exception, BaseException, etc.)", async () => {
    const text = `import pytest

def test_x():
    with pytest.raises(Exception):
        do_thing()
`;
    const tree = (await parsePythonAst(text)) as Tree;
    try {
      const blocks = pythonWithRaisesBlocks(tree);
      expect(blocks).toHaveLength(1);
      expect(blocks[0]?.broadException).toBe(true);
      expect(blocks[0]?.exceptionText).toBe("Exception");
    } finally {
      tree.delete();
    }
  });

  it("detects match= keyword argument", async () => {
    const text = `import pytest

def test_x():
    with pytest.raises(ValueError, match="bad"):
        do_thing()
`;
    const tree = (await parsePythonAst(text)) as Tree;
    try {
      const blocks = pythonWithRaisesBlocks(tree);
      expect(blocks).toHaveLength(1);
      expect(blocks[0]?.hasMatch).toBe(true);
    } finally {
      tree.delete();
    }
  });

  it("handles multi-statement block", async () => {
    const text = `import pytest

def test_x():
    with pytest.raises(ValueError):
        prepare()
        do_thing()
`;
    const tree = (await parsePythonAst(text)) as Tree;
    try {
      const blocks = pythonWithRaisesBlocks(tree);
      expect(blocks).toHaveLength(1);
      expect(blocks[0]?.blockStatements).toBe(2);
    } finally {
      tree.delete();
    }
  });

  it("handles missing arguments to raises (no args → empty exceptionText)", async () => {
    // This is unusual but exercises the firstArg === undefined path
    const text = `import pytest

def test_x():
    with pytest.raises():
        pass
`;
    const tree = (await parsePythonAst(text)) as Tree;
    try {
      const blocks = pythonWithRaisesBlocks(tree);
      expect(blocks).toHaveLength(1);
      expect(blocks[0]?.exceptionText).toBe("");
      expect(blocks[0]?.broadException).toBe(false);
    } finally {
      tree.delete();
    }
  });

  it("handles BaseExceptionGroup broad type", async () => {
    const text = `import pytest

def test_x():
    with pytest.raises(BaseExceptionGroup):
        pass
`;
    const tree = (await parsePythonAst(text)) as Tree;
    try {
      const blocks = pythonWithRaisesBlocks(tree);
      expect(blocks).toHaveLength(1);
      expect(blocks[0]?.broadException).toBe(true);
    } finally {
      tree.delete();
    }
  });

  it("handles ExceptionGroup broad type", async () => {
    const text = `import pytest

def test_x():
    with pytest.raises(ExceptionGroup):
        pass
`;
    const tree = (await parsePythonAst(text)) as Tree;
    try {
      const blocks = pythonWithRaisesBlocks(tree);
      expect(blocks).toHaveLength(1);
      expect(blocks[0]?.broadException).toBe(true);
    } finally {
      tree.delete();
    }
  });

  it("getPythonTree returns undefined for non-tree input", () => {
    expect(getPythonTree(undefined)).toBeUndefined();
    expect(getPythonTree(null)).toBeUndefined();
    expect(getPythonTree(42)).toBeUndefined();
  });
});
