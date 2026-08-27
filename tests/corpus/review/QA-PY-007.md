# QA-PY-007 — Sample Findings for Classification

Total sampled: 20 (max 20 per rule)

Classify each finding as:

- **TP** (True Positive) — the finding is correct, this IS the anti-pattern
- **FP** (False Positive) — the finding is wrong, this is legitimate code
- **UNSURE** — cannot determine without more context

---

## 1. pallets-click — tests/test_arguments.py:275

**Message:** `pytest.raises` without a `match=` pattern.

```
     270|     """Test how a required argument is processing the provided values."""
     271|     ctx = click.Context(click.Command(""))
     272|     argument = click.Argument(["a"], required=True)
     273|
     274|     if expect_missing:
>>>  275|         with pytest.raises(click.MissingParameter) as excinfo:
     276|             argument.process_value(ctx, value)
     277|         assert str(excinfo.value) == "Missing parameter: a"
     278|
     279|     else:
     280|         value = argument.process_value(ctx, value)
```

**verdict:**

---

## 2. pallets-click — tests/test_arguments.py:612

**Message:** `pytest.raises` without a `match=` pattern.

```
     607|     result = runner.invoke(cmd, [])
     608|     assert message in result.stderr
     609|
     610|
     611| def test_multiple_param_decls_not_allowed(runner):
>>>  612|     with pytest.raises(TypeError):
     613|
     614|         @click.command()
     615|         @click.argument("x", click.Choice(["a", "b"]))
     616|         def copy(x):
     617|             click.echo(x)
```

**verdict:**

---

## 3. pallets-click — tests/test_chain.py:193

**Message:** `pytest.raises` without a `match=` pattern.

```
     188|     assert not result.exception
     189|     assert result.output.splitlines() == ["cli=", "a=", "b=", "c="]
     190|
     191|
     192| def test_group_arg_behavior(runner):
>>>  193|     with pytest.raises(RuntimeError):
     194|
     195|         @click.group(chain=True)
     196|         @click.argument("forbidden", required=False)
     197|         def bad_cli():
     198|             pass
```

**verdict:**

---

## 4. pallets-click — tests/test_chain.py:200

**Message:** `pytest.raises` without a `match=` pattern.

```
     195|         @click.group(chain=True)
     196|         @click.argument("forbidden", required=False)
     197|         def bad_cli():
     198|             pass
     199|
>>>  200|     with pytest.raises(RuntimeError):
     201|
     202|         @click.group(chain=True)
     203|         @click.argument("forbidden", nargs=-1)
     204|         def bad_cli2():
     205|             pass
```

**verdict:**

---

## 5. pallets-click — tests/test_context.py:584

**Message:** `pytest.raises` without a `match=` pattern.

```
     579|         rv = ctx.with_resource(TestContext(base_val=base_val))
     580|         raise TestException()
     581|
     582|     assert rv == [base_val + 1]
     583|
>>>  584|     with pytest.raises(TestException):
     585|         with ctx.scope():
     586|             rv = ctx.with_resource(
     587|                 TestContext(base_val=base_val, handle_exception=False)
     588|             )
     589|             raise TestException()
```

**verdict:**

---

## 6. pallets-click — tests/test_context.py:655

**Message:** `pytest.raises` without a `match=` pattern.

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

## 7. pallets-click — tests/test_options.py:882

**Message:** `pytest.raises` without a `match=` pattern.

```
     877| def test_required_option(value, expect_missing, processed_value):
     878|     ctx = click.Context(click.Command(""))
     879|     argument = click.Option(["-a"], required=True)
     880|
     881|     if expect_missing:
>>>  882|         with pytest.raises(click.MissingParameter) as excinfo:
     883|             argument.process_value(ctx, value)
     884|         assert str(excinfo.value) == "Missing parameter: a"
     885|
     886|     else:
     887|         value = argument.process_value(ctx, value)
```

**verdict:**

---

## 8. pallets-click — tests/test_options.py:1762

**Message:** `pytest.raises` without a `match=` pattern.

```
    1757|         ({"count": True, "multiple": True}, "'count' is not valid with 'multiple'."),
    1758|         ({"count": True, "is_flag": True}, "'count' is not valid with 'is_flag'."),
    1759|     ],
    1760| )
    1761| def test_invalid_flag_combinations(runner, kwargs, message):
>>> 1762|     with pytest.raises(TypeError) as e:
    1763|         click.Option(["-a"], **kwargs)
    1764|
    1765|     assert message in str(e.value)
    1766|
    1767|
```

**verdict:**

---

## 9. pallets-click — tests/test_termui.py:420

**Message:** `pytest.raises` without a `match=` pattern.

```
     415| @pytest.mark.skipif(not WIN, reason="Tests user-input using the msvcrt module.")
     416| def test_getchar_windows_exceptions(runner, monkeypatch, key_char, exc):
     417|     monkeypatch.setattr(click._termui_impl.msvcrt, "getwch", lambda: key_char)
     418|     monkeypatch.setattr(click.termui, "_getchar", None)
     419|
>>>  420|     with pytest.raises(exc):
     421|         click.getchar()
     422|
     423|
     424| @pytest.mark.skipif(WIN, reason="No sed on Windows.")
     425| def test_fast_edit(runner):
```

**verdict:**

---

## 10. pallets-click — tests/test_testing.py:182

**Message:** `pytest.raises` without a `match=` pattern.

```
     177|     result = runner.invoke(cli)
     178|     assert isinstance(result.exception, CustomError)
     179|     assert type(result.exc_info) is tuple
     180|     assert len(result.exc_info) == 3
     181|
>>>  182|     with pytest.raises(CustomError):
     183|         runner.invoke(cli, catch_exceptions=False)
     184|
     185|     CustomError = SystemExit
     186|
     187|     result = runner.invoke(cli)
```

**verdict:**

---

## 11. pallets-click — tests/test_testing.py:209

**Message:** `pytest.raises` without a `match=` pattern.

```
     204|     result = runner.invoke(cli, catch_exceptions=True)
     205|     assert isinstance(result.exception, CustomError)
     206|     assert type(result.exc_info) is tuple
     207|     assert len(result.exc_info) == 3
     208|
>>>  209|     with pytest.raises(CustomError):
     210|         runner.invoke(cli)
     211|
     212|
     213| def test_with_color():
     214|     @click.command()
```

**verdict:**

---

## 12. pallets-click — tests/test_testing.py:748

**Message:** `pytest.raises` without a `match=` pattern.

```
     743|     runner's stdout (issue #3384).
     744|     """
     745|
     746|     @click.command()
     747|     def cli():
>>>  748|         with pytest.raises(io.UnsupportedOperation):
     749|             sys.stdout.fileno()
     750|         with pytest.raises(io.UnsupportedOperation):
     751|             sys.stderr.fileno()
     752|         click.echo("ok")
     753|
```

**verdict:**

---

## 13. pallets-click — tests/test_testing.py:750

**Message:** `pytest.raises` without a `match=` pattern.

```
     745|
     746|     @click.command()
     747|     def cli():
     748|         with pytest.raises(io.UnsupportedOperation):
     749|             sys.stdout.fileno()
>>>  750|         with pytest.raises(io.UnsupportedOperation):
     751|             sys.stderr.fileno()
     752|         click.echo("ok")
     753|
     754|     runner = CliRunner(capture="sys")
     755|     result = runner.invoke(cli)
```

**verdict:**

---

## 14. pallets-click — tests/test_types.py:51

**Message:** `pytest.raises` without a `match=` pattern.

```
      46|         (click.FloatRange(0.5, min_open=True), 0.5, "x>0.5"),
      47|         (click.FloatRange(max=1.5, max_open=True), 1.5, "x<1.5"),
      48|     ],
      49| )
      50| def test_range_fail(type, value, expect):
>>>   51|     with pytest.raises(click.BadParameter) as exc_info:
      52|         type.convert(value, None, None)
      53|
      54|     assert expect in exc_info.value.message
      55|
      56|
```

**verdict:**

---

## 15. pallets-click — tests/test_types.py:70

**Message:** `pytest.raises` without a `match=` pattern.

```
      65|     def parse(value):
      66|         raise ValueError(error_message if error_message else "")
      67|
      68|     func_type = click.types.FuncParamType(parse)
      69|
>>>   70|     with pytest.raises(click.BadParameter) as exc_info:
      71|         func_type.convert("nope", None, None)
      72|
      73|     assert expected in exc_info.value.message
      74|
      75|
```

**verdict:**

---

## 16. pallets-click — tests/test_types.py:77

**Message:** `pytest.raises` without a `match=` pattern.

```
      72|
      73|     assert expected in exc_info.value.message
      74|
      75|
      76| def test_float_range_no_clamp_open():
>>>   77|     with pytest.raises(TypeError):
      78|         click.FloatRange(0, 1, max_open=True, clamp=True)
      79|
      80|     sneaky = click.FloatRange(0, 1, max_open=True)
      81|     sneaky.clamp = True
      82|
```

**verdict:**

---

## 17. pallets-click — tests/test_types.py:83

**Message:** `pytest.raises` without a `match=` pattern.

```
      78|         click.FloatRange(0, 1, max_open=True, clamp=True)
      79|
      80|     sneaky = click.FloatRange(0, 1, max_open=True)
      81|     sneaky.clamp = True
      82|
>>>   83|     with pytest.raises(RuntimeError):
      84|         sneaky.convert("1.5", None, None)
      85|
      86|
      87| @pytest.mark.parametrize(
      88|     ("nargs", "multiple", "default", "expect"),
```

**verdict:**

---

## 18. pallets-click — tests/test_types.py:301

**Message:** `pytest.raises` without a `match=` pattern.

```
     296|
     297| @pytest.mark.skipif(
     298|     platform.system() == "Windows", reason="Filepath syntax differences."
     299| )
     300| def test_invalid_path_with_esc_sequence():
>>>  301|     with pytest.raises(click.BadParameter) as exc_info:
     302|         with tempfile.TemporaryDirectory(prefix="my\ndir") as tempdir:
     303|             click.Path(dir_okay=False).convert(tempdir, None, None)
     304|
     305|     assert "my\\ndir" in exc_info.value.message
     306|
```

**verdict:**

---

## 19. pallets-click — tests/test_utils/test_echo_via_pager.py:165

**Message:** `pytest.raises` without a `match=` pattern.

```
     160|     expected_pager = test.expected_pager
     161|     expected_stdout = test.expected_stdout
     162|     expected_stderr = test.expected_stderr
     163|     expected_error = test.expected_error
     164|
>>>  165|     check_raise = pytest.raises(expected_error) if expected_error else nullcontext()
     166|
     167|     pager_out_tmp = tmp_path / "pager_out.txt"
     168|     with pager_out_tmp.open("w") as f:
     169|         force_subprocess_stdout = patch.object(
     170|             subprocess,
```

**verdict:**

---

## 20. pallets-click — tests/test_utils/test_echo_via_pager.py:253

**Message:** `pytest.raises` without a `match=` pattern.

```
     248|
     249|     pager_out_tmp = tmp_path / "pager_out.txt"
     250|     with (
     251|         pager_out_tmp.open("w") as f,
     252|         patch.object(subprocess, "Popen", partial(tracking_popen, stdout=f)),
>>>  253|         pytest.raises(RuntimeError),
     254|     ):
     255|         click.echo_via_pager(_test_gen_func_fails())
     256|
     257|     assert spawned, "pager subprocess was never started"
     258|     for p in spawned:
```

**verdict:**

---
