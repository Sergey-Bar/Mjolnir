# QA-PY-004 — Sample Findings for Classification

Total sampled: 20 (max 20 per rule)

Classify each finding as:

- **TP** (True Positive) — the finding is correct, this IS the anti-pattern
- **FP** (False Positive) — the finding is wrong, this is legitimate code
- **UNSURE** — cannot determine without more context

---

## 1. pallets-click — tests/test_arguments.py:195

**Message:** Bare truthiness assert: `assert isinstance(result.exception, click.BadParameter)`.

```
     190|         return arg
     191|
     192|     result = runner.invoke(cmd, env={"X": value}, standalone_mode=False)
     193|
     194|     if isinstance(expect, str):
>>>  195|         assert isinstance(result.exception, click.BadParameter)
     196|         assert expect in result.exception.format_message()
     197|     else:
     198|         assert result.return_value == expect
     199|
     200|
```

**verdict:**

---

## 2. pallets-click — tests/test_arguments.py:682

**Message:** Bare truthiness assert: `assert isinstance(foo.params[0], CustomArgument)`.

```
     677|     @click.command()
     678|     @reusable_argument
     679|     def bar(arg):
     680|         pass
     681|
>>>  682|     assert isinstance(foo.params[0], CustomArgument)
     683|     assert isinstance(bar.params[0], CustomArgument)
     684|
     685|
     686| @pytest.mark.parametrize(
     687|     "args_one,args_two",
```

**verdict:**

---

## 3. pallets-click — tests/test_arguments.py:683

**Message:** Bare truthiness assert: `assert isinstance(bar.params[0], CustomArgument)`.

```
     678|     @reusable_argument
     679|     def bar(arg):
     680|         pass
     681|
     682|     assert isinstance(foo.params[0], CustomArgument)
>>>  683|     assert isinstance(bar.params[0], CustomArgument)
     684|
     685|
     686| @pytest.mark.parametrize(
     687|     "args_one,args_two",
     688|     [
```

**verdict:**

---

## 4. pallets-click — tests/test_basic.py:465

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

## 5. pallets-click — tests/test_basic.py:574

**Message:** Bare truthiness assert: `assert isinstance(method, MyEnum)`.

```
     569|         BAZ = "baz-value"
     570|
     571|     @click.command()
     572|     @click.argument("method", type=click.Choice(MyEnum, case_sensitive=False))
     573|     def cli(method: MyEnum):
>>>  574|         assert isinstance(method, MyEnum)
     575|         click.echo(method)
     576|
     577|     result = runner.invoke(cli, ["foo"])
     578|     assert result.output == "foo-value\n"
     579|     assert not result.exception
```

**verdict:**

---

## 6. pallets-click — tests/test_basic.py:605

**Message:** Bare truthiness assert: `assert isinstance(method, MyClass)`.

```
     600|     @click.command()
     601|     @click.argument(
     602|         "method", type=click.Choice([MyClass("foo"), MyClass("bar"), MyClass("baz")])
     603|     )
     604|     def cli(method: MyClass):
>>>  605|         assert isinstance(method, MyClass)
     606|         click.echo(method)
     607|
     608|     result = runner.invoke(cli, ["foo"])
     609|     assert not result.exception
     610|     assert result.output == "foo\n"
```

**verdict:**

---

## 7. pallets-click — tests/test_basic.py:641

**Message:** Bare truthiness assert: `assert result.exception`.

```
     636|     result = runner.invoke(cli, ["none"])
     637|     assert not result.exception
     638|     assert result.output == repr(None)
     639|
     640|     result = runner.invoke(cli, [])
>>>  641|     assert result.exception
     642|     assert (
     643|         "Error: Missing argument '{not-none|none}'. "
     644|         "Choose from:\n\tnot-none,\n\tnone\n" in result.stderr
     645|     )
     646|
```

**verdict:**

---

## 8. pallets-click — tests/test_basic.py:648

**Message:** Bare truthiness assert: `assert result.output.startswith(                                        )`.

```
     643|         "Error: Missing argument '{not-none|none}'. "
     644|         "Choose from:\n\tnot-none,\n\tnone\n" in result.stderr
     645|     )
     646|
     647|     result = runner.invoke(cli, ["--help"])
>>>  648|     assert result.output.startswith("Usage: cli [OPTIONS] {not-none|none}\n")
     649|
     650|
     651| def test_choice_argument_optional_metavar(runner):
     652|     """Optional Choice arguments reuse the type's brackets instead of doubling.
     653|
```

**verdict:**

---

## 9. pallets-click — tests/test_commands.py:346

**Message:** Bare truthiness assert: `assert result.output.startswith(                            )`.

```
     341|     def push():
     342|         click.echo("push command")
     343|
     344|     result = runner.invoke(cli, ["pu", "--help"])
     345|     assert not result.exception
>>>  346|     assert result.output.startswith("Usage: root push [OPTIONS]")
     347|
     348|
     349| def test_group_add_command_name(runner):
     350|     cli = click.Group("cli")
     351|     cmd = click.Command("a", params=[click.Option(["-x"], required=True)])
```

**verdict:**

---

## 10. pallets-click — tests/test_commands.py:667

**Message:** Bare truthiness assert: `assert isinstance(rv.exception.__cause__, exc)`.

```
     662|     def cli():
     663|         raise exc("catch me!")
     664|
     665|     rv = runner.invoke(cli, standalone_mode=False)
     666|     assert rv.exit_code == 1
>>>  667|     assert isinstance(rv.exception.__cause__, exc)
     668|     assert rv.exception.__cause__.args == ("catch me!",)
     669|
     670|
     671| def test_unknown_command(runner):
     672|     result = runner.invoke(click.Group(), "unknown")
```

**verdict:**

---

## 11. pallets-click — tests/test_commands.py:673

**Message:** Bare truthiness assert: `assert result.exception`.

```
     668|     assert rv.exception.__cause__.args == ("catch me!",)
     669|
     670|
     671| def test_unknown_command(runner):
     672|     result = runner.invoke(click.Group(), "unknown")
>>>  673|     assert result.exception
     674|     assert "No such command 'unknown'." in result.output
     675|
     676|
     677| @pytest.mark.parametrize(
     678|     ("value", "expect"),
```

**verdict:**

---

## 12. pallets-click — tests/test_context.py:103

**Message:** Bare truthiness assert: `assert isinstance(result.exception, RuntimeError)`.

```
      98|     def test(foo):
      99|         click.echo(foo.title)
     100|
     101|     result = runner.invoke(cli, ["test"])
     102|     assert result.exception is not None
>>>  103|     assert isinstance(result.exception, RuntimeError)
     104|     assert (
     105|         "Managed to invoke callback without a context object of type"
     106|         " 'Foo' existing" in str(result.exception)
     107|     )
     108|
```

**verdict:**

---

## 13. pallets-click — tests/test_context.py:519

**Message:** Bare truthiness assert: `assert result.output.startswith(                                      )`.

```
     514|     logger = logging.getLogger("my_logger")
     515|     assert logger.level == logging.NOTSET
     516|     assert logger.getEffectiveLevel() == logging.WARNING
     517|
     518|     assert not result.exception
>>>  519|     assert result.output.startswith("Usage: messing-with-logger [OPTIONS]")
     520|
     521|
     522| def test_with_resource():
     523|     @contextmanager
     524|     def manager():
```

**verdict:**

---

## 14. pallets-click — tests/test_custom_classes.py:17

**Message:** Bare truthiness assert: `assert isinstance(context, CustomContext)`.

```
      12|     class CustomCommand(click.Command):
      13|         context_class = CustomContext
      14|
      15|     command = CustomCommand("test")
      16|     context = command.make_context("test", [])
>>>   17|     assert isinstance(context, CustomContext)
      18|
      19|
      20| def test_context_invoke_type(runner):
      21|     """A command invoked from a custom context should have a new
      22|     context with the same type.
```

**verdict:**

---

## 15. pallets-click — tests/test_custom_classes.py:35

**Message:** Bare truthiness assert: `assert isinstance(ctx, CustomContext)`.

```
      30|
      31|     @click.command()
      32|     @click.argument("first_id", type=int)
      33|     @click.pass_context
      34|     def second(ctx, first_id):
>>>   35|         assert isinstance(ctx, CustomContext)
      36|         assert id(ctx) != first_id
      37|
      38|     @click.command(cls=CustomCommand)
      39|     @click.pass_context
      40|     def first(ctx):
```

**verdict:**

---

## 16. pallets-click — tests/test_custom_classes.py:41

**Message:** Bare truthiness assert: `assert isinstance(ctx, CustomContext)`.

```
      36|         assert id(ctx) != first_id
      37|
      38|     @click.command(cls=CustomCommand)
      39|     @click.pass_context
      40|     def first(ctx):
>>>   41|         assert isinstance(ctx, CustomContext)
      42|         ctx.invoke(second, first_id=id(ctx))
      43|
      44|     assert not runner.invoke(first).exception
      45|
      46|
```

**verdict:**

---

## 17. pallets-click — tests/test_defaults.py:31

**Message:** Bare truthiness assert: `assert isinstance(foo, expected_type)`.

```
      26|     """
      27|
      28|     @click.command()
      29|     @click.option("--foo", default=default, type=type)
      30|     def cli(foo):
>>>   31|         assert isinstance(foo, expected_type)
      32|         click.echo(f"FOO:[{foo}]")
      33|
      34|     result = runner.invoke(cli, [])
      35|     assert not result.exception
      36|     assert f"FOO:[{expected_output}]" in result.output
```

**verdict:**

---

## 18. pallets-click — tests/test_defaults.py:55

**Message:** Bare truthiness assert: `assert isinstance(item, float)`.

```
      50|
      51|     @click.command()
      52|     @click.option("--foo", default=[23, 42], type=click.FLOAT, multiple=True)
      53|     def cli(foo):
      54|         for item in foo:
>>>   55|             assert isinstance(item, float)
      56|             click.echo(item)
      57|
      58|     result = runner.invoke(cli, [])
      59|     assert not result.exception
      60|     assert result.output.splitlines() == ["23.0", "42.0"]
```

**verdict:**

---

## 19. pallets-click — tests/test_options.py:139

**Message:** Bare truthiness assert: `assert result.exception`.

```
     134|     result = runner.invoke(cli, ["-vvv"])
     135|     assert not result.exception
     136|     assert result.output == "verbosity=3\n"
     137|
     138|     result = runner.invoke(cli, ["-vvvv"])
>>>  139|     assert result.exception
     140|     assert "Invalid value for '-v': 4 is not in the range 0<=x<=3." in result.output
     141|
     142|     result = runner.invoke(cli, [])
     143|     assert not result.exception
     144|     assert result.output == "verbosity=0\n"
```

**verdict:**

---

## 20. pallets-click — tests/test_options.py:157

**Message:** Bare truthiness assert: `assert result.exception`.

```
     152|     @click.command()
     153|     def cli():
     154|         pass
     155|
     156|     result = runner.invoke(cli, [unknown_flag])
>>>  157|     assert result.exception
     158|     assert f"No such option '{unknown_flag}'." in result.output
     159|
     160|
     161| @pytest.mark.parametrize(
     162|     ("value", "expect"),
```

**verdict:**

---
