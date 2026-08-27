# QA-PY-006 — Sample Findings for Classification

Total sampled: 19 (max 20 per rule)

Classify each finding as:

- **TP** (True Positive) — the finding is correct, this IS the anti-pattern
- **FP** (False Positive) — the finding is wrong, this is legitimate code
- **UNSURE** — cannot determine without more context

---

## 1. pytest-dev-pytest — doc/en/example/assertion/global_testmodule_config/test_hello_world.py:7

**Message:** Test `test_func` has an empty body (pass only).

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

## 2. pytest-dev-pytest — doc/en/example/customdirectory/tests/test_first.py:5

**Message:** Test `test_1` has an empty body (pass only).

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

## 3. pytest-dev-pytest — doc/en/example/customdirectory/tests/test_second.py:5

**Message:** Test `test_2` has an empty body (pass only).

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

## 4. pytest-dev-pytest — doc/en/example/customdirectory/tests/test_third.py:5

**Message:** Test `test_3` has an empty body (pass only).

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

## 5. pytest-dev-pytest — testing/code/test_source.py:43

**Message:** Test `test_method` has an empty body (pass only).

```
      38|     assert str(source).startswith("def test_source_str_function() -> None:")
      39|
      40|
      41| def test_source_from_method() -> None:
      42|     class TestClass:
>>>   43|         def test_method(self):
      44|             pass
      45|
      46|     source = Source(TestClass().test_method)
      47|     assert source.lines == ["def test_method(self):", "    pass"]
      48|
```

**verdict:**

---

## 6. pytest-dev-pytest — testing/example_scripts/collect/collect_init_tests/tests/test_foo.py:5

**Message:** Test `test_foo` has an empty body (pass only).

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

## 7. pytest-dev-pytest — testing/example_scripts/collect/package_init_given_as_arg/pkg/test_foo.py:5

**Message:** Test `test_foo` has an empty body (pass only).

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

## 8. pytest-dev-pytest — testing/example_scripts/config/collect_pytest_prefix/test_foo.py:5

**Message:** Test `test_foo` has an empty body (pass only).

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

## 9. pytest-dev-pytest — testing/example_scripts/customdirectory/tests/test_first.py:6

**Message:** Test `test_1` has an empty body (pass only).

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

## 10. pytest-dev-pytest — testing/example_scripts/customdirectory/tests/test_second.py:6

**Message:** Test `test_2` has an empty body (pass only).

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

## 11. pytest-dev-pytest — testing/example_scripts/customdirectory/tests/test_third.py:6

**Message:** Test `test_3` has an empty body (pass only).

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

## 12. pytest-dev-pytest — testing/example_scripts/fixtures/fill_fixtures/test_conftest_funcargs_only_available_in_subdir/sub1/test_in_sub1.py:5

**Message:** Test `test_1` has an empty body (pass only).

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

## 13. pytest-dev-pytest — testing/example_scripts/fixtures/fill_fixtures/test_conftest_funcargs_only_available_in_subdir/sub2/test_in_sub2.py:5

**Message:** Test `test_2` has an empty body (pass only).

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

## 14. pytest-dev-pytest — testing/example_scripts/fixtures/fill_fixtures/test_funcarg_basic.py:17

**Message:** Test `test_func` has an empty body (pass only).

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

## 15. pytest-dev-pytest — testing/example_scripts/fixtures/fill_fixtures/test_funcarg_lookupfails.py:12

**Message:** Test `test_func` has an empty body (pass only).

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

## 16. pytest-dev-pytest — testing/example_scripts/issue88_initial_file_multinodes/test_hello.py:5

**Message:** Test `test_hello` has an empty body (pass only).

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

## 17. pytest-dev-pytest — testing/example_scripts/marks/marks_considered_keywords/test_marks_as_keywords.py:8

**Message:** Test `test_mark` has an empty body (pass only).

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

## 18. pytest-dev-pytest — testing/example_scripts/perf_examples/collect_stats/template_test.py:5

**Message:** Test `test_x` has an empty body (pass only).

```
       1| # mypy: allow-untyped-defs
       2| from __future__ import annotations
       3|
       4|
>>>    5| def test_x():
       6|     pass
       7|
```

**verdict:**

---

## 19. pytest-dev-pytest — testing/example_scripts/unittest/test_parametrized_fixture_error_message.py:16

**Message:** Test `test_two` has an empty body (pass only).

```
      11|     return request.param
      12|
      13|
      14| @pytest.mark.usefixtures("two")
      15| class TestSomethingElse(unittest.TestCase):
>>>   16|     def test_two(self):
      17|         pass
      18|
```

**verdict:**

---
