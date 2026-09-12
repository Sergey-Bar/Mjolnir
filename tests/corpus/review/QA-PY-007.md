# QA-PY-007 — Sample Findings for Classification

Total sampled: 12 (max 20 per rule)

Classify each finding as:

- **TP** (True Positive) — the finding is correct, this IS the anti-pattern
- **FP** (False Positive) — the finding is wrong, this is legitimate code
- **UNSURE** — cannot determine without more context

---

## 1. pallets-click — tests/test_context.py:655

**Message:** `pytest.raises` without a `match=` pattern over 3 block statements.

```
     650|         raise TestException()
     651|
     652|     assert rv_nested == [base_val_nested + 1]
     653|     assert rv == [base_val + 1]
     654|
>>>  655|     with pytest.raises(TestException):
     656|         rv = ctx.with_resource(TestContext(base_val=base_val, handle_exception=False))
     657|         rv_nested = ctx.with_resource(
     658|             TestContext(base_val=base_val_nested, handle_exception=False)
     659|         )
     660|         raise TestException()
```

**verdict:**

---

## 2. pytest-dev-pytest — testing/test_capture.py:1116

**Message:** `pytest.raises` without a `match=` pattern over 22 block statements.

```
    1111|             sys.stdout.write(" yes\n")
    1112|             s = cap.snap()
    1113|             assert s == "but now yes\n"
    1114|             cap.suspend()
    1115|             cap.done()
>>> 1116|             with pytest.raises(AssertionError):
    1117|                 cap.suspend()
    1118|
    1119|             assert repr(cap) == (
    1120|                 f"<FDCapture 1 oldfd={cap.targetfd_save} _state='done' tmpfile={cap.tmpfile!r}>"
    1121|             )
```

**verdict:**

---

## 3. pytest-dev-pytest — testing/test_capture.py:1377

**Message:** `pytest.raises` without a `match=` pattern over 11 block statements.

```
    1372|             os.write(1, b" suspended")
    1373|             cap.resume()
    1374|             os.write(1, b" resumed")
    1375|             assert cap.snap() == b"started resumed"
    1376|             cap.done()
>>> 1377|             with pytest.raises(OSError):
    1378|                 os.write(1, b"done")
    1379|
    1380|     def test_fdcapture_invalid_fd_without_fd_reuse(self, pytester: Pytester) -> None:
    1381|         with saved_fd(1), saved_fd(2):
    1382|             os.close(1)
```

**verdict:**

---

## 4. pytest-dev-pytest — testing/test_capture.py:1393

**Message:** `pytest.raises` without a `match=` pattern over 12 block statements.

```
    1388|             os.write(2, b" suspended")
    1389|             cap.resume()
    1390|             os.write(2, b" resumed")
    1391|             assert cap.snap() == b"started resumed"
    1392|             cap.done()
>>> 1393|             with pytest.raises(OSError):
    1394|                 os.write(2, b"done")
    1395|
    1396|
    1397| def test_capture_not_started_but_reset() -> None:
    1398|     capsys = StdCapture()
```

**verdict:**

---

## 5. pytest-dev-pytest — testing/test_compat.py:97

**Message:** `pytest.raises` without a `match=` pattern on a broad exception type.

```
      92|         pytest.fail("fail should be caught")
      93|
      94|
      95| def test_helper_failures() -> None:
      96|     helper = ErrorsHelper()
>>>   97|     with pytest.raises(Exception):  # noqa: B017
      98|         _ = helper.raise_exception
      99|     with pytest.raises(OutcomeException):
     100|         _ = helper.raise_fail_outcome
     101|
     102|
```

**verdict:**

---

## 6. pytest-dev-pytest — testing/test_compat.py:107

**Message:** `pytest.raises` without a `match=` pattern on a broad exception type.

```
     102|
     103| def test_safe_getattr() -> None:
     104|     helper = ErrorsHelper()
     105|     assert safe_getattr(helper, "raise_exception", "default") == "default"
     106|     assert safe_getattr(helper, "raise_fail_outcome", "default") == "default"
>>>  107|     with pytest.raises(BaseException):  # noqa: B017
     108|         assert safe_getattr(helper, "raise_baseexception", "default")
     109|
     110|
     111| def test_safe_isclass() -> None:
     112|     assert safe_isclass(type) is True
```

**verdict:**

---

## 7. pytest-dev-pytest — testing/test_doctest.py:1758

**Message:** `pytest.raises` without a `match=` pattern over 2 block statements.

```
    1753|     with _patch_unwrap_mock_aware():
    1754|         assert inspect.unwrap.__module__ != "inspect"
    1755|         with pytest.warns(
    1756|             pytest.PytestWarning, match="^Got KeyError.* when unwrapping"
    1757|         ):
>>> 1758|             with pytest.raises(KeyError):
    1759|                 inspect.unwrap(bad_instance, stop=stop)  # type: ignore[arg-type]
    1760|     assert inspect.unwrap.__module__ == "inspect"
    1761|
    1762|
    1763| def test_is_setup_py_not_named_setup_py(tmp_path: Path) -> None:
```

**verdict:**

---

## 8. pytest-dev-pytest — testing/test_recwarn.py:101

**Message:** `pytest.raises` without a `match=` pattern over 12 block statements.

```
      96|             assert str(warn.message) == "hello"
      97|             values = rec.list
      98|             rec.clear()
      99|             assert len(rec.list) == 0
     100|             assert values is rec.list
>>>  101|             with pytest.raises(AssertionError):
     102|                 rec.pop()
     103|
     104|     def test_warn_stacklevel(self) -> None:
     105|         """#4243"""
     106|         rec = WarningsRecorder(_ispytest=True)
```

**verdict:**

---

## 9. pytest-dev-pytest — testing/test_recwarn.py:123

**Message:** `pytest.raises` without a `match=` pattern over 2 block statements.

```
     118|             WarningsChecker([DeprecationWarning, RuntimeWarning], _ispytest=True)  # type: ignore[arg-type]
     119|
     120|     def test_invalid_enter_exit(self) -> None:
     121|         # wrap this test in WarningsRecorder to ensure warning state gets reset
     122|         with WarningsRecorder(_ispytest=True):
>>>  123|             with pytest.raises(RuntimeError):
     124|                 rec = WarningsRecorder(_ispytest=True)
     125|                 rec.__exit__(None, None, None)  # can't exit before entering
     126|
     127|             with pytest.raises(RuntimeError):
     128|                 rec = WarningsRecorder(_ispytest=True)
```

**verdict:**

---

## 10. pytest-dev-pytest — testing/test_recwarn.py:123

**Message:** `pytest.raises` without a `match=` pattern over 2 block statements.

```
     118|             WarningsChecker([DeprecationWarning, RuntimeWarning], _ispytest=True)  # type: ignore[arg-type]
     119|
     120|     def test_invalid_enter_exit(self) -> None:
     121|         # wrap this test in WarningsRecorder to ensure warning state gets reset
     122|         with WarningsRecorder(_ispytest=True):
>>>  123|             with pytest.raises(RuntimeError):
     124|                 rec = WarningsRecorder(_ispytest=True)
     125|                 rec.__exit__(None, None, None)  # can't exit before entering
     126|
     127|             with pytest.raises(RuntimeError):
     128|                 rec = WarningsRecorder(_ispytest=True)
```

**verdict:**

---

## 11. pytest-dev-pytest — testing/test_recwarn.py:127

**Message:** `pytest.raises` without a `match=` pattern over 2 block statements.

```
     122|         with WarningsRecorder(_ispytest=True):
     123|             with pytest.raises(RuntimeError):
     124|                 rec = WarningsRecorder(_ispytest=True)
     125|                 rec.__exit__(None, None, None)  # can't exit before entering
     126|
>>>  127|             with pytest.raises(RuntimeError):
     128|                 rec = WarningsRecorder(_ispytest=True)
     129|                 with rec:
     130|                     with rec:
     131|                         pass  # can't enter twice
     132|
```

**verdict:**

---

## 12. pytest-dev-pytest — testing/test_recwarn.py:242

**Message:** `pytest.raises` without a `match=` pattern over 2 block statements.

```
     237|
     238|             def f():
     239|                 warnings.warn(warning("hi"))  # noqa: B023
     240|
     241|             with pytest.warns(warning):
>>>  242|                 with pytest.raises(pytest.fail.Exception):
     243|                     pytest.deprecated_call(f)
     244|                 with pytest.raises(pytest.fail.Exception):
     245|                     with pytest.deprecated_call():
     246|                         f()
     247|
```

**verdict:**

---
