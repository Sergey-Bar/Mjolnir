# QA-PY-009 — Sample Findings for Classification

Total sampled: 4 (max 20 per rule)

Classify each finding as:

- **TP** (True Positive) — the finding is correct, this IS the anti-pattern
- **FP** (False Positive) — the finding is wrong, this is legitimate code
- **UNSURE** — cannot determine without more context

---

## 1. pytest-dev-pytest — testing/_py/test_local.py:80

**Message:** Commented-out test detected.

```
      75|     def test_common(self, path1):
      76|         other = path1.join("sampledir")
      77|         x = other.common(path1)
      78|         assert x == path1
      79|
>>>   80|     # def test_parents_nonexisting_file(self, path1):
      81|     #    newpath = path1 / 'dirnoexist' / 'nonexisting file'
      82|     #    par = list(newpath.parents())
      83|     #    assert par[:2] == [path1 / 'dirnoexist', path1]
      84|
      85|     def test_basename_checks(self, path1):
```

**verdict:**

---

## 2. pytest-dev-pytest — testing/_py/test_local.py:140

**Message:** Commented-out test detected.

```
     135|         assert path1.join("samplefile").check(fnmatch="s*e")
     136|         assert path1.join("samplefile").fnmatch("s*e")
     137|         assert not path1.join("samplefile").fnmatch("s*x")
     138|         assert not path1.join("samplefile").check(fnmatch="s*x")
     139|
>>>  140|     # def test_fnmatch_dir(self, path1):
     141|
     142|     #    pattern = path1.sep.join(['s*file'])
     143|     #    sfile = path1.join("samplefile")
     144|     #    assert sfile.check(fnmatch=pattern)
     145|
```

**verdict:**

---

## 3. pytest-dev-pytest — testing/_py/test_local.py:998

**Message:** Commented-out test detected.

```
     993|         with pytest.raises(EnvironmentError):
     994|             path1.join("qwoeqiwe").mtime()
     995|         with pytest.raises(EnvironmentError):
     996|             path1.join("qwoeqiwe").read()
     997|
>>>  998|     # def test_parentdirmatch(self):
     999|     #    local.parentdirmatch('std', startmodule=__name__)
    1000|     #
    1001|
    1002|
    1003| class TestImport:
```

**verdict:**

---

## 4. reflex-dev-reflex — tests/integration/test_lifespan.py:320

**Message:** Commented-out test detected.

```
     315|     assert lifespan_app.app_module.lifespan_context_global == 4
     316|     assert lifespan_app.app_module.raw_asyncio_task_global == 0
     317|
     318|
     319| # --- Do NOT add new test cases below this line. ---
>>>  320| # test_lifespan (above) kills the backend; any test defined after it will
     321| # find the harness in a stopped state and fail.
     322|
```

**verdict:**

---
