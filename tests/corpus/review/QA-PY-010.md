# QA-PY-010 — Sample Findings for Classification

Total sampled: 10 (max 20 per rule)

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

## 5. reflex-dev-reflex — tests/integration/test_event_actions.py:323

**Message:** Nondeterministic value from `time.time()` used without freezing.

```
     318|     btn_debounce = driver.find_element(By.ID, "btn-debounce")
     319|     assert btn_debounce
     320|
     321|     exp_events = 10
     322|     throttle_duration = exp_events * 0.2  # 200ms throttle
>>>  323|     throttle_start = time.time()
     324|     while time.time() - throttle_start < throttle_duration:
     325|         btn_throttle.click()
     326|         btn_debounce.click()
     327|
     328|     # Wait until the debounce event shows up
```

**verdict:**

---

## 6. reflex-dev-reflex — tests/integration/test_event_actions.py:324

**Message:** Nondeterministic value from `time.time()` used without freezing.

```
     319|     assert btn_debounce
     320|
     321|     exp_events = 10
     322|     throttle_duration = exp_events * 0.2  # 200ms throttle
     323|     throttle_start = time.time()
>>>  324|     while time.time() - throttle_start < throttle_duration:
     325|         btn_throttle.click()
     326|         btn_debounce.click()
     327|
     328|     # Wait until the debounce event shows up
     329|     def _debounce_received():
```

**verdict:**

---

## 7. reflex-dev-reflex — tests/integration/test_large_state.py:73

**Message:** Nondeterministic value from `time.time()` used without freezing.

```
      68|             assert large_state.app_instance is not None
      69|             button = AppHarness.poll_for_or_raise_timeout(
      70|                 lambda: driver.find_element(By.ID, "button")
      71|             )
      72|
>>>   73|             t = time.time()
      74|             while button.text != "0":
      75|                 time.sleep(0.1)
      76|                 if time.time() - t > 30.0:
      77|                     msg = "Timeout waiting for initial state"
      78|                     raise TimeoutError(msg)
```

**verdict:**

---

## 8. reflex-dev-reflex — tests/integration/test_large_state.py:76

**Message:** Nondeterministic value from `time.time()` used without freezing.

```
      71|             )
      72|
      73|             t = time.time()
      74|             while button.text != "0":
      75|                 time.sleep(0.1)
>>>   76|                 if time.time() - t > 30.0:
      77|                     msg = "Timeout waiting for initial state"
      78|                     raise TimeoutError(msg)
      79|
      80|             times_clicked = 0
      81|
```

**verdict:**

---

## 9. reflex-dev-reflex — tests/integration/test_large_state.py:83

**Message:** Nondeterministic value from `time.time()` used without freezing.

```
      78|                     raise TimeoutError(msg)
      79|
      80|             times_clicked = 0
      81|
      82|             def round_trip(clicks: int, timeout: float):
>>>   83|                 t = time.time()
      84|                 for _ in range(clicks):
      85|                     button.click()
      86|                 nonlocal times_clicked
      87|                 times_clicked += clicks
      88|                 while button.text != str(times_clicked):
```

**verdict:**

---

## 10. reflex-dev-reflex — tests/integration/test_large_state.py:90

**Message:** Nondeterministic value from `time.time()` used without freezing.

```
      85|                     button.click()
      86|                 nonlocal times_clicked
      87|                 times_clicked += clicks
      88|                 while button.text != str(times_clicked):
      89|                     time.sleep(0.005)
>>>   90|                     if time.time() - t > timeout:
      91|                         msg = "Timeout waiting for state update"
      92|                         raise TimeoutError(msg)
      93|
      94|             benchmark(round_trip, clicks=10, timeout=30.0)
      95|         finally:
```

**verdict:**

---
