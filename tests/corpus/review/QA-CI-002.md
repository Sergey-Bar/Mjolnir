# QA-CI-002 — Sample Findings for Classification

Total sampled: 1 (max 20 per rule)

Classify each finding as:

- **TP** (True Positive) — the finding is correct, this IS the anti-pattern
- **FP** (False Positive) — the finding is wrong, this is legitimate code
- **UNSURE** — cannot determine without more context

---

## 1. microsoft-playwright-dotnet — .github/workflows/test_docker.yml:45

**Message:** Command exit code is swallowed with `|| true`.

```
      40|     - name: Build Docker image
      41|       run: |
      42|         ARCH="${{ matrix.runs-on == 'ubuntu-24.04-arm' && 'arm64' || 'amd64' }}"
      43|         bash utils/docker/build.sh --$ARCH ${{ matrix.flavor }} playwright-dotnet:localbuild-${{ matrix.flavor }}
      44|     - name: Cleanup
>>>   45|       run: dotnet clean src/ || true
      46|     - name: Test
      47|       # The docker image no longer set DOTNET_ROLL_FORWARD=Major, so net8.0 test binaries cannot run.
      48|       # See https://github.com/dotnet/dotnet-docker/issues/7255 and https://github.com/dotnet/dotnet-docker/pull/7256.
      49|       run: |
      50|         CONTAINER_ID="$(docker run --rm -e CI --ipc=host -v $(pwd):/root/playwright --name playwright-docker-test --workdir /root/playwright/ -e CI -d -t playwright-dotnet:localbuild-${{ matrix.flavor }} /bin/bash)"
```

**verdict:**

---
