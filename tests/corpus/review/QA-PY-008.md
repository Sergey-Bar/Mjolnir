# QA-PY-008 — Sample Findings for Classification

Total sampled: 2 (max 20 per rule)

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
