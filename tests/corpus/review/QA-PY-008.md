# QA-PY-008 — Sample Findings for Classification

Total sampled: 20 (max 20 per rule)

Classify each finding as:

- **TP** (True Positive) — the finding is correct, this IS the anti-pattern
- **FP** (False Positive) — the finding is wrong, this is legitimate code
- **UNSURE** — cannot determine without more context

---

## 1. psf-requests — tests/test_requests.py:2208

**Message:** Test `test_session_close_proxy_clear` asserts only on mock call bookkeeping.

```
    2203|         r = requests.get(httpbin("stream/4"), stream=True)
    2204|         assert r.status_code == 200
    2205|
    2206|         next(r.iter_lines())
    2207|         assert len(list(r.iter_lines())) == 3
>>> 2208|
    2209|     def test_session_close_proxy_clear(self):
    2210|         proxies = {
    2211|             "one": mock.Mock(),
    2212|             "two": mock.Mock(),
    2213|         }
```

**verdict:**

---

## 2. psf-requests — tests/test_utils.py:787

**Message:** Test `test_should_bypass_proxies_pass_only_hostname` asserts only on mock call bookkeeping.

```
     782|         ("http://hostname:5000/", "hostname"),
     783|         ("http://user:pass@hostname", "hostname"),
     784|         ("http://user:pass@hostname:5000", "hostname"),
     785|     ),
     786| )
>>>  787| def test_should_bypass_proxies_pass_only_hostname(url, expected):
     788|     """The proxy_bypass function should be called with a hostname or IP without
     789|     a port number or auth credentials.
     790|     """
     791|     with mock.patch("requests.utils.proxy_bypass") as proxy_bypass:
     792|         should_bypass_proxies(url, no_proxy=None)
```

**verdict:**

---

## 3. reflex-dev-reflex — tests/units/components/test_memo.py:323

**Message:** Test `test_memo_does_not_warn_for_event_handler_param` asserts only on mock call bookkeeping.

```
     318|     assert count_param.default == 3
     319|
     320|     # The munged props bind at instantiation; ``count`` falls back to its default.
     321|     component = legacy_card(title="Hi")
     322|     assert isinstance(component, MemoComponent)
>>>  323|
     324|
     325| def test_memo_does_not_warn_for_event_handler_param():
     326|     """``rx.EventHandler`` params are recognized and must not be munged/warned."""
     327|     with patch.object(console, "deprecate") as mock_deprecate:
     328|
```

**verdict:**

---

## 4. reflex-dev-reflex — tests/units/components/test_memo.py:367

**Message:** Test `test_memo_component_key_deprecation_warns_once_across_instances` asserts only on mock call bookkeeping.

```
     362|     assert component.key == "row-1"
     363|     assert component.get_props() == ("title",)
     364|     # ... and reaches the rendered element, where React reads it for list
     365|     # reconciliation.
     366|     assert 'key:"row-1"' in component.render()["props"]
>>>  367|
     368|
     369| def test_memo_component_key_deprecation_warns_once_across_instances():
     370|     """Repeated ``key=`` instantiations warn once, without re-walking the stack.
     371|
     372|     Under ``rx.foreach`` a keyed memo is instantiated once per row. The warning
```

**verdict:**

---

## 5. reflex-dev-reflex — tests/units/components/test_memo.py:892

**Message:** Test `test_memo_does_not_warn_when_fully_annotated` asserts only on mock call bookkeeping.

```
     887|     definition = MEMOS["SoftChildren", __name__]
     888|     assert isinstance(definition, MemoComponentDefinition)
     889|     (children_param,) = definition.params
     890|     assert children_param.name == "children"
     891|     assert children_param.kind is MemoParamKind.CHILDREN
>>>  892|
     893|
     894| def test_memo_does_not_warn_when_fully_annotated():
     895|     """Fully-annotated memos must not trigger the deprecation fallback."""
     896|     with patch.object(console, "deprecate") as mock_deprecate:
     897|
```

**verdict:**

---

## 6. reflex-dev-reflex — tests/units/reflex_base/utils/test_log.py:320

**Message:** Test `test_console_info_preserves_rich_print_kwargs` asserts only on mock call bookkeeping.

```
     315|     out_lines = out.splitlines()
     316|     assert "Info: legacy info" in out_lines
     317|     assert "Warning: legacy warn" in out_lines
     318|     assert "legacy error" in err.splitlines()
     319|     assert "console.info has been deprecated" in out.replace("\n", " ")
>>>  320|
     321|
     322| def test_console_info_preserves_rich_print_kwargs(monkeypatch):
     323|     """The deprecated info helper retains its Rich print contract."""
     324|     rich_console = mock.Mock()
     325|     monkeypatch.setattr(console, "_console", rich_console)
```

**verdict:**

---

## 7. reflex-dev-reflex — tests/units/reflex_base/utils/test_log.py:335

**Message:** Test `test_console_log_preserves_rich_log_rendering` asserts only on mock call bookkeeping.

```
     330|     rich_console.print.assert_called_once_with(
     331|         "[cyan]Info: [bold]message[/bold][/cyan]",
     332|         markup=False,
     333|         soft_wrap=True,
     334|     )
>>>  335|
     336|
     337| def test_console_log_preserves_rich_log_rendering(monkeypatch):
     338|     """The deprecated log helper still delegates to Rich Console.log."""
     339|     rich_console = mock.Mock()
     340|     monkeypatch.setattr(console, "_console", rich_console)
```

**verdict:**

---

## 8. reflex-dev-reflex — tests/units/reflex_base/utils/test_log.py:346

**Message:** Test `test_console_debug_progress_preserves_file_log` asserts only on mock call bookkeeping.

```
     341|     monkeypatch.setattr(console, "_shim_deprecation", mock.Mock())
     342|
     343|     console.log("message", justify="left")
     344|
     345|     rich_console.log.assert_called_once_with("message", justify="left")
>>>  346|
     347|
     348| def test_console_debug_progress_preserves_file_log(monkeypatch):
     349|     """Progress-bound debug output retains its legacy file-log behavior."""
     350|     progress = mock.Mock()
     351|     print_to_log_file = mock.Mock()
```

**verdict:**

---

## 9. reflex-dev-reflex — tests/units/reflex_base/utils/test_log.py:365

**Message:** Test `test_console_deprecate_preserves_rich_print_kwargs` asserts only on mock call bookkeeping.

```
     360|         "[purple]Debug: message[/purple]", markup=False
     361|     )
     362|     print_to_log_file.assert_called_once_with(
     363|         "[purple]Debug: message[/purple]", markup=False
     364|     )
>>>  365|
     366|
     367| def test_console_deprecate_preserves_rich_print_kwargs(monkeypatch):
     368|     """The legacy deprecation helper retains its Rich print contract."""
     369|     rich_print = mock.Mock()
     370|     monkeypatch.setattr(console, "print", rich_print)
```

**verdict:**

---

## 10. reflex-dev-reflex — tests/units/reflex_cli/v2/test_cli.py:29

**Message:** Test `test_login_success_existing_token` asserts only on mock call bookkeeping.

```
      24|
      25|     Returns:
      26|         The formatted messages of the matching records.
      27|     """
      28|     return [r.getMessage() for r in caplog.records if r.levelno == level]
>>>   29|
      30|
      31| def test_login_success_existing_token(mocker: MockFixture):
      32|     mocker.patch(
      33|         "reflex_cli.utils.hosting.authenticated_token",
      34|         return_value=("fake-code", {}),
```

**verdict:**

---

## 11. reflex-dev-reflex — tests/units/reflex_cli/v2/test_cli.py:42

**Message:** Test `test_login_success_on_browser` asserts only on mock call bookkeeping.

```
      37|         "reflex_cli.utils.hosting.authenticate_on_browser",
      38|         return_value=("fake-token", {}),
      39|     )
      40|     cli.login()
      41|     mock_authenticate_on_browser.assert_not_called()
>>>   42|
      43|
      44| def test_login_success_on_browser(mocker: MockFixture):
      45|     mocker.patch(
      46|         "reflex_cli.utils.hosting.authenticated_token",
      47|         side_effect=[("", {}), ("fake-token", {})],
```

**verdict:**

---

## 12. reflex-dev-reflex — tests/units/reflex_cli/v2/test_cli.py:56

**Message:** Test `test_login_failure` asserts only on mock call bookkeeping.

```
      51|         "reflex_cli.utils.hosting.authenticate_on_browser",
      52|         return_value=("fake-token", {}),
      53|     )
      54|     cli.login()
      55|     mock_authenticate_on_browser.assert_called_once()
>>>   56|
      57|
      58| def test_login_failure(mocker: MockFixture):
      59|     mocker.patch(
      60|         "reflex_cli.utils.hosting.authenticated_token",
      61|         return_value=("", {}),
```

**verdict:**

---

## 13. reflex-dev-reflex — tests/units/reflex_cli/v2/test_cli.py:128

**Message:** Test `test_deploy_non_interactive_app_not_found` asserts only on mock call bookkeeping.

```
     123|
     124| @pytest.mark.parametrize(
     125|     "hostname",
     126|     [{"error": "fake-error"}, {"hostname": "fake-hostname", "server": "fake-server"}],
     127| )
>>>  128| def test_deploy_non_interactive_app_not_found(
     129|     mocker: MockerFixture,
     130|     mock_export_fn: Callable[[str, str, str, bool, bool, bool, bool], None],
     131|     hostname: dict[str, str],
     132| ):
     133|     mocker.patch(
```

**verdict:**

---

## 14. reflex-dev-reflex — tests/units/reflex_cli/v2/test_cli.py:186

**Message:** Test `test_deploy_create_deployment_failure` asserts only on mock call bookkeeping.

```
     181|
     182|     cli.deploy(app_name="fake-app", export_fn=mock_export_fn, interactive=False)
     183|     create_app.assert_called_once()
     184|     create_deployment.assert_called_once()
     185|     watch_deployment.assert_called_once()
>>>  186|
     187|
     188| def test_deploy_create_deployment_failure(
     189|     mocker: MockerFixture,
     190|     mock_export_fn: Callable[[str, str, str, bool, bool, bool, bool], None],
     191| ):
```

**verdict:**

---

## 15. reflex-dev-reflex — tests/units/reflex_cli/v2/test_cli.py:229

**Message:** Test `test_deploy_non_interactive_project_name` asserts only on mock call bookkeeping.

```
     224|
     225|     with pytest.raises(click.exceptions.Exit):
     226|         cli.deploy(app_name="fake-app", export_fn=mock_export_fn, interactive=False)
     227|     create_deployment.assert_called_once()
     228|     watch_deployment.assert_not_called()
>>>  229|
     230|
     231| def test_deploy_non_interactive_project_name(
     232|     mocker: MockerFixture,
     233|     mock_export_fn: Callable[[str, str, str, bool, bool, bool, bool], None],
     234| ):
```

**verdict:**

---

## 16. reflex-dev-reflex — tests/units/reflex_cli/v2/test_cli.py:355

**Message:** Test `test_deploy_interactive_project_name_multiple_values` asserts only on mock call bookkeeping.

```
     350|             project_name="fake-project",
     351|         )
     352|     assert _log_messages(caplog, logging.ERROR) == [
     353|         "Multiple projects with the name 'fake-project' found. Please provide a unique name."
     354|     ]
>>>  355|
     356|
     357| def test_deploy_interactive_project_name_multiple_values(
     358|     mocker: MockerFixture,
     359|     mock_export_fn: Callable[[str, str, str, bool, bool, bool, bool], None],
     360| ):
```

**verdict:**

---

## 17. reflex-dev-reflex — tests/units/reflex_cli/v2/test_cli.py:467

**Message:** Test `test_deploy_non_interactive_export_failure` asserts only on mock call bookkeeping.

```
     462|         )
     463|
     464|     assert _log_messages(caplog, logging.ERROR) == [
     465|         "Please provide a valid app name or ID for the deployed instance."
     466|     ]
>>>  467|
     468|
     469| def test_deploy_non_interactive_export_failure(
     470|     mocker: MockerFixture, mock_export_import_error_fn: MagicMock
     471| ):
     472|     mocker.patch(
```

**verdict:**

---

## 18. reflex-dev-reflex — tests/units/reflex_cli/v2/test_cli.py:665

**Message:** Test `test_deploy_create_deployment_multiple_apps_interactive` asserts only on mock call bookkeeping.

```
     660|             token="fake-token",
     661|         )
     662|     assert _log_messages(caplog, logging.ERROR) == [
     663|         "Multiple apps with the name 'fake-app' found. Please provide a unique name."
     664|     ]
>>>  665|
     666|
     667| def test_deploy_create_deployment_multiple_apps_interactive(
     668|     mocker: MockerFixture,
     669|     mock_export_fn: Callable[[str, str, str, bool, bool, bool, bool], None],
     670| ):
```

**verdict:**

---

## 19. reflex-dev-reflex — tests/units/reflex_cli/v2/test_cli.py:1148

**Message:** Test `test_deploy_without_instance_bounds_flags_skips_the_call` asserts only on mock call bookkeeping.

```
    1143|     ]
    1144|     bounds_kwargs = recorder.set_instance_bounds.call_args.kwargs
    1145|     assert bounds_kwargs["app_id"] == "fake-id"
    1146|     assert bounds_kwargs["min_instances"] == min_instances
    1147|     assert bounds_kwargs["max_instances"] == max_instances
>>> 1148|
    1149|
    1150| def test_deploy_without_instance_bounds_flags_skips_the_call(
    1151|     mocker: MockerFixture,
    1152|     mock_export_fn: Callable[[str, str, str, bool, bool, bool, bool], None],
    1153| ):
```

**verdict:**

---

## 20. reflex-dev-reflex — tests/units/reflex_cli/v2/test_cli.py:1161

**Message:** Test `test_deploy_failed_export_does_not_apply_instance_bounds` asserts only on mock call bookkeeping.

```
    1156|
    1157|     cli.deploy(app_name="fake-app", export_fn=mock_export_fn, interactive=False)
    1158|
    1159|     recorder.set_instance_bounds.assert_not_called()
    1160|     recorder.create_deployment.assert_called_once()
>>> 1161|
    1162|
    1163| def test_deploy_failed_export_does_not_apply_instance_bounds(
    1164|     mocker: MockerFixture,
    1165|     mock_export_import_error_fn: Callable[[str, str, str, bool, bool, bool], None],
    1166| ):
```

**verdict:**

---
