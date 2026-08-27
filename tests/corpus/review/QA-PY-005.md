# QA-PY-005 — Sample Findings for Classification

Total sampled: 3 (max 20 per rule)

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
