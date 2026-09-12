# QA-PY-004 — Sample Findings for Classification

Total sampled: 20 (max 20 per rule)

Classify each finding as:

- **TP** (True Positive) — the finding is correct, this IS the anti-pattern
- **FP** (False Positive) — the finding is wrong, this is legitimate code
- **UNSURE** — cannot determine without more context

---

## 1. pallets-click — tests/test_basic.py:465

**Message:** Bare truthiness assert: `assert result_out.exception`.

```
     460|     do_io = False
     461|     result_in = runner.invoke(input, [f"--file={example}"])
     462|     assert result_in.exit_code == 0
     463|
     464|     result_out = runner.invoke(output, [f"--file={example}"])
>>>  465|     assert result_out.exception
     466|
     467|     @click.command()
     468|     @click.option("--file", type=click.File("w", lazy=False))
     469|     def input_non_lazy(file):
     470|         file.write("Hello World!\n")
```

**verdict:**

---

## 2. pallets-click — tests/test_options.py:414

**Message:** Bare truthiness assert: `assert issubclass(exception, Exception)`.

```
     409| )
     410| def test_bad_defaults_for_multiple(
     411|     runner, multiple, nargs, default, exception, message
     412| ):
     413|     if exception:
>>>  414|         assert issubclass(exception, Exception)
     415|     else:
     416|         assert exception is None
     417|
     418|     with (
     419|         pytest.raises(exception, match=re.compile(message))
```

**verdict:**

---

## 3. pallets-click — tests/test_termui.py:139

**Message:** Bare truthiness assert: `assert bar.finished`.

```
     134|         ) as bar:
     135|             for _ in range(20):
     136|                 bar.update(1)
     137|
     138|     assert bar.pos == 20
>>>  139|     assert bar.finished
     140|     assert "20/20" in stream.getvalue()
     141|
     142|
     143| @pytest.mark.parametrize("avg, expected", [([], 0.0), ([1, 4], 2.5)])
     144| def test_progressbar_time_per_iteration(runner, avg, expected):
```

**verdict:**

---

## 4. pallets-click — tests/test_testing.py:246

**Message:** Bare truthiness assert: `assert result.exception`.

```
     241|     assert result.output == "Error: Red error\n"
     242|     assert result.exception
     243|
     244|     result = runner.invoke(cli, color=True)
     245|     assert result.output == f"Error: {click.style('Red error', fg='red')}\n"
>>>  246|     assert result.exception
     247|
     248|
     249| def test_with_color_but_pause_not_blocking():
     250|     @click.command()
     251|     def cli():
```

**verdict:**

---

## 5. pytest-dev-pytest — testing/acceptance_test.py:940

**Message:** Bare truthiness assert: `assert request.config.pluginmanager.hasplugin(        )`.

```
     935|             is _pytest.config.PytestPluginManager
     936|         )
     937|
     938|     def test_has_plugin(self, request) -> None:
     939|         """Test hasplugin function of the plugin manager (#932)."""
>>>  940|         assert request.config.pluginmanager.hasplugin("python")
     941|
     942|
     943| class TestDurations:
     944|     source = """
     945|         from _pytest import timing
```

**verdict:**

---

## 6. pytest-dev-pytest — testing/code/test_code.py:82

**Message:** Bare truthiness assert: `assert co.path`.

```
      77|
      78|
      79| def test_code_from_func() -> None:
      80|     co = Code.from_function(test_frame_getsourcelineno_myself)
      81|     assert co.firstlineno
>>>   82|     assert co.path
      83|
      84|
      85| def test_unicode_handling() -> None:
      86|     value = "ąć".encode()
      87|
```

**verdict:**

---

## 7. pytest-dev-pytest — testing/code/test_code.py:165

**Message:** Bare truthiness assert: `assert False`.

```
     160|     def test_bad_getsource(self) -> None:
     161|         try:
     162|             if False:
     163|                 pass  # type: ignore[unreachable]
     164|             else:
>>>  165|                 assert False
     166|         except AssertionError:
     167|             exci = ExceptionInfo.from_current()
     168|         assert exci.getrepr()
     169|
     170|     def test_from_current_with_missing(self) -> None:
```

**verdict:**

---

## 8. pytest-dev-pytest — testing/code/test_code.py:168

**Message:** Bare truthiness assert: `assert exci.getrepr()`.

```
     163|                 pass  # type: ignore[unreachable]
     164|             else:
     165|                 assert False
     166|         except AssertionError:
     167|             exci = ExceptionInfo.from_current()
>>>  168|         assert exci.getrepr()
     169|
     170|     def test_from_current_with_missing(self) -> None:
     171|         with pytest.raises(AssertionError, match="no current exception"):
     172|             ExceptionInfo.from_current()
     173|
```

**verdict:**

---

## 9. pytest-dev-pytest — testing/code/test_code.py:181

**Message:** Bare truthiness assert: `assert False`.

```
     176|     def test_getsource(self) -> None:
     177|         try:
     178|             if False:
     179|                 pass  # type: ignore[unreachable]
     180|             else:
>>>  181|                 assert False
     182|         except AssertionError:
     183|             exci = ExceptionInfo.from_current()
     184|         entry = exci.traceback[0]
     185|         source = entry.getsource()
     186|         assert source is not None
```

**verdict:**

---

## 10. pytest-dev-pytest — testing/code/test_code.py:192

**Message:** Bare truthiness assert: `assert False`.

```
     187|         assert len(source) == 6
     188|         assert "assert False" in source[5]
     189|
     190|     def test_tb_entry_str(self):
     191|         try:
>>>  192|             assert False
     193|         except AssertionError:
     194|             exci = ExceptionInfo.from_current()
     195|         pattern = r"  File '.*test_code.py':\d+ in test_tb_entry_str\n  assert False"
     196|         entry = str(exci.traceback[0])
     197|         assert re.match(pattern, entry)
```

**verdict:**

---

## 11. pytest-dev-pytest — testing/code/test_excinfo.py:382

**Message:** Bare truthiness assert: `assert excinfo.errisinstance(ValueError)`.

```
     377|
     378|
     379| def test_excinfo_errisinstance():
     380|     with pytest.raises(ValueError) as excinfo:
     381|         h()
>>>  382|     assert excinfo.errisinstance(ValueError)
     383|
     384|
     385| def test_excinfo_no_sourcecode():
     386|     try:
     387|         exec("raise ValueError()")
```

**verdict:**

---

## 12. pytest-dev-pytest — testing/code/test_excinfo.py:473

**Message:** Bare truthiness assert: `assert exc_info.group_contains(RuntimeError)`.

```
     468|
     469|
     470| def test_raises_accepts_generic_group() -> None:
     471|     with pytest.raises(ExceptionGroup[Exception]) as exc_info:
     472|         raise ExceptionGroup("", [RuntimeError()])
>>>  473|     assert exc_info.group_contains(RuntimeError)
     474|
     475|
     476| def test_raises_accepts_generic_base_group() -> None:
     477|     with pytest.raises(BaseExceptionGroup[BaseException]) as exc_info:
     478|         raise ExceptionGroup("", [RuntimeError()])
```

**verdict:**

---

## 13. pytest-dev-pytest — testing/code/test_excinfo.py:479

**Message:** Bare truthiness assert: `assert exc_info.group_contains(RuntimeError)`.

```
     474|
     475|
     476| def test_raises_accepts_generic_base_group() -> None:
     477|     with pytest.raises(BaseExceptionGroup[BaseException]) as exc_info:
     478|         raise ExceptionGroup("", [RuntimeError()])
>>>  479|     assert exc_info.group_contains(RuntimeError)
     480|
     481|
     482| def test_raises_rejects_specific_generic_group() -> None:
     483|     with pytest.raises(ValueError):
     484|         pytest.raises(ExceptionGroup[RuntimeError])
```

**verdict:**

---

## 14. pytest-dev-pytest — testing/code/test_excinfo.py:490

**Message:** Bare truthiness assert: `assert exc_info.group_contains(RuntimeError)`.

```
     485|
     486|
     487| def test_raises_accepts_generic_group_in_tuple() -> None:
     488|     with pytest.raises((ValueError, ExceptionGroup[Exception])) as exc_info:
     489|         raise ExceptionGroup("", [RuntimeError()])
>>>  490|     assert exc_info.group_contains(RuntimeError)
     491|
     492|
     493| def test_raises_exception_escapes_generic_group() -> None:
     494|     try:
     495|         with pytest.raises(ExceptionGroup[Exception]):
```

**verdict:**

---

## 15. pytest-dev-pytest — testing/code/test_excinfo.py:508

**Message:** Bare truthiness assert: `assert exc_info.group_contains(RuntimeError)`.

```
     503| class TestGroupContains:
     504|     def test_contains_exception_type(self) -> None:
     505|         exc_group = ExceptionGroup("", [RuntimeError()])
     506|         with pytest.raises(ExceptionGroup) as exc_info:
     507|             raise exc_group
>>>  508|         assert exc_info.group_contains(RuntimeError)
     509|
     510|     def test_doesnt_contain_exception_type(self) -> None:
     511|         exc_group = ExceptionGroup("", [ValueError()])
     512|         with pytest.raises(ExceptionGroup) as exc_info:
     513|             raise exc_group
```

**verdict:**

---

## 16. pytest-dev-pytest — testing/code/test_excinfo.py:520

**Message:** Bare truthiness assert: `assert exc_info.group_contains(RuntimeError, match=                      )`.

```
     515|
     516|     def test_contains_exception_match(self) -> None:
     517|         exc_group = ExceptionGroup("", [RuntimeError("exception message")])
     518|         with pytest.raises(ExceptionGroup) as exc_info:
     519|             raise exc_group
>>>  520|         assert exc_info.group_contains(RuntimeError, match=r"^exception message$")
     521|
     522|     def test_doesnt_contain_exception_match(self) -> None:
     523|         exc_group = ExceptionGroup("", [RuntimeError("message that will not match")])
     524|         with pytest.raises(ExceptionGroup) as exc_info:
     525|             raise exc_group
```

**verdict:**

---

## 17. pytest-dev-pytest — testing/code/test_excinfo.py:532

**Message:** Bare truthiness assert: `assert exc_info.group_contains(RuntimeError)`.

```
     527|
     528|     def test_contains_exception_type_unlimited_depth(self) -> None:
     529|         exc_group = ExceptionGroup("", [ExceptionGroup("", [RuntimeError()])])
     530|         with pytest.raises(ExceptionGroup) as exc_info:
     531|             raise exc_group
>>>  532|         assert exc_info.group_contains(RuntimeError)
     533|
     534|     def test_contains_exception_type_at_depth_1(self) -> None:
     535|         exc_group = ExceptionGroup("", [RuntimeError()])
     536|         with pytest.raises(ExceptionGroup) as exc_info:
     537|             raise exc_group
```

**verdict:**

---

## 18. pytest-dev-pytest — testing/code/test_excinfo.py:538

**Message:** Bare truthiness assert: `assert exc_info.group_contains(RuntimeError, depth=1)`.

```
     533|
     534|     def test_contains_exception_type_at_depth_1(self) -> None:
     535|         exc_group = ExceptionGroup("", [RuntimeError()])
     536|         with pytest.raises(ExceptionGroup) as exc_info:
     537|             raise exc_group
>>>  538|         assert exc_info.group_contains(RuntimeError, depth=1)
     539|
     540|     def test_doesnt_contain_exception_type_past_depth(self) -> None:
     541|         exc_group = ExceptionGroup("", [ExceptionGroup("", [RuntimeError()])])
     542|         with pytest.raises(ExceptionGroup) as exc_info:
     543|             raise exc_group
```

**verdict:**

---

## 19. pytest-dev-pytest — testing/code/test_excinfo.py:550

**Message:** Bare truthiness assert: `assert exc_info.group_contains(RuntimeError, depth=2)`.

```
     545|
     546|     def test_contains_exception_type_specific_depth(self) -> None:
     547|         exc_group = ExceptionGroup("", [ExceptionGroup("", [RuntimeError()])])
     548|         with pytest.raises(ExceptionGroup) as exc_info:
     549|             raise exc_group
>>>  550|         assert exc_info.group_contains(RuntimeError, depth=2)
     551|
     552|     def test_contains_exception_match_unlimited_depth(self) -> None:
     553|         exc_group = ExceptionGroup(
     554|             "", [ExceptionGroup("", [RuntimeError("exception message")])]
     555|         )
```

**verdict:**

---

## 20. pytest-dev-pytest — testing/code/test_excinfo.py:558

**Message:** Bare truthiness assert: `assert exc_info.group_contains(RuntimeError, match=                      )`.

```
     553|         exc_group = ExceptionGroup(
     554|             "", [ExceptionGroup("", [RuntimeError("exception message")])]
     555|         )
     556|         with pytest.raises(ExceptionGroup) as exc_info:
     557|             raise exc_group
>>>  558|         assert exc_info.group_contains(RuntimeError, match=r"^exception message$")
     559|
     560|     def test_contains_exception_match_at_depth_1(self) -> None:
     561|         exc_group = ExceptionGroup("", [RuntimeError("exception message")])
     562|         with pytest.raises(ExceptionGroup) as exc_info:
     563|             raise exc_group
```

**verdict:**

---
