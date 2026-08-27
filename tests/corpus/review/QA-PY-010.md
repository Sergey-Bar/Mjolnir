# QA-PY-010 — Sample Findings for Classification

Total sampled: 4 (max 20 per rule)

Classify each finding as:

- **TP** (True Positive) — the finding is correct, this IS the anti-pattern
- **FP** (False Positive) — the finding is wrong, this is legitimate code
- **UNSURE** — cannot determine without more context

---

## 1. pallets-click — tests/test_termui.py:28

**Message:** Nondeterministic value from `time.time()` used without freezing.

```
      23| from click.exceptions import MissingParameter
      24|
      25|
      26| class FakeClock:
      27|     def __init__(self):
>>>   28|         self.now = time.time()
      29|
      30|     def advance_time(self, seconds=1):
      31|         self.now += seconds
      32|
      33|     def time(self):
```

**verdict:**

---

## 2. pytest-dev-pytest — testing/_py/test_local.py:742

**Message:** Nondeterministic value from `time.time()` used without freezing.

```
     737|
     738|         fd, name = tempfile.mkstemp()
     739|         os.close(fd)
     740|         try:
     741|             # Do not use _pytest.timing here, as we do not want time mocking to affect this test.
>>>  742|             mtime = int(time.time()) - 100
     743|             path = local(name)
     744|             assert path.mtime() != mtime
     745|             path.setmtime(mtime)
     746|             assert path.mtime() == mtime
     747|             path.setmtime()
```

**verdict:**

---

## 3. pytest-dev-pytest — testing/_py/test_local.py:1405

**Message:** Nondeterministic value from `time.time()` used without freezing.

```
    1400|     def test_atime(self, tmpdir):
    1401|         import time
    1402|
    1403|         path = tmpdir.ensure("samplefile")
    1404|         # Do not use _pytest.timing here, as we do not want time mocking to affect this test.
>>> 1405|         now = time.time()
    1406|         atime1 = path.atime()
    1407|         # we could wait here but timer resolution is very
    1408|         # system dependent
    1409|         path.read_binary()
    1410|         time.sleep(ATIME_RESOLUTION)
```

**verdict:**

---

## 4. pytest-dev-pytest — testing/_py/test_local.py:1413

**Message:** Nondeterministic value from `time.time()` used without freezing.

```
    1408|         # system dependent
    1409|         path.read_binary()
    1410|         time.sleep(ATIME_RESOLUTION)
    1411|         atime2 = path.atime()
    1412|         time.sleep(ATIME_RESOLUTION)
>>> 1413|         duration = time.time() - now
    1414|         assert (atime2 - atime1) <= duration
    1415|
    1416|     def test_commondir(self, path1):
    1417|         # XXX This is here in local until we find a way to implement this
    1418|         #     using the subversion command line api.
```

**verdict:**

---
