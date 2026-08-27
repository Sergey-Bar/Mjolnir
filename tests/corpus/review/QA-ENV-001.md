# QA-ENV-001 — Sample Findings for Classification

Total sampled: 20 (max 20 per rule)

Classify each finding as:

- **TP** (True Positive) — the finding is correct, this IS the anti-pattern
- **FP** (False Positive) — the finding is wrong, this is legitimate code
- **UNSURE** — cannot determine without more context

---

## 1. pallets-click — tests/test_defaults.py:287

**Message:** Environment coupling (OS path): `"/tmp/file"`.

```
     282|                 "value": value,
     283|                 "source": ctx.get_parameter_source(param.name),
     284|             }
     285|
     286|     @click.command()
>>>  287|     @click.option("--default", type=Source(), default="/tmp/file")
     288|     @click.option("--nodefault", type=Source())
     289|     def cli(default, nodefault):
     290|         click.echo(f"default: {default}")
     291|         click.echo(f"nodefault: {nodefault}")
     292|
```

**verdict:**

---

## 2. pallets-click — tests/test_defaults.py:295

**Message:** Environment coupling (OS path): `'/tmp/file'`.

```
     290|         click.echo(f"default: {default}")
     291|         click.echo(f"nodefault: {nodefault}")
     292|
     293|     result = runner.invoke(cli, [])
     294|     assert not result.exception
>>>  295|     assert "default: {'value': '/tmp/file', 'source': " in result.output
     296|     assert "'source': None}" not in result.output.split("default:")[1].split("\n")[0]
     297|     assert (
     298|         result.output == "default: {'value': '/tmp/file', 'source': "
     299|         f"{ParameterSource.DEFAULT!r}}}\nnodefault: None\n"
     300|     )
```

**verdict:**

---

## 3. pallets-click — tests/test_defaults.py:298

**Message:** Environment coupling (OS path): `'/tmp/file'`.

```
     293|     result = runner.invoke(cli, [])
     294|     assert not result.exception
     295|     assert "default: {'value': '/tmp/file', 'source': " in result.output
     296|     assert "'source': None}" not in result.output.split("default:")[1].split("\n")[0]
     297|     assert (
>>>  298|         result.output == "default: {'value': '/tmp/file', 'source': "
     299|         f"{ParameterSource.DEFAULT!r}}}\nnodefault: None\n"
     300|     )
     301|
     302|     result = runner.invoke(cli, ["--default", "cli", "--nodefault", "also"])
     303|     assert not result.exception
```

**verdict:**

---

## 4. pallets-click — tests/test_termui.py:481

**Message:** Environment coupling (OS path): `"C:\\Program Files\\Sublime Text 3\\sublime_text.e`.

```
     476|             ["vi", 'file"; rm -rf / ; echo "'],
     477|             id="shell metacharacters in filename",
     478|         ),
     479|         # Issue #1026: editor path with spaces must be quoted.
     480|         pytest.param(
>>>  481|             '"C:\\Program Files\\Sublime Text 3\\sublime_text.exe"',
     482|             ["f.txt"],
     483|             ["C:\\Program Files\\Sublime Text 3\\sublime_text.exe", "f.txt"],
     484|             id="quoted windows path with spaces",
     485|         ),
     486|         # PR #1477: pager/editor command with flags, like ``less -FRSX``.
```

**verdict:**

---

## 5. pallets-click — tests/test_termui.py:483

**Message:** Environment coupling (OS path): `"C:\\Program Files\\Sublime Text 3\\sublime_text.e`.

```
     478|         ),
     479|         # Issue #1026: editor path with spaces must be quoted.
     480|         pytest.param(
     481|             '"C:\\Program Files\\Sublime Text 3\\sublime_text.exe"',
     482|             ["f.txt"],
>>>  483|             ["C:\\Program Files\\Sublime Text 3\\sublime_text.exe", "f.txt"],
     484|             id="quoted windows path with spaces",
     485|         ),
     486|         # PR #1477: pager/editor command with flags, like ``less -FRSX``.
     487|         pytest.param(
     488|             "less -FRSX",
```

**verdict:**

---

## 6. pallets-click — tests/test_termui.py:579

**Message:** Environment coupling (OS path): `"C:\\Program Files\\Sublime Text 3\\sublime_text.e`.

```
     574|             "notepad",
     575|             ["notepad"],
     576|             id="plain notepad",
     577|         ),
     578|         pytest.param(
>>>  579|             '"C:\\Program Files\\Sublime Text 3\\sublime_text.exe" --wait',
     580|             ["C:\\Program Files\\Sublime Text 3\\sublime_text.exe", "--wait"],
     581|             id="quoted path with flag",
     582|         ),
     583|     ],
     584| )
```

**verdict:**

---

## 7. pallets-click — tests/test_termui.py:580

**Message:** Environment coupling (OS path): `"C:\\Program Files\\Sublime Text 3\\sublime_text.e`.

```
     575|             ["notepad"],
     576|             id="plain notepad",
     577|         ),
     578|         pytest.param(
     579|             '"C:\\Program Files\\Sublime Text 3\\sublime_text.exe" --wait',
>>>  580|             ["C:\\Program Files\\Sublime Text 3\\sublime_text.exe", "--wait"],
     581|             id="quoted path with flag",
     582|         ),
     583|     ],
     584| )
     585| def test_editor_windows_path_normalization(editor_cmd, expected_cmd):
```

**verdict:**

---

## 8. pallets-click — tests/test_termui.py:635

**Message:** Environment coupling (OS path): `"C:\\Program Files\\Git\\usr\\bin\\less.exe"`.

```
     630|         pytest.param("  less  ", ["less"], id="leading and trailing spaces"),
     631|         pytest.param("less\t-R", ["less", "-R"], id="tab as separator"),
     632|         # Quoted Windows paths: quotes are stripped in POSIX mode (the
     633|         # default), preserving backslashes inside quoted tokens (issue #1026).
     634|         pytest.param(
>>>  635|             '"C:\\Program Files\\Git\\usr\\bin\\less.exe"',
     636|             ["C:\\Program Files\\Git\\usr\\bin\\less.exe"],
     637|             id="quoted windows path with spaces",
     638|         ),
     639|         pytest.param(
     640|             '"C:\\Program Files\\Git\\usr\\bin\\less.exe" -R',
```

**verdict:**

---

## 9. pallets-click — tests/test_termui.py:636

**Message:** Environment coupling (OS path): `"C:\\Program Files\\Git\\usr\\bin\\less.exe"`.

```
     631|         pytest.param("less\t-R", ["less", "-R"], id="tab as separator"),
     632|         # Quoted Windows paths: quotes are stripped in POSIX mode (the
     633|         # default), preserving backslashes inside quoted tokens (issue #1026).
     634|         pytest.param(
     635|             '"C:\\Program Files\\Git\\usr\\bin\\less.exe"',
>>>  636|             ["C:\\Program Files\\Git\\usr\\bin\\less.exe"],
     637|             id="quoted windows path with spaces",
     638|         ),
     639|         pytest.param(
     640|             '"C:\\Program Files\\Git\\usr\\bin\\less.exe" -R',
     641|             ["C:\\Program Files\\Git\\usr\\bin\\less.exe", "-R"],
```

**verdict:**

---

## 10. pallets-click — tests/test_termui.py:640

**Message:** Environment coupling (OS path): `"C:\\Program Files\\Git\\usr\\bin\\less.exe"`.

```
     635|             '"C:\\Program Files\\Git\\usr\\bin\\less.exe"',
     636|             ["C:\\Program Files\\Git\\usr\\bin\\less.exe"],
     637|             id="quoted windows path with spaces",
     638|         ),
     639|         pytest.param(
>>>  640|             '"C:\\Program Files\\Git\\usr\\bin\\less.exe" -R',
     641|             ["C:\\Program Files\\Git\\usr\\bin\\less.exe", "-R"],
     642|             id="quoted windows path with flag",
     643|         ),
     644|         # Single-quoted path.
     645|         pytest.param(
```

**verdict:**

---

## 11. pallets-click — tests/test_termui.py:641

**Message:** Environment coupling (OS path): `"C:\\Program Files\\Git\\usr\\bin\\less.exe"`.

```
     636|             ["C:\\Program Files\\Git\\usr\\bin\\less.exe"],
     637|             id="quoted windows path with spaces",
     638|         ),
     639|         pytest.param(
     640|             '"C:\\Program Files\\Git\\usr\\bin\\less.exe" -R',
>>>  641|             ["C:\\Program Files\\Git\\usr\\bin\\less.exe", "-R"],
     642|             id="quoted windows path with flag",
     643|         ),
     644|         # Single-quoted path.
     645|         pytest.param(
     646|             "'/usr/local/bin/my pager'",
```

**verdict:**

---

## 12. pallets-click — tests/test_termui.py:660

**Message:** Environment coupling (OS path): `"C:\\path\\to\\exe /test other\\path"`.

```
     655|             id="escaped space in unix path",
     656|         ),
     657|         # PR #1477: POSIX mode (the default) eats unquoted backslashes.
     658|         # On Windows, users must quote paths that contain backslashes.
     659|         pytest.param(
>>>  660|             "C:\\path\\to\\exe /test other\\path",
     661|             ["C:pathtoexe", "/test", "otherpath"],
     662|             id="unquoted backslashes eaten in POSIX mode",
     663|         ),
     664|     ],
     665| )
```

**verdict:**

---

## 13. pallets-click — tests/test_termui.py:1179

**Message:** Environment coupling (OS path): `C:\\Program Files`.

```
    1174|     probes are faked to exercise it from any runner.
    1175|
    1176|     ``PAGER`` is set to the bare command name, not to the path
    1177|     :func:`shutil.which` resolves it to. ``pager()`` splits ``PAGER`` with
    1178|     :func:`shlex.split` in POSIX mode, where a Windows path loses its
>>> 1179|     backslashes and splits on the space in ``C:\\Program Files``, leaving a
    1180|     command that resolves to nothing. Click resolves the bare name itself.
    1181|     """
    1182|     cmd = shlex.split(pager_cmd)[0]
    1183|     assert shutil.which(cmd) is not None, f"{cmd} not available"
    1184|     monkeypatch.setattr(click._termui_impl, "isatty", lambda _: True)
```

**verdict:**

---

## 14. pytest-dev-pytest — testing/test_assertrewrite.py:2359

**Message:** Environment coupling (OS path): `"/tmp/pycs"`.

```
    2354|     @pytest.mark.parametrize(
    2355|         "prefix, source, expected",
    2356|         [
    2357|             ("c:/tmp/pycs", "d:/projects/src/foo.py", "c:/tmp/pycs/projects/src"),
    2358|             (None, "d:/projects/src/foo.py", "d:/projects/src/__pycache__"),
>>> 2359|             ("/tmp/pycs", "/home/projects/src/foo.py", "/tmp/pycs/home/projects/src"),
    2360|             (None, "/home/projects/src/foo.py", "/home/projects/src/__pycache__"),
    2361|         ],
    2362|     )
    2363|     def test_get_cache_dir(self, monkeypatch, prefix, source, expected) -> None:
    2364|         monkeypatch.delenv("PYTHONPYCACHEPREFIX", raising=False)
```

**verdict:**

---

## 15. pytest-dev-pytest — testing/test_assertrewrite.py:2359

**Message:** Environment coupling (OS path): `"/tmp/pycs/home/projects/src"`.

```
    2354|     @pytest.mark.parametrize(
    2355|         "prefix, source, expected",
    2356|         [
    2357|             ("c:/tmp/pycs", "d:/projects/src/foo.py", "c:/tmp/pycs/projects/src"),
    2358|             (None, "d:/projects/src/foo.py", "d:/projects/src/__pycache__"),
>>> 2359|             ("/tmp/pycs", "/home/projects/src/foo.py", "/tmp/pycs/home/projects/src"),
    2360|             (None, "/home/projects/src/foo.py", "/home/projects/src/__pycache__"),
    2361|         ],
    2362|     )
    2363|     def test_get_cache_dir(self, monkeypatch, prefix, source, expected) -> None:
    2364|         monkeypatch.delenv("PYTHONPYCACHEPREFIX", raising=False)
```

**verdict:**

---

## 16. pytest-dev-pytest — testing/test_nodes.py:122

**Message:** Environment coupling (OS path): `"C:\\Users\\test\\project"`.

```
     117|         """Empty string returns empty string."""
     118|         assert nodes.norm_sep("") == ""
     119|
     120|     def test_windows_absolute_path(self) -> None:
     121|         """Windows absolute paths have backslashes converted."""
>>>  122|         assert nodes.norm_sep("C:\\Users\\test\\project") == "C:/Users/test/project"
     123|
     124|
     125| def test__check_initialpaths_for_relpath() -> None:
     126|     """Ensure that it handles dirs, and does not always use dirname."""
     127|     cwd = Path.cwd()
```

**verdict:**

---

## 17. pytest-dev-pytest — testing/test_terminal.py:3419

**Message:** Environment coupling (OS path): `"C:\\\\path"`.

```
    3414|         test_path.write_text(
    3415|             textwrap.dedent(
    3416|                 """
    3417|                 import pytest
    3418|
>>> 3419|                 @pytest.mark.parametrize("a", ["x/y", "C:/path", "\\\\", "C:\\\\path", "a::b/"])
    3420|                 def test_x(a):
    3421|                     assert False
    3422|                 """
    3423|             ),
    3424|             encoding="utf-8",
```

**verdict:**

---

## 18. psf-requests — tests/test_adapters.py:7

**Message:** Environment coupling (fixed port): `127.0.0.1:10000`.

```
       2|
       3|
       4| def test_request_url_handles_leading_path_separators():
       5|     """See also https://github.com/psf/requests/issues/6643."""
       6|     a = requests.adapters.HTTPAdapter()
>>>    7|     p = requests.Request(method="GET", url="http://127.0.0.1:10000//v:h").prepare()
       8|     assert "//v:h" == a.request_url(p, {})
       9|
```

**verdict:**

---

## 19. psf-requests — tests/test_requests.py:103

**Message:** Environment coupling (fixed port): `localhost:3128`.

```
      98|
      99|     @pytest.mark.parametrize(
     100|         "exception, url",
     101|         (
     102|             (MissingSchema, "hiwpefhipowhefopw"),
>>>  103|             (InvalidSchema, "localhost:3128"),
     104|             (InvalidSchema, "localhost.localdomain:3128/"),
     105|             (InvalidSchema, "10.122.1.1:3128/"),
     106|             (InvalidURL, "http://"),
     107|             (InvalidURL, "http://*example.com"),
     108|             (InvalidURL, "http://.example.com"),
```

**verdict:**

---

## 20. psf-requests — tests/test_requests.py:674

**Message:** Environment coupling (fixed port): `localhost:8080`.

```
     669|     def test_proxy_authorization_not_appended_to_https_request(
     670|         self, url, has_proxy_auth
     671|     ):
     672|         session = requests.Session()
     673|         proxies = {
>>>  674|             "http": "http://test:pass@localhost:8080",
     675|             "https": "http://test:pass@localhost:8090",
     676|         }
     677|         req = requests.Request("GET", url)
     678|         prep = req.prepare()
     679|         session.rebuild_proxies(prep, proxies)
```

**verdict:**

---
