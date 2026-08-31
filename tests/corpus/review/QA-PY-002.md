# QA-PY-002 — Sample Findings for Classification

Total sampled: 20 (max 20 per rule)

Classify each finding as:

- **TP** (True Positive) — the finding is correct, this IS the anti-pattern
- **FP** (False Positive) — the finding is wrong, this is legitimate code
- **UNSURE** — cannot determine without more context

---

## 1. pallets-click — tests/test_chain.py:221

**Message:** Skipped test detected: `non-strict xfail`.

```
     216|     result = runner.invoke(cli, ["foo", "a"])
     217|     assert not result.exception
     218|     assert result.output.splitlines() == ["cli:foo", "a"]
     219|
     220|
>>>  221| @pytest.mark.xfail
     222| def test_group_chaining(runner):
     223|     @click.group(chain=True)
     224|     def cli():
     225|         debug()
     226|
```

**verdict:**

---

## 2. pytest-dev-pytest — testing/_py/test_local.py:809

**Message:** Skipped test detected: `non-strict xfail`.

```
     804|         newfile = tmpdir.join("ação", "ディレクトリ")
     805|         t = newfile.ensure(dir=1)
     806|         assert t == newfile
     807|         assert newfile.check(dir=1)
     808|
>>>  809|     @pytest.mark.xfail(run=False, reason="unreliable est for long filenames")
     810|     def test_long_filenames(self, tmpdir):
     811|         if sys.platform == "win32":
     812|             pytest.skip("win32: work around needed for path length limit")
     813|         # see http://codespeak.net/pipermail/py-dev/2008q2/000922.html
     814|
```

**verdict:**

---

## 3. pytest-dev-pytest — testing/_py/test_local.py:867

**Message:** Skipped test detected: `non-strict xfail`.

```
     862|         assert py_path.check(endswith=str_path)
     863|         assert py_path.join(fake_fspath_obj).strpath == os.path.join(
     864|             py_path.strpath, str_path
     865|         )
     866|
>>>  867|     @pytest.mark.xfail(
     868|         reason="#11603", raises=(error.EEXIST, error.ENOENT), strict=False
     869|     )
     870|     def test_make_numbered_dir_multiprocess_safe(self, tmpdir):
     871|         # https://github.com/pytest-dev/py/issues/30
     872|         with multiprocessing.Pool() as pool:
```

**verdict:**

---

## 4. pytest-dev-pytest — testing/_py/test_local.py:1543

**Message:** Skipped test detected: `non-strict xfail`.

```
    1538|         x = local(tmpdir.strpath)
    1539|         part = "hällo"
    1540|         y = x.ensure(part)
    1541|         assert x.listdir(part)[0] == y
    1542|
>>> 1543|     @pytest.mark.xfail(reason="changing read/write might break existing usages")
    1544|     def test_read_write(self, tmpdir):
    1545|         x = tmpdir.join("hello")
    1546|         part = "hällo"
    1547|         with ignore_encoding_warning():
    1548|             x.write(part)
```

**verdict:**

---

## 5. pytest-dev-pytest — testing/acceptance_test.py:888

**Message:** Skipped test detected: `non-strict xfail`.

```
     883|     def test_cmdline_python_package_not_exists(self, pytester: Pytester) -> None:
     884|         result = pytester.runpytest("--pyargs", "tpkgwhatv")
     885|         assert result.ret
     886|         result.stderr.fnmatch_lines(["ERROR*module*or*package*not*found*"])
     887|
>>>  888|     @pytest.mark.xfail(reason="decide: feature or bug")
     889|     def test_noclass_discovery_if_not_testcase(self, pytester: Pytester) -> None:
     890|         testpath = pytester.makepyfile(
     891|             """
     892|             import unittest
     893|             class TestHello(object):
```

**verdict:**

---

## 6. pytest-dev-pytest — testing/acceptance_test.py:1654

**Message:** Skipped test detected: `@pytest.mark.skip`.

```
    1649|     )
    1650|     result = pytester.runpytest_subprocess()
    1651|     result.stdout.fnmatch_lines("*1 passed*")
    1652|
    1653|
>>> 1654| @pytest.mark.skip(reason="Test is not isolated")
    1655| def test_issue_9765(pytester: Pytester) -> None:
    1656|     """Reproducer for issue #9765 on Windows
    1657|
    1658|     https://github.com/pytest-dev/pytest/issues/9765
    1659|     """
```

**verdict:**

---

## 7. pytest-dev-pytest — testing/test_capture.py:182

**Message:** Skipped test detected: `non-strict xfail`.

```
     177|                 "setup test_func2*",
     178|                 "in func2*",
     179|             ]
     180|         )
     181|
>>>  182|     @pytest.mark.xfail(reason="unimplemented feature")
     183|     def test_capture_scope_cache(self, pytester: Pytester) -> None:
     184|         p = pytester.makepyfile(
     185|             """
     186|             import sys
     187|             def setup_module(func):
```

**verdict:**

---

## 8. pytest-dev-pytest — testing/test_collection.py:325

**Message:** Skipped test detected: `non-strict xfail`.

```
     320|         )
     321|
     322|         result = pytester.runpytest(p)
     323|         result.stdout.fnmatch_lines(["*ERROR collecting*", "*hello world*"])
     324|
>>>  325|     @pytest.mark.xfail(reason="other mechanism for adding to reporting needed")
     326|     def test_collect_report_postprocessing(self, pytester: Pytester) -> None:
     327|         p = pytester.makepyfile(
     328|             """
     329|             import not_exists
     330|         """
```

**verdict:**

---

## 9. pytest-dev-pytest — testing/test_config.py:378

**Message:** Skipped test detected: `non-strict xfail`.

```
     373|         sub = pytester.mkdir("sub")
     374|         os.chdir(sub)
     375|         config = pytester.parseconfigure()
     376|         assert config.pluginmanager._confcutdir == pytester.path
     377|
>>>  378|     @pytest.mark.xfail(reason="probably not needed")
     379|     def test_confcutdir(self, pytester: Pytester) -> None:
     380|         sub = pytester.mkdir("sub")
     381|         os.chdir(sub)
     382|         pytester.makeini(
     383|             """
```

**verdict:**

---

## 10. pytest-dev-pytest — testing/test_debugging.py:402

**Message:** Skipped test detected: `non-strict xfail`.

```
     397|         )
     398|
     399|         result = pytester.runpytest_subprocess("--pdb", ".")
     400|         result.stdout.fnmatch_lines(["-> import unknown"])
     401|
>>>  402|     @pytest.mark.xfail(reason="#10042", strict=False)
     403|     def test_pdb_interaction_capturing_simple(self, pytester: Pytester) -> None:
     404|         p1 = pytester.makepyfile(
     405|             """
     406|             import pytest
     407|             def test_1():
```

**verdict:**

---

## 11. pytest-dev-pytest — testing/test_debugging.py:571

**Message:** Skipped test detected: `non-strict xfail`.

```
     566|         assert "! _pytest.outcomes.Exit: Quitting debugger !" in rest
     567|         assert "= no tests ran in" in rest
     568|         assert "BdbQuit" not in rest
     569|         assert "UNEXPECTED EXCEPTION" not in rest
     570|
>>>  571|     @pytest.mark.xfail(reason="#10042", strict=False)
     572|     def test_pdb_interaction_capturing_twice(self, pytester: Pytester) -> None:
     573|         p1 = pytester.makepyfile(
     574|             """
     575|             import pytest
     576|             def test_1():
```

**verdict:**

---

## 12. pytest-dev-pytest — testing/test_debugging.py:607

**Message:** Skipped test detected: `non-strict xfail`.

```
     602|         assert "hello17" in rest  # out is captured
     603|         assert "hello18" in rest  # out is captured
     604|         assert "1 failed" in rest
     605|         self.flush(child)
     606|
>>>  607|     @pytest.mark.xfail(reason="#10042", strict=False)
     608|     def test_pdb_with_injected_do_debug(self, pytester: Pytester) -> None:
     609|         """Simulates pdbpp, which injects Pdb into do_debug, and uses
     610|         self.__class__ in do_continue.
     611|         """
     612|         p1 = pytester.makepyfile(
```

**verdict:**

---

## 13. pytest-dev-pytest — testing/test_debugging.py:1123

**Message:** Skipped test detected: `non-strict xfail`.

```
    1118|         rest = child.read().decode("utf8")
    1119|         assert "Quitting debugger" in rest
    1120|         assert "reading from stdin while output" not in rest
    1121|         TestPDB.flush(child)
    1122|
>>> 1123|     @pytest.mark.xfail(reason="#10042", strict=False)
    1124|     def test_pdb_not_altered(self, pytester: Pytester) -> None:
    1125|         p1 = pytester.makepyfile(
    1126|             """
    1127|             import pdb
    1128|             def test_1():
```

**verdict:**

---

## 14. pytest-dev-pytest — testing/test_debugging.py:1283

**Message:** Skipped test detected: `non-strict xfail`.

```
    1278|     assert "no tests ran" in rest
    1279|     TestPDB.flush(child)
    1280|
    1281|
    1282| @pytest.mark.parametrize("fixture", ("capfd", "capsys"))
>>> 1283| @pytest.mark.xfail(reason="#10042", strict=False)
    1284| def test_pdb_suspends_fixture_capturing(pytester: Pytester, fixture: str) -> None:
    1285|     """Using "-s" with pytest should suspend/resume fixture capturing."""
    1286|     p1 = pytester.makepyfile(
    1287|         f"""
    1288|         def test_inner({fixture}):
```

**verdict:**

---

## 15. pytest-dev-pytest — testing/test_debugging.py:1382

**Message:** Skipped test detected: `non-strict xfail`.

```
    1377|     )
    1378|     assert result.ret == 0
    1379|     result.stdout.fnmatch_lines(["*runcall_called*", "* 1 passed in *"])
    1380|
    1381|
>>> 1382| @pytest.mark.xfail(
    1383|     sys.version_info >= (3, 14),
    1384|     reason="C-D now quits the test session, rather than failing the test. See https://github.com/python/cpython/issues/124703",
    1385| )
    1386| def test_raises_bdbquit_with_eoferror(pytester: Pytester) -> None:
    1387|     """It is not guaranteed that DontReadFromInput's read is called."""
```

**verdict:**

---

## 16. pytest-dev-pytest — testing/test_mark.py:1035

**Message:** Skipped test detected: `non-strict xfail`.

```
    1030|         )
    1031|         reprec = pytester.inline_run("-k", "mykeyword", p)
    1032|         _passed, _skipped, failed = reprec.countoutcomes()
    1033|         assert failed == 1
    1034|
>>> 1035|     @pytest.mark.xfail
    1036|     def test_keyword_extra_dash(self, pytester: Pytester) -> None:
    1037|         p = pytester.makepyfile(
    1038|             """
    1039|            def test_one():
    1040|                assert 0
```

**verdict:**

---

## 17. pytest-dev-pytest — testing/test_runner.py:600

**Message:** Skipped test detected: `non-strict xfail`.

```
     595|
     596| # design question: do we want general hooks in python files?
     597| # then something like the following functional tests makes sense
     598|
     599|
>>>  600| @pytest.mark.xfail
     601| def test_runtest_in_module_ordering(pytester: Pytester) -> None:
     602|     p1 = pytester.makepyfile(
     603|         """
     604|         import pytest
     605|         def pytest_runtest_setup(item): # runs after class-level!
```

**verdict:**

---

## 18. pytest-dev-pytest — testing/test_terminal.py:1762

**Message:** Skipped test detected: `non-strict xfail`.

```
    1757|         assert "!stdout!" not in result
    1758|         assert "!stderr!" not in result
    1759|         assert "!log!" not in result
    1760|
    1761|
>>> 1762| @pytest.mark.xfail("not hasattr(os, 'dup')")
    1763| def test_fdopen_kept_alive_issue124(pytester: Pytester) -> None:
    1764|     pytester.makepyfile(
    1765|         """
    1766|         import os, sys
    1767|         k = []
```

**verdict:**

---

## 19. pytest-dev-pytest — testing/test_warnings.py:153

**Message:** Skipped test detected: `@pytest.mark.skip`.

```
     148|             "* 1 passed, 1 warning*",
     149|         ]
     150|     )
     151|
     152|
>>>  153| @pytest.mark.skip("issue #13485")
     154| def test_works_with_filterwarnings(pytester: Pytester) -> None:
     155|     """Ensure our warnings capture does not mess with pre-installed filters (#2430)."""
     156|     pytester.makepyfile(
     157|         """
     158|         import warnings
```

**verdict:**

---

## 20. pytest-dev-pytest — testing/test_warnings.py:566

**Message:** Skipped test detected: `@pytest.mark.skip`.

```
     561|                 "Invalid regex '[*]': nothing to repeat at position 0",
     562|             ]
     563|         )
     564|
     565|
>>>  566| @pytest.mark.skip("not relevant until pytest 10.0")
     567| @pytest.mark.parametrize("change_default", [None, "ini", "cmdline"])
     568| def test_removed_in_x_warning_as_error(pytester: Pytester, change_default) -> None:
     569|     """This ensures that PytestRemovedInXWarnings raised by pytest are turned into errors.
     570|
     571|     This test should be enabled as part of each major release, and skipped again afterwards
```

**verdict:**

---
