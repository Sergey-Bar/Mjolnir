# QA-PY-001 — Sample Findings for Classification

Total sampled: 12 (max 20 per rule)

Classify each finding as:

- **TP** (True Positive) — the finding is correct, this IS the anti-pattern
- **FP** (False Positive) — the finding is wrong, this is legitimate code
- **UNSURE** — cannot determine without more context

---

## 1. positive-fixtures — QA-PY-001/test_focused_selection.py:4

**Message:** Focused-test selection committed: `pytest.main(["-k"`.

```
       1| import pytest
       2|
       3|
>>>    4| # pytest.main(["-k", "auth"])
       5| pytest.main(["tests/test_auth.py::test_login"])
       6| pytest.main(["tests/test_payments.py::test_charge"])
       7| pytest.main(["tests/test_search.py", "-k", "smoke"])
       8|
       9|
```

**verdict:**

---

## 2. positive-fixtures — QA-PY-001/test_focused_selection.py:5

**Message:** Focused-test selection committed: `pytest.main(["tests/test_auth.py::test_login"`.

```
       1| import pytest
       2|
       3|
       4| # pytest.main(["-k", "auth"])
>>>    5| pytest.main(["tests/test_auth.py::test_login"])
       6| pytest.main(["tests/test_payments.py::test_charge"])
       7| pytest.main(["tests/test_search.py", "-k", "smoke"])
       8|
       9|
      10| @pytest.mark.only
```

**verdict:**

---

## 3. positive-fixtures — QA-PY-001/test_focused_selection.py:6

**Message:** Focused-test selection committed: `pytest.main(["tests/test_payments.py::test_charge"`.

```
       1| import pytest
       2|
       3|
       4| # pytest.main(["-k", "auth"])
       5| pytest.main(["tests/test_auth.py::test_login"])
>>>    6| pytest.main(["tests/test_payments.py::test_charge"])
       7| pytest.main(["tests/test_search.py", "-k", "smoke"])
       8|
       9|
      10| @pytest.mark.only
      11| def test_marked_only():
```

**verdict:**

---

## 4. positive-fixtures — QA-PY-001/test_focused_selection.py:7

**Message:** Focused-test selection committed: `pytest.main(["tests/test_search.py", "-k"`.

```
       2|
       3|
       4| # pytest.main(["-k", "auth"])
       5| pytest.main(["tests/test_auth.py::test_login"])
       6| pytest.main(["tests/test_payments.py::test_charge"])
>>>    7| pytest.main(["tests/test_search.py", "-k", "smoke"])
       8|
       9|
      10| @pytest.mark.only
      11| def test_marked_only():
      12|     assert True
```

**verdict:**

---

## 5. positive-fixtures — QA-PY-001/test_focused_selection.py:10

**Message:** Focused-test selection committed: `@pytest.mark.only`.

```
       5| pytest.main(["tests/test_auth.py::test_login"])
       6| pytest.main(["tests/test_payments.py::test_charge"])
       7| pytest.main(["tests/test_search.py", "-k", "smoke"])
       8|
       9|
>>>   10| @pytest.mark.only
      11| def test_marked_only():
      12|     assert True
      13|
      14|
      15| @pytest.mark.only
```

**verdict:**

---

## 6. positive-fixtures — QA-PY-001/test_focused_selection.py:15

**Message:** Focused-test selection committed: `@pytest.mark.only`.

```
      10| @pytest.mark.only
      11| def test_marked_only():
      12|     assert True
      13|
      14|
>>>   15| @pytest.mark.only
      16| def test_another_marked_only():
      17|     assert True
      18|
      19|
      20| @pytest.mark.only
```

**verdict:**

---

## 7. positive-fixtures — QA-PY-001/test_focused_selection.py:20

**Message:** Focused-test selection committed: `@pytest.mark.only`.

```
      15| @pytest.mark.only
      16| def test_another_marked_only():
      17|     assert True
      18|
      19|
>>>   20| @pytest.mark.only
      21| def test_third_marked_only():
      22|     assert True
      23|
```

**verdict:**

---

## 8. positive-fixtures — QA-PY-001/test_more_focused.py:3

**Message:** Focused-test selection committed: `pytest.main(["tests/test_flows.py::test_checkout_complete"`.

```
       1| import pytest
       2|
>>>    3| pytest.main(["tests/test_flows.py::test_checkout_complete"])
       4| pytest.main(["tests/test_flows.py::test_checkout_abandoned"])
       5| pytest.main(["tests/test_search.py::test_search_basic"])
       6|
       7|
       8| @pytest.mark.only
```

**verdict:**

---

## 9. positive-fixtures — QA-PY-001/test_more_focused.py:4

**Message:** Focused-test selection committed: `pytest.main(["tests/test_flows.py::test_checkout_abandoned"`.

```
       1| import pytest
       2|
       3| pytest.main(["tests/test_flows.py::test_checkout_complete"])
>>>    4| pytest.main(["tests/test_flows.py::test_checkout_abandoned"])
       5| pytest.main(["tests/test_search.py::test_search_basic"])
       6|
       7|
       8| @pytest.mark.only
       9| def test_marked_only_flow():
```

**verdict:**

---

## 10. positive-fixtures — QA-PY-001/test_more_focused.py:5

**Message:** Focused-test selection committed: `pytest.main(["tests/test_search.py::test_search_basic"`.

```
       1| import pytest
       2|
       3| pytest.main(["tests/test_flows.py::test_checkout_complete"])
       4| pytest.main(["tests/test_flows.py::test_checkout_abandoned"])
>>>    5| pytest.main(["tests/test_search.py::test_search_basic"])
       6|
       7|
       8| @pytest.mark.only
       9| def test_marked_only_flow():
      10|     assert True
```

**verdict:**

---

## 11. positive-fixtures — QA-PY-001/test_more_focused.py:8

**Message:** Focused-test selection committed: `@pytest.mark.only`.

```
       3| pytest.main(["tests/test_flows.py::test_checkout_complete"])
       4| pytest.main(["tests/test_flows.py::test_checkout_abandoned"])
       5| pytest.main(["tests/test_search.py::test_search_basic"])
       6|
       7|
>>>    8| @pytest.mark.only
       9| def test_marked_only_flow():
      10|     assert True
      11|
      12|
      13| @pytest.mark.only
```

**verdict:**

---

## 12. positive-fixtures — QA-PY-001/test_more_focused.py:13

**Message:** Focused-test selection committed: `@pytest.mark.only`.

```
       8| @pytest.mark.only
       9| def test_marked_only_flow():
      10|     assert True
      11|
      12|
>>>   13| @pytest.mark.only
      14| def test_marked_only_billing():
      15|     assert True
      16|
```

**verdict:**

---
