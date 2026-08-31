# QA-PY-012 — Sample Findings for Classification

Total sampled: 6 (max 20 per rule)

Classify each finding as:

- **TP** (True Positive) — the finding is correct, this IS the anti-pattern
- **FP** (False Positive) — the finding is wrong, this is legitimate code
- **UNSURE** — cannot determine without more context

---

## 1. pytest-dev-pytest — testing/_py/test_local.py:37

**Message:** Tautological assertion: `assert path1 == path1`.

```
      32|         p1 = path1.join("sampledir")
      33|         p2 = path1.join("sampledir")
      34|         assert p1 == p2
      35|
      36|     def test_new_identical(self, path1):
>>>   37|         assert path1 == path1.new()
      38|
      39|     def test_join(self, path1):
      40|         p = path1.join("sampledir")
      41|         strp = str(p)
      42|         assert strp.endswith("sampledir")
```

**verdict:**

---

## 2. pytest-dev-pytest — testing/_py/test_local.py:1260

**Message:** Tautological assertion: `assert t1 == t1`.

```
    1255|             assert path1.stat().mode == mode
    1256|
    1257|     def test_path_comparison_lowercase_mixed(self, path1):
    1258|         t1 = path1.join("a_path")
    1259|         t2 = path1.join("A_path")
>>> 1260|         assert t1 == t1
    1261|         assert t1 == t2
    1262|
    1263|     def test_relto_with_mixed_case(self, path1):
    1264|         t1 = path1.join("a_path", "fiLe")
    1265|         t2 = path1.join("A_path")
```

**verdict:**

---

## 3. pytest-dev-pytest — testing/code/test_code.py:20

**Message:** Tautological assertion: `assert code1 == code1`.

```
      15| import pytest
      16|
      17|
      18| def test_ne() -> None:
      19|     code1 = Code(compile('foo = "bar"', "", "exec"))
>>>   20|     assert code1 == code1
      21|     code2 = Code(compile('foo = "baz"', "", "exec"))
      22|     assert code2 != code1
      23|
      24|
      25| def test_code_gives_back_name_for_not_existing_file() -> None:
```

**verdict:**

---

## 4. pytest-dev-pytest — testing/test_assertrewrite.py:679

**Message:** Tautological assertion: `assert True`.

```
     674|
     675|         getmsg(f11, must_pass=True)
     676|
     677|     def test_short_circuit_evaluation(self) -> None:
     678|         def f1() -> None:  # pragma: no cover
>>>  679|             assert True or explode  # type: ignore[name-defined,unreachable] # noqa: F821,SIM222
     680|
     681|         getmsg(f1, must_pass=True)
     682|
     683|         def f2() -> None:
     684|             x = 1
```

**verdict:**

---

## 5. pytest-dev-pytest — testing/test_capture.py:987

**Message:** Tautological assertion: `assert cr == cr`.

```
     982|     out, err = cr
     983|     assert out == "out"
     984|     assert err == "err"
     985|     assert cr[0] == "out"
     986|     assert cr[1] == "err"
>>>  987|     assert cr == cr
     988|     assert cr == CaptureResult("out", "err")
     989|     assert cr != CaptureResult("wrong", "err")
     990|     assert cr == ("out", "err")
     991|     assert cr != ("out", "wrong")
     992|     assert hash(cr) == hash(CaptureResult("out", "err"))
```

**verdict:**

---

## 6. reflex-dev-reflex — tests/units/utils/test_telemetry_context.py:77

**Message:** Tautological assertion: `assert a == a`.

```
      72|     """
      73|     a = TelemetryContext()
      74|     b = TelemetryContext()
      75|     assert a != b
      76|     assert hash(a) != hash(b)
>>>   77|     assert a == a
      78|
      79|
      80| def test_nested_contexts_can_be_entered():
      81|     """Nested ``with`` blocks attach and detach without colliding."""
      82|     outer = TelemetryContext()
```

**verdict:**

---
