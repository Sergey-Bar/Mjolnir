# QA-SE-003 — Sample Findings for Classification

Total sampled: 4 (max 20 per rule)

Classify each finding as:

- **TP** (True Positive) — the finding is correct, this IS the anti-pattern
- **FP** (False Positive) — the finding is wrong, this is legitimate code
- **UNSURE** — cannot determine without more context

---

## 1. reflex-dev-reflex — tests/integration/test_memory_state_manager_expiration.py:141

**Message:** Hard sleep before an element lookup (sleep at line 141) — the explicit-wait substitute (QA-SE-003).

```
     136|
     137|     increment.click()
     138|     AppHarness.expect(lambda: counter.text == "1")
     139|     AppHarness.expect(lambda: token in app_state_manager.states)
     140|
>>>  141|     time.sleep(0.6)
     142|     increment.click()
     143|     AppHarness.expect(lambda: counter.text == "2")
     144|     AppHarness.expect(lambda: token in app_state_manager.states)
     145|
     146|     time.sleep(0.6)
```

**verdict:**

---

## 2. reflex-dev-reflex — tests/integration/test_memory_state_manager_expiration.py:146

**Message:** Hard sleep before an element lookup (sleep at line 146) — the explicit-wait substitute (QA-SE-003).

```
     141|     time.sleep(0.6)
     142|     increment.click()
     143|     AppHarness.expect(lambda: counter.text == "2")
     144|     AppHarness.expect(lambda: token in app_state_manager.states)
     145|
>>>  146|     time.sleep(0.6)
     147|     increment.click()
     148|     AppHarness.expect(lambda: counter.text == "3")
     149|     AppHarness.expect(lambda: token in app_state_manager.states)
     150|
     151|     time.sleep(0.6)
```

**verdict:**

---

## 3. reflex-dev-reflex — tests/integration/test_upload.py:759

**Message:** Hard sleep before an element lookup (sleep at line 759) — the explicit-wait substitute (QA-SE-003).

```
     754|     for exp_name, exp_contents in exp_files.items():
     755|         target_file = tmp_path / exp_name
     756|         target_file.write_text(exp_contents)
     757|         upload_box.send_keys(str(target_file))
     758|
>>>  759|     time.sleep(0.2)
     760|
     761|     # check that the selected files are displayed
     762|     selected_files = driver.find_element(By.ID, f"selected_files{suffix}")
     763|     assert [Path(name).name for name in selected_files.text.split("\n")] == [
     764|         Path(name).name for name in exp_files
```

**verdict:**

---

## 4. positive-fixtures — QA-PY-102/test_time_sleep_pw.py:8

**Message:** Hard sleep before an element lookup (sleep at line 8) — the explicit-wait substitute (QA-SE-003).

```
       3| from playwright.sync_api import sync_playwright
       4|
       5|
       6| def test_slow_widget(page):
       7|     page.goto("/widgets")
>>>    8|     time.sleep(3)
       9|     page.click("#widget")
      10|
      11|
      12| def test_chart_render(page):
      13|     page.goto("/charts")
```

**verdict:**

---
