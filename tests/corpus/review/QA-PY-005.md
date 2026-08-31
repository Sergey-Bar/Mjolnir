# QA-PY-005 — Sample Findings for Classification

Total sampled: 19 (max 20 per rule)

Classify each finding as:

- **TP** (True Positive) — the finding is correct, this IS the anti-pattern
- **FP** (False Positive) — the finding is wrong, this is legitimate code
- **UNSURE** — cannot determine without more context

---

## 1. psf-requests — tests/test_testserver.py:74

**Message:** Hard sleep: `time.sleep(2…`.

```
      69|             port,
      70|         ):
      71|             sock = socket.socket()
      72|             sock.connect((host, port))
      73|             sock.sendall(b"send something")
>>>   74|             time.sleep(2.5)
      75|             sock.sendall(b"still alive")
      76|             block_server.set()  # release server block
      77|
      78|     def test_multiple_requests(self):
      79|         """multiple requests can be served"""
```

**verdict:**

---

## 2. psf-requests — tests/test_testserver.py:124

**Message:** Hard sleep: `time.sleep(1…`.

```
     119|         server = Server.basic_response_server(request_timeout=1)
     120|
     121|         with server as address:
     122|             sock = socket.socket()
     123|             sock.connect(address)
>>>  124|             time.sleep(1.5)
     125|             sock.sendall(b"hehehe, not received")
     126|             sock.close()
     127|
     128|         assert server.handler_results[0] == b""
     129|
```

**verdict:**

---

## 3. psf-requests — tests/test_testserver.py:138

**Message:** Hard sleep: `time.sleep(1…`.

```
     133|         data = b"bananadine"
     134|
     135|         with server as address:
     136|             sock = socket.socket()
     137|             sock.connect(address)
>>>  138|             time.sleep(1.5)
     139|             sock.sendall(data)
     140|             sock.close()
     141|
     142|         assert server.handler_results[0] == data
     143|
```

**verdict:**

---

## 4. reflex-dev-reflex — tests/integration/test_event_chain.py:149

**Message:** Hard sleep: `time.sleep(0…`.

```
     144|
     145|         @rx.event
     146|         def click_yield_interim_value(self):
     147|             self.interim_value = "interim"
     148|             yield
>>>  149|             time.sleep(0.5)
     150|             self.interim_value = "final"
     151|
     152|         @rx.event
     153|         def set_cond_input(self, value: str):
     154|             self.cond_input = value
```

**verdict:**

---

## 5. reflex-dev-reflex — tests/integration/test_exception_handlers.py:136

**Message:** Hard sleep: `time.sleep(2…`.

```
     131|     )
     132|
     133|     reset_button.click()
     134|
     135|     # Wait for the error to be logged
>>>  136|     time.sleep(2)
     137|
     138|     assert "induce_frontend_error" in caplog.text
     139|     assert "ReferenceError" in caplog.text
     140|
     141|
```

**verdict:**

---

## 6. reflex-dev-reflex — tests/integration/test_exception_handlers.py:163

**Message:** Hard sleep: `time.sleep(2…`.

```
     158|     )
     159|
     160|     reset_button.click()
     161|
     162|     # Wait for the error to be logged
>>>  163|     time.sleep(2)
     164|
     165|     assert "divide_by_number" in caplog.text
     166|     assert "ZeroDivisionError" in caplog.text
     167|
     168|
```

**verdict:**

---

## 7. reflex-dev-reflex — tests/integration/test_exception_handlers.py:191

**Message:** Hard sleep: `time.sleep(2…`.

```
     186|     )
     187|
     188|     reset_button.click()
     189|
     190|     # Wait for the error to be logged
>>>  191|     time.sleep(2)
     192|
     193|     if isinstance(test_app, AppHarnessProd):
     194|         assert "Error: Minified React error #31" in caplog.text
     195|     else:
     196|         assert (
```

**verdict:**

---

## 8. reflex-dev-reflex — tests/integration/test_large_state.py:75

**Message:** Hard sleep: `time.sleep(0…`.

```
      70|                 lambda: driver.find_element(By.ID, "button")
      71|             )
      72|
      73|             t = time.time()
      74|             while button.text != "0":
>>>   75|                 time.sleep(0.1)
      76|                 if time.time() - t > 30.0:
      77|                     msg = "Timeout waiting for initial state"
      78|                     raise TimeoutError(msg)
      79|
      80|             times_clicked = 0
```

**verdict:**

---

## 9. reflex-dev-reflex — tests/integration/test_large_state.py:89

**Message:** Hard sleep: `time.sleep(0…`.

```
      84|                 for _ in range(clicks):
      85|                     button.click()
      86|                 nonlocal times_clicked
      87|                 times_clicked += clicks
      88|                 while button.text != str(times_clicked):
>>>   89|                     time.sleep(0.005)
      90|                     if time.time() - t > timeout:
      91|                         msg = "Timeout waiting for state update"
      92|                         raise TimeoutError(msg)
      93|
      94|             benchmark(round_trip, clicks=10, timeout=30.0)
```

**verdict:**

---

## 10. reflex-dev-reflex — tests/integration/test_memory_state_manager_expiration.py:141

**Message:** Hard sleep: `time.sleep(0…`.

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

## 11. reflex-dev-reflex — tests/integration/test_memory_state_manager_expiration.py:146

**Message:** Hard sleep: `time.sleep(0…`.

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

## 12. reflex-dev-reflex — tests/integration/test_memory_state_manager_expiration.py:151

**Message:** Hard sleep: `time.sleep(0…`.

```
     146|     time.sleep(0.6)
     147|     increment.click()
     148|     AppHarness.expect(lambda: counter.text == "3")
     149|     AppHarness.expect(lambda: token in app_state_manager.states)
     150|
>>>  151|     time.sleep(0.6)
     152|     assert token in app_state_manager.states
     153|     assert counter.text == "3"
     154|
     155|     AppHarness.expect(lambda: token not in app_state_manager.states, timeout=5)
     156|
```

**verdict:**

---

## 13. reflex-dev-reflex — tests/integration/test_server_side_event.py:162

**Message:** Hard sleep: `time.sleep(0…`.

```
     157|
     158|     assert input_a.get_attribute("value") == "a"
     159|     assert input_b.get_attribute("value") == "b"
     160|     assert input_c.get_attribute("value") == "c"
     161|     btn.click()
>>>  162|     time.sleep(0.2)
     163|     assert input_a.get_attribute("value") == ""
     164|     assert input_b.get_attribute("value") == ""
     165|     assert input_c.get_attribute("value") == ""
     166|
     167|
```

**verdict:**

---

## 14. reflex-dev-reflex — tests/integration/test_server_side_event.py:188

**Message:** Hard sleep: `time.sleep(0…`.

```
     183|
     184|     assert input_a.get_attribute("value") == "a"
     185|     assert input_b.get_attribute("value") == "b"
     186|     assert input_c.get_attribute("value") == "c"
     187|     btn.click()
>>>  188|     time.sleep(0.2)
     189|     assert input_a.get_attribute("value") == "a"
     190|     assert input_b.get_attribute("value") == "b"
     191|     assert input_c.get_attribute("value") == ""
     192|
     193|
```

**verdict:**

---

## 15. reflex-dev-reflex — tests/integration/test_upload.py:759

**Message:** Hard sleep: `time.sleep(0…`.

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

## 16. reflex-dev-reflex — tests/units/reflex_base/event/processor/test_timeout.py:20

**Message:** Hard sleep: `time.sleep(0…`.

```
      15| def test_drain_timeout_decreases():
      16|     """DrainTimeoutManager remaining time decreases across re-entries."""
      17|     dtm = DrainTimeoutManager.with_timeout(10.0)
      18|     with dtm as first:
      19|         assert 9.5 < first <= 10.0
>>>   20|     time.sleep(0.1)
      21|     with dtm as second:
      22|         assert second < first
      23|
      24|
      25| def test_drain_timeout_expired_returns_zero():
```

**verdict:**

---

## 17. reflex-dev-reflex — tests/units/test_config.py:871

**Message:** Hard sleep: `time.sleep(0…`.

```
     866|     def slow_load() -> rx.Config:
     867|         nonlocal load_count
     868|         with count_lock:
     869|             load_count += 1
     870|         # Widen the check-to-set window so an unserialized load path races.
>>>  871|         time.sleep(0.05)
     872|         return rx.Config(app_name="shared")
     873|
     874|     monkeypatch.setattr(reflex_base.config, "_load_config", slow_load)
     875|
     876|     ctx = RegistrationContext()
```

**verdict:**

---

## 18. reflex-dev-reflex — tests/units/utils/test_processes.py:243

**Message:** Hard sleep: `time.sleep(0…`.

```
     238|         "worker task did not finish"
     239|     )
     240|     # A stale interrupt would already have been sent by the callback above;
     241|     # give signal delivery a moment so it would surface as KeyboardInterrupt
     242|     # here (delivery latency is microseconds; 0.1s is generous headroom).
>>>  243|     time.sleep(0.1)
     244|
     245|
     246| def test_run_concurrently_context_no_interrupt_after_pre_body_failure():
     247|     """A failure racing context entry must not leave the interrupt armed.
     248|
```

**verdict:**

---

## 19. reflex-dev-reflex — tests/units/utils/test_processes.py:282

**Message:** Hard sleep: `time.sleep(0…`.

```
     277|     # The context has unwound; only now may the surviving task fail.
     278|     task_may_fail.set()
     279|     assert late_finished.wait(timeout=DEFAULT_TIMEOUT), "task did not finish"
     280|     # The interrupt callback runs within microseconds of the task finishing;
     281|     # a stale interrupt would surface as KeyboardInterrupt in this window.
>>>  282|     time.sleep(0.1)
     283|
```

**verdict:**

---
