# QA-PY-003 — Sample Findings for Classification

Total sampled: 20 (max 20 per rule)

Classify each finding as:

- **TP** (True Positive) — the finding is correct, this IS the anti-pattern
- **FP** (False Positive) — the finding is wrong, this is legitimate code
- **UNSURE** — cannot determine without more context

---

## 1. pallets-click — tests/test_arguments.py:695

**Message:** Test `test_duplicate_names_warning` contains no assertions.

```
     690|             ("aardvark",),
     691|             ("aardvark",),
     692|         ),
     693|     ],
     694| )
>>>  695| def test_duplicate_names_warning(runner, args_one, args_two):
     696|     @click.command()
     697|     @click.argument(*args_one)
     698|     @click.argument(*args_two)
     699|     def cli(one, two):
     700|         pass
```

**verdict:**

---

## 2. pallets-click — tests/test_commands.py:186

**Message:** Test `test_callback` contains no assertions.

```
     181|         action="store_false",
     182|         dest="verbose",
     183|         default=True,
     184|         help="don't print status messages to stdout",
     185|     )
>>>  186|
     187|     def test_callback(args, filename, verbose):
     188|         click.echo(" ".join(args))
     189|         click.echo(filename)
     190|         click.echo(verbose)
     191|
```

**verdict:**

---

## 3. pallets-click — tests/test_context.py:304

**Message:** Test `test_callback` contains no assertions.

```
     299|         pass
     300|
     301|     ctx = click.Context(cli)
     302|
     303|     @ctx.call_on_close
>>>  304|     def test_callback():
     305|         rv.append(42)
     306|
     307|     with ctx.scope(cleanup=False):
     308|         # Internal
     309|         assert ctx._depth == 2
```

**verdict:**

---

## 4. pallets-click — tests/test_deprecations.py:68

**Message:** Test `test_isolated_filesystem_deprecated` contains no assertions.

```
      63| def test_context_protected_args_deprecated():
      64|     ctx = click.Context(click.Command("cli"))
      65|
      66|     with pytest.warns(DeprecationWarning, match="protected_args"):
      67|         assert ctx.protected_args == []
>>>   68|
      69|
      70| def test_isolated_filesystem_deprecated(runner):
      71|     with pytest.warns(DeprecationWarning, match="isolated_filesystem"):
      72|         with runner.isolated_filesystem():
      73|             pass
```

**verdict:**

---

## 5. pallets-click — tests/test_options.py:1942

**Message:** Test `test_duplicate_names_warning` contains no assertions.

```
    1937|             ("-a", "--aardvark"),
    1938|             ("-b", "--aardvark"),
    1939|         ),
    1940|     ],
    1941| )
>>> 1942| def test_duplicate_names_warning(runner, opts_one, opts_two):
    1943|     @click.command()
    1944|     @click.option(*opts_one)
    1945|     @click.option(*opts_two)
    1946|     def cli(one, two):
    1947|         pass
```

**verdict:**

---

## 6. pallets-click — tests/test_options.py:3310

**Message:** Test `test_flag_group_competition_duplicate_option_name` contains no assertions.

```
    3305|         click.echo(repr(state), nl=False)
    3306|
    3307|     result = runner.invoke(cli, args)
    3308|     assert result.exit_code == 0, result.output
    3309|     assert result.output == repr(expected)
>>> 3310|
    3311|
    3312| def test_flag_group_competition_duplicate_option_name(runner):
    3313|     """The same option name declared twice on the same command is a user
    3314|     error.
    3315|     """
```

**verdict:**

---

## 7. pallets-click — tests/test_testing.py:54

**Message:** Test `test_python_input` contains no assertions.

```
      49|     assert result.output == "Hello World!\nHello World!\n"
      50|
      51|
      52| def test_echo_stdin_prompts():
      53|     @click.command()
>>>   54|     def test_python_input():
      55|         foo = input("Foo: ")
      56|         click.echo(f"foo={foo}")
      57|
      58|     runner = CliRunner(echo_stdin=True)
      59|     result = runner.invoke(test_python_input, input="bar bar\n")
```

**verdict:**

---

## 8. pallets-click — tests/test_testing.py:65

**Message:** Test `test_prompt` contains no assertions.

```
      60|     assert not result.exception
      61|     assert result.output == "Foo: bar bar\nfoo=bar bar\n"
      62|
      63|     @click.command()
      64|     @click.option("--foo", prompt=True)
>>>   65|     def test_prompt(foo):
      66|         click.echo(f"foo={foo}")
      67|
      68|     result = runner.invoke(test_prompt, input="bar bar\n")
      69|     assert not result.exception
      70|     assert result.output == "Foo: bar bar\nfoo=bar bar\n"
```

**verdict:**

---

## 9. pallets-click — tests/test_testing.py:74

**Message:** Test `test_hidden_prompt` contains no assertions.

```
      69|     assert not result.exception
      70|     assert result.output == "Foo: bar bar\nfoo=bar bar\n"
      71|
      72|     @click.command()
      73|     @click.option("--foo", prompt=True, hide_input=True)
>>>   74|     def test_hidden_prompt(foo):
      75|         click.echo(f"foo={foo}")
      76|
      77|     result = runner.invoke(test_hidden_prompt, input="bar bar\n")
      78|     assert not result.exception
      79|     assert result.output == "Foo: \nfoo=bar bar\n"
```

**verdict:**

---

## 10. pallets-click — tests/test_testing.py:84

**Message:** Test `test_multiple_prompts` contains no assertions.

```
      79|     assert result.output == "Foo: \nfoo=bar bar\n"
      80|
      81|     @click.command()
      82|     @click.option("--foo", prompt=True)
      83|     @click.option("--bar", prompt=True)
>>>   84|     def test_multiple_prompts(foo, bar):
      85|         click.echo(f"foo={foo}, bar={bar}")
      86|
      87|     result = runner.invoke(test_multiple_prompts, input="one\ntwo\n")
      88|     assert not result.exception
      89|     assert result.output == "Foo: one\nBar: two\nfoo=one, bar=two\n"
```

**verdict:**

---

## 11. pallets-click — tests/test_utils/test_confirm.py:25

**Message:** Test `test_no` contains no assertions.

```
      20|     result = runner.invoke(test, input="n\n")
      21|     assert not result.exception
      22|     assert result.output == "Foo [y/N]: n\nno :(\n"
      23|
      24|     @click.command()
>>>   25|     def test_no():
      26|         if click.confirm("Foo", default=True):
      27|             click.echo("yes!")
      28|         else:
      29|             click.echo("no :(")
      30|
```

**verdict:**

---

## 12. pallets-click — tests/test_utils/test_echo.py:44

**Message:** Test `test_echo_no_streams` contains no assertions.

```
      39|     assert f.getvalue() == "hello\n"
      40|
      41|     b = BytesIO()
      42|     click.echo(b"", b)
      43|     assert b.getvalue() == b"\n"
>>>   44|
      45|
      46| def test_echo_no_streams(monkeypatch, runner):
      47|     """echo should not fail when stdout and stderr are None with pythonw on Windows."""
      48|     with runner.isolation():
      49|         sys.stdout = None
```

**verdict:**

---

## 13. pallets-click — tests/test_utils/test_open_file.py:65

**Message:** Test `test_open_file_ignore_invalid_utf8` contains no assertions.

```
      60|     path = tmp_path / "test.txt"
      61|     path.write_text("Hello world!")
      62|
      63|     with click.open_file(str(path), encoding="utf8", errors="ignore") as f:
      64|         assert f.errors == "ignore"
>>>   65|
      66|
      67| def test_open_file_ignore_invalid_utf8(tmp_path):
      68|     path = tmp_path / "test.txt"
      69|     path.write_bytes(b"\xe2\x28\xa1")
      70|
```

**verdict:**

---

## 14. pallets-click — tests/test_utils/test_open_file.py:73

**Message:** Test `test_open_file_ignore_no_encoding` contains no assertions.

```
      68|     path = tmp_path / "test.txt"
      69|     path.write_bytes(b"\xe2\x28\xa1")
      70|
      71|     with click.open_file(str(path), encoding="utf8", errors="ignore") as f:
      72|         f.read()
>>>   73|
      74|
      75| def test_open_file_ignore_no_encoding(tmp_path):
      76|     path = tmp_path / "test.bin"
      77|     path.write_bytes(os.urandom(16))
      78|
```

**verdict:**

---

## 15. pytest-dev-pytest — doc/en/example/assertion/global_testmodule_config/test_hello_world.py:5

**Message:** Test `test_func` contains no assertions.

```
       1| from __future__ import annotations
       2|
       3|
       4| hello = "world"
>>>    5|
       6|
       7| def test_func():
       8|     pass
       9|
```

**verdict:**

---

## 16. pytest-dev-pytest — doc/en/example/customdirectory/tests/test_first.py:3

**Message:** Test `test_1` contains no assertions.

```
       1| # content of test_first.py
       2| from __future__ import annotations
>>>    3|
       4|
       5| def test_1():
       6|     pass
       7|
```

**verdict:**

---

## 17. pytest-dev-pytest — doc/en/example/customdirectory/tests/test_second.py:3

**Message:** Test `test_2` contains no assertions.

```
       1| # content of test_second.py
       2| from __future__ import annotations
>>>    3|
       4|
       5| def test_2():
       6|     pass
       7|
```

**verdict:**

---

## 18. pytest-dev-pytest — doc/en/example/customdirectory/tests/test_third.py:3

**Message:** Test `test_3` contains no assertions.

```
       1| # content of test_third.py
       2| from __future__ import annotations
>>>    3|
       4|
       5| def test_3():
       6|     pass
       7|
```

**verdict:**

---

## 19. pytest-dev-pytest — testing/_py/test_local.py:461

**Message:** Test `test_fspath_open` contains no assertions.

```
     456|
     457|     def test_fspath_func_match_strpath(self, path1):
     458|         from os import fspath
     459|
     460|         assert fspath(path1) == path1.strpath
>>>  461|
     462|     def test_fspath_open(self, path1):
     463|         f = path1.join("samplefile")
     464|         stream = open(f, encoding="utf-8")
     465|         stream.close()
     466|
```

**verdict:**

---

## 20. pytest-dev-pytest — testing/_py/test_local.py:1030

**Message:** Test `test_pyimport_messy_name` contains no assertions.

```
    1025|
    1026|         # PY_IGNORE_IMPORTMISMATCH=0 does not ignore error.
    1027|         monkeypatch.setenv("PY_IGNORE_IMPORTMISMATCH", "0")
    1028|         with pytest.raises(tmpdir.ImportMismatchError):
    1029|             tmpdir.join("b", "test_x123.py").pyimport()
>>> 1030|
    1031|     def test_pyimport_messy_name(self, tmpdir):
    1032|         # http://bitbucket.org/hpk42/py-trunk/issue/129
    1033|         path = tmpdir.ensure("foo__init__.py")
    1034|         path.pyimport()
    1035|
```

**verdict:**

---
