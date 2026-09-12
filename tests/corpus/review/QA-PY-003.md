# QA-PY-003 — Sample Findings for Classification

Total sampled: 20 (max 20 per rule)

Classify each finding as:

- **TP** (True Positive) — the finding is correct, this IS the anti-pattern
- **FP** (False Positive) — the finding is wrong, this is legitimate code
- **UNSURE** — cannot determine without more context

---

## 1. pallets-click — tests/test_utils/test_echo.py:46

**Message:** Test `test_echo_no_streams` contains no assertions.

```
      41|     b = BytesIO()
      42|     click.echo(b"", b)
      43|     assert b.getvalue() == b"\n"
      44|
      45|
>>>   46| def test_echo_no_streams(monkeypatch, runner):
      47|     """echo should not fail when stdout and stderr are None with pythonw on Windows."""
      48|     with runner.isolation():
      49|         sys.stdout = None
      50|         sys.stderr = None
      51|         click.echo("test")
```

**verdict:**

---

## 2. pallets-click — tests/test_utils/test_open_file.py:67

**Message:** Test `test_open_file_ignore_invalid_utf8` contains no assertions.

```
      62|
      63|     with click.open_file(str(path), encoding="utf8", errors="ignore") as f:
      64|         assert f.errors == "ignore"
      65|
      66|
>>>   67| def test_open_file_ignore_invalid_utf8(tmp_path):
      68|     path = tmp_path / "test.txt"
      69|     path.write_bytes(b"\xe2\x28\xa1")
      70|
      71|     with click.open_file(str(path), encoding="utf8", errors="ignore") as f:
      72|         f.read()
```

**verdict:**

---

## 3. pallets-click — tests/test_utils/test_open_file.py:75

**Message:** Test `test_open_file_ignore_no_encoding` contains no assertions.

```
      70|
      71|     with click.open_file(str(path), encoding="utf8", errors="ignore") as f:
      72|         f.read()
      73|
      74|
>>>   75| def test_open_file_ignore_no_encoding(tmp_path):
      76|     path = tmp_path / "test.bin"
      77|     path.write_bytes(os.urandom(16))
      78|
      79|     with click.open_file(str(path), errors="ignore") as f:
      80|         f.read()
```

**verdict:**

---

## 4. pytest-dev-pytest — doc/en/example/assertion/global_testmodule_config/test_hello_world.py:7

**Message:** Test `test_func` contains no assertions.

```
       2|
       3|
       4| hello = "world"
       5|
       6|
>>>    7| def test_func():
       8|     pass
       9|
```

**verdict:**

---

## 5. pytest-dev-pytest — doc/en/example/customdirectory/tests/test_first.py:5

**Message:** Test `test_1` contains no assertions.

```
       1| # content of test_first.py
       2| from __future__ import annotations
       3|
       4|
>>>    5| def test_1():
       6|     pass
       7|
```

**verdict:**

---

## 6. pytest-dev-pytest — doc/en/example/customdirectory/tests/test_second.py:5

**Message:** Test `test_2` contains no assertions.

```
       1| # content of test_second.py
       2| from __future__ import annotations
       3|
       4|
>>>    5| def test_2():
       6|     pass
       7|
```

**verdict:**

---

## 7. pytest-dev-pytest — doc/en/example/customdirectory/tests/test_third.py:5

**Message:** Test `test_3` contains no assertions.

```
       1| # content of test_third.py
       2| from __future__ import annotations
       3|
       4|
>>>    5| def test_3():
       6|     pass
       7|
```

**verdict:**

---

## 8. pytest-dev-pytest — testing/code/test_excinfo.py:385

**Message:** Test `test_excinfo_no_sourcecode` contains no assertions.

```
     380|     with pytest.raises(ValueError) as excinfo:
     381|         h()
     382|     assert excinfo.errisinstance(ValueError)
     383|
     384|
>>>  385| def test_excinfo_no_sourcecode():
     386|     try:
     387|         exec("raise ValueError()")
     388|     except ValueError:
     389|         excinfo = _pytest._code.ExceptionInfo.from_current()
     390|     s = str(excinfo.traceback[-1])
```

**verdict:**

---

## 9. pytest-dev-pytest — testing/example_scripts/collect/collect_init_tests/tests/test_foo.py:5

**Message:** Test `test_foo` contains no assertions.

```
       1| # mypy: allow-untyped-defs
       2| from __future__ import annotations
       3|
       4|
>>>    5| def test_foo():
       6|     pass
       7|
```

**verdict:**

---

## 10. pytest-dev-pytest — testing/example_scripts/collect/package_init_given_as_arg/pkg/test_foo.py:5

**Message:** Test `test_foo` contains no assertions.

```
       1| # mypy: allow-untyped-defs
       2| from __future__ import annotations
       3|
       4|
>>>    5| def test_foo():
       6|     pass
       7|
```

**verdict:**

---

## 11. pytest-dev-pytest — testing/example_scripts/config/collect_pytest_prefix/test_foo.py:5

**Message:** Test `test_foo` contains no assertions.

```
       1| # mypy: allow-untyped-defs
       2| from __future__ import annotations
       3|
       4|
>>>    5| def test_foo():
       6|     pass
       7|
```

**verdict:**

---

## 12. pytest-dev-pytest — testing/example_scripts/customdirectory/tests/test_first.py:6

**Message:** Test `test_1` contains no assertions.

```
       1| # mypy: allow-untyped-defs
       2| # content of test_first.py
       3| from __future__ import annotations
       4|
       5|
>>>    6| def test_1():
       7|     pass
       8|
```

**verdict:**

---

## 13. pytest-dev-pytest — testing/example_scripts/customdirectory/tests/test_second.py:6

**Message:** Test `test_2` contains no assertions.

```
       1| # mypy: allow-untyped-defs
       2| # content of test_second.py
       3| from __future__ import annotations
       4|
       5|
>>>    6| def test_2():
       7|     pass
       8|
```

**verdict:**

---

## 14. pytest-dev-pytest — testing/example_scripts/customdirectory/tests/test_third.py:6

**Message:** Test `test_3` contains no assertions.

```
       1| # mypy: allow-untyped-defs
       2| # content of test_third.py
       3| from __future__ import annotations
       4|
       5|
>>>    6| def test_3():
       7|     pass
       8|
```

**verdict:**

---

## 15. pytest-dev-pytest — testing/example_scripts/fixtures/fill_fixtures/test_conftest_funcargs_only_available_in_subdir/sub1/test_in_sub1.py:5

**Message:** Test `test_1` contains no assertions.

```
       1| # mypy: allow-untyped-defs
       2| from __future__ import annotations
       3|
       4|
>>>    5| def test_1(arg1):
       6|     pass
       7|
```

**verdict:**

---

## 16. pytest-dev-pytest — testing/example_scripts/fixtures/fill_fixtures/test_conftest_funcargs_only_available_in_subdir/sub2/test_in_sub2.py:5

**Message:** Test `test_2` contains no assertions.

```
       1| # mypy: allow-untyped-defs
       2| from __future__ import annotations
       3|
       4|
>>>    5| def test_2(arg2):
       6|     pass
       7|
```

**verdict:**

---

## 17. pytest-dev-pytest — testing/example_scripts/fixtures/fill_fixtures/test_funcarg_basic.py:17

**Message:** Test `test_func` contains no assertions.

```
      12| @pytest.fixture
      13| def other(request):
      14|     return 42
      15|
      16|
>>>   17| def test_func(some, other):
      18|     pass
      19|
```

**verdict:**

---

## 18. pytest-dev-pytest — testing/example_scripts/fixtures/fill_fixtures/test_funcarg_lookupfails.py:12

**Message:** Test `test_func` contains no assertions.

```
       7| @pytest.fixture
       8| def xyzsomething(request):
       9|     return 42
      10|
      11|
>>>   12| def test_func(some):
      13|     pass
      14|
```

**verdict:**

---

## 19. pytest-dev-pytest — testing/example_scripts/issue88_initial_file_multinodes/test_hello.py:5

**Message:** Test `test_hello` contains no assertions.

```
       1| # mypy: allow-untyped-defs
       2| from __future__ import annotations
       3|
       4|
>>>    5| def test_hello():
       6|     pass
       7|
```

**verdict:**

---

## 20. pytest-dev-pytest — testing/example_scripts/marks/marks_considered_keywords/test_marks_as_keywords.py:8

**Message:** Test `test_mark` contains no assertions.

```
       3|
       4| import pytest
       5|
       6|
       7| @pytest.mark.foo
>>>    8| def test_mark():
       9|     pass
      10|
```

**verdict:**

---
