# QA-PW-112 — Sample Findings for Classification

Total sampled: 20 (max 20 per rule)

Classify each finding as:

- **TP** (True Positive) — the finding is correct, this IS the anti-pattern
- **FP** (False Positive) — the finding is wrong, this is legitimate code
- **UNSURE** — cannot determine without more context

---

## 1. tanstack-query — packages/preact-query/src/**tests**/useQueries.test.tsx:1184

**Message:** test id `fetchStatus1` violates kebab-case convention.

```
    1179|
    1180|     await vi.advanceTimersByTimeAsync(0)
    1181|
    1182|     expect(rendered.getByTestId('status1')).toHaveTextContent('pending')
    1183|     expect(rendered.getByTestId('status2')).toHaveTextContent('pending')
>>> 1184|     expect(rendered.getByTestId('fetchStatus1')).toHaveTextContent('idle')
    1185|     expect(rendered.getByTestId('fetchStatus2')).toHaveTextContent('idle')
    1186|     expect(rendered.getByTestId('data1')).toHaveTextContent('undefined')
    1187|     expect(rendered.getByTestId('data2')).toHaveTextContent('undefined')
    1188|     expect(queryFn1).toHaveBeenCalledTimes(0)
    1189|     expect(queryFn2).toHaveBeenCalledTimes(0)
```

**verdict:**

---

## 2. tanstack-query — packages/preact-query/src/**tests**/useQueries.test.tsx:1185

**Message:** test id `fetchStatus2` violates kebab-case convention.

```
    1180|     await vi.advanceTimersByTimeAsync(0)
    1181|
    1182|     expect(rendered.getByTestId('status1')).toHaveTextContent('pending')
    1183|     expect(rendered.getByTestId('status2')).toHaveTextContent('pending')
    1184|     expect(rendered.getByTestId('fetchStatus1')).toHaveTextContent('idle')
>>> 1185|     expect(rendered.getByTestId('fetchStatus2')).toHaveTextContent('idle')
    1186|     expect(rendered.getByTestId('data1')).toHaveTextContent('undefined')
    1187|     expect(rendered.getByTestId('data2')).toHaveTextContent('undefined')
    1188|     expect(queryFn1).toHaveBeenCalledTimes(0)
    1189|     expect(queryFn2).toHaveBeenCalledTimes(0)
    1190|
```

**verdict:**

---

## 3. tanstack-query — packages/preact-query/src/**tests**/useQueries.test.tsx:1195

**Message:** test id `fetchStatus1` violates kebab-case convention.

```
    1190|
    1191|     await vi.advanceTimersByTimeAsync(11)
    1192|
    1193|     expect(rendered.getByTestId('status1')).toHaveTextContent('pending')
    1194|     expect(rendered.getByTestId('status2')).toHaveTextContent('pending')
>>> 1195|     expect(rendered.getByTestId('fetchStatus1')).toHaveTextContent('idle')
    1196|     expect(rendered.getByTestId('fetchStatus2')).toHaveTextContent('idle')
    1197|     expect(rendered.getByTestId('data1')).toHaveTextContent('undefined')
    1198|     expect(rendered.getByTestId('data2')).toHaveTextContent('undefined')
    1199|     expect(queryFn1).toHaveBeenCalledTimes(0)
    1200|     expect(queryFn2).toHaveBeenCalledTimes(0)
```

**verdict:**

---

## 4. tanstack-query — packages/preact-query/src/**tests**/useQueries.test.tsx:1196

**Message:** test id `fetchStatus2` violates kebab-case convention.

```
    1191|     await vi.advanceTimersByTimeAsync(11)
    1192|
    1193|     expect(rendered.getByTestId('status1')).toHaveTextContent('pending')
    1194|     expect(rendered.getByTestId('status2')).toHaveTextContent('pending')
    1195|     expect(rendered.getByTestId('fetchStatus1')).toHaveTextContent('idle')
>>> 1196|     expect(rendered.getByTestId('fetchStatus2')).toHaveTextContent('idle')
    1197|     expect(rendered.getByTestId('data1')).toHaveTextContent('undefined')
    1198|     expect(rendered.getByTestId('data2')).toHaveTextContent('undefined')
    1199|     expect(queryFn1).toHaveBeenCalledTimes(0)
    1200|     expect(queryFn2).toHaveBeenCalledTimes(0)
    1201|   })
```

**verdict:**

---

## 5. tanstack-query — packages/preact-query/src/**tests**/useQueries.test.tsx:1240

**Message:** test id `fetchStatus1` violates kebab-case convention.

```
    1235|
    1236|     await vi.advanceTimersByTimeAsync(0)
    1237|
    1238|     expect(rendered.getByTestId('status1')).toHaveTextContent('pending')
    1239|     expect(rendered.getByTestId('status2')).toHaveTextContent('pending')
>>> 1240|     expect(rendered.getByTestId('fetchStatus1')).toHaveTextContent('idle')
    1241|     expect(rendered.getByTestId('fetchStatus2')).toHaveTextContent('idle')
    1242|     expect(rendered.getByTestId('data1')).toHaveTextContent('undefined')
    1243|     expect(rendered.getByTestId('data2')).toHaveTextContent('undefined')
    1244|     expect(queryFn1).toHaveBeenCalledTimes(0)
    1245|     expect(queryFn2).toHaveBeenCalledTimes(0)
```

**verdict:**

---

## 6. tanstack-query — packages/preact-query/src/**tests**/useQueries.test.tsx:1241

**Message:** test id `fetchStatus2` violates kebab-case convention.

```
    1236|     await vi.advanceTimersByTimeAsync(0)
    1237|
    1238|     expect(rendered.getByTestId('status1')).toHaveTextContent('pending')
    1239|     expect(rendered.getByTestId('status2')).toHaveTextContent('pending')
    1240|     expect(rendered.getByTestId('fetchStatus1')).toHaveTextContent('idle')
>>> 1241|     expect(rendered.getByTestId('fetchStatus2')).toHaveTextContent('idle')
    1242|     expect(rendered.getByTestId('data1')).toHaveTextContent('undefined')
    1243|     expect(rendered.getByTestId('data2')).toHaveTextContent('undefined')
    1244|     expect(queryFn1).toHaveBeenCalledTimes(0)
    1245|     expect(queryFn2).toHaveBeenCalledTimes(0)
    1246|
```

**verdict:**

---

## 7. tanstack-query — packages/preact-query/src/**tests**/useQueries.test.tsx:1251

**Message:** test id `fetchStatus1` violates kebab-case convention.

```
    1246|
    1247|     await vi.advanceTimersByTimeAsync(11)
    1248|
    1249|     expect(rendered.getByTestId('status1')).toHaveTextContent('pending')
    1250|     expect(rendered.getByTestId('status2')).toHaveTextContent('pending')
>>> 1251|     expect(rendered.getByTestId('fetchStatus1')).toHaveTextContent('idle')
    1252|     expect(rendered.getByTestId('fetchStatus2')).toHaveTextContent('idle')
    1253|     expect(rendered.getByTestId('data1')).toHaveTextContent('undefined')
    1254|     expect(rendered.getByTestId('data2')).toHaveTextContent('undefined')
    1255|     expect(queryFn1).toHaveBeenCalledTimes(0)
    1256|     expect(queryFn2).toHaveBeenCalledTimes(0)
```

**verdict:**

---

## 8. tanstack-query — packages/preact-query/src/**tests**/useQueries.test.tsx:1252

**Message:** test id `fetchStatus2` violates kebab-case convention.

```
    1247|     await vi.advanceTimersByTimeAsync(11)
    1248|
    1249|     expect(rendered.getByTestId('status1')).toHaveTextContent('pending')
    1250|     expect(rendered.getByTestId('status2')).toHaveTextContent('pending')
    1251|     expect(rendered.getByTestId('fetchStatus1')).toHaveTextContent('idle')
>>> 1252|     expect(rendered.getByTestId('fetchStatus2')).toHaveTextContent('idle')
    1253|     expect(rendered.getByTestId('data1')).toHaveTextContent('undefined')
    1254|     expect(rendered.getByTestId('data2')).toHaveTextContent('undefined')
    1255|     expect(queryFn1).toHaveBeenCalledTimes(0)
    1256|     expect(queryFn2).toHaveBeenCalledTimes(0)
    1257|
```

**verdict:**

---

## 9. tanstack-query — packages/preact-query/src/**tests**/useQueries.test.tsx:1262

**Message:** test id `fetchStatus1` violates kebab-case convention.

```
    1257|
    1258|     await vi.advanceTimersByTimeAsync(10)
    1259|
    1260|     expect(rendered.getByTestId('status1')).toHaveTextContent('pending')
    1261|     expect(rendered.getByTestId('status2')).toHaveTextContent('pending')
>>> 1262|     expect(rendered.getByTestId('fetchStatus1')).toHaveTextContent('idle')
    1263|     expect(rendered.getByTestId('fetchStatus2')).toHaveTextContent('idle')
    1264|     expect(rendered.getByTestId('data1')).toHaveTextContent('undefined')
    1265|     expect(rendered.getByTestId('data2')).toHaveTextContent('undefined')
    1266|     expect(queryFn1).toHaveBeenCalledTimes(0)
    1267|     expect(queryFn2).toHaveBeenCalledTimes(0)
```

**verdict:**

---

## 10. tanstack-query — packages/preact-query/src/**tests**/useQueries.test.tsx:1263

**Message:** test id `fetchStatus2` violates kebab-case convention.

```
    1258|     await vi.advanceTimersByTimeAsync(10)
    1259|
    1260|     expect(rendered.getByTestId('status1')).toHaveTextContent('pending')
    1261|     expect(rendered.getByTestId('status2')).toHaveTextContent('pending')
    1262|     expect(rendered.getByTestId('fetchStatus1')).toHaveTextContent('idle')
>>> 1263|     expect(rendered.getByTestId('fetchStatus2')).toHaveTextContent('idle')
    1264|     expect(rendered.getByTestId('data1')).toHaveTextContent('undefined')
    1265|     expect(rendered.getByTestId('data2')).toHaveTextContent('undefined')
    1266|     expect(queryFn1).toHaveBeenCalledTimes(0)
    1267|     expect(queryFn2).toHaveBeenCalledTimes(0)
    1268|   })
```

**verdict:**

---

## 11. tanstack-query — packages/preact-query/src/**tests**/useQuery.test.tsx:6776

**Message:** test id `fetchStatus` violates kebab-case convention.

```
    6771|     )
    6772|
    6773|     await vi.advanceTimersByTimeAsync(0)
    6774|
    6775|     expect(rendered.getByTestId('status')).toHaveTextContent('pending')
>>> 6776|     expect(rendered.getByTestId('fetchStatus')).toHaveTextContent('idle')
    6777|     expect(rendered.getByTestId('data')).toHaveTextContent('undefined')
    6778|     expect(queryFn).toHaveBeenCalledTimes(0)
    6779|
    6780|     await vi.advanceTimersByTimeAsync(11)
    6781|
```

**verdict:**

---

## 12. tanstack-query — packages/preact-query/src/**tests**/useQuery.test.tsx:6783

**Message:** test id `fetchStatus` violates kebab-case convention.

```
    6778|     expect(queryFn).toHaveBeenCalledTimes(0)
    6779|
    6780|     await vi.advanceTimersByTimeAsync(11)
    6781|
    6782|     expect(rendered.getByTestId('status')).toHaveTextContent('pending')
>>> 6783|     expect(rendered.getByTestId('fetchStatus')).toHaveTextContent('idle')
    6784|     expect(rendered.getByTestId('data')).toHaveTextContent('undefined')
    6785|     expect(queryFn).toHaveBeenCalledTimes(0)
    6786|   })
    6787|   it('should retry on mount when throwOnError returns false', async () => {
    6788|     const key = queryKey()
```

**verdict:**

---

## 13. tanstack-query — packages/react-query/src/**tests**/useQueries.test.tsx:1232

**Message:** test id `fetchStatus1` violates kebab-case convention.

```
    1227|
    1228|     await vi.advanceTimersByTimeAsync(0)
    1229|
    1230|     expect(rendered.getByTestId('status1')).toHaveTextContent('pending')
    1231|     expect(rendered.getByTestId('status2')).toHaveTextContent('pending')
>>> 1232|     expect(rendered.getByTestId('fetchStatus1')).toHaveTextContent('idle')
    1233|     expect(rendered.getByTestId('fetchStatus2')).toHaveTextContent('idle')
    1234|     expect(rendered.getByTestId('data1')).toHaveTextContent('undefined')
    1235|     expect(rendered.getByTestId('data2')).toHaveTextContent('undefined')
    1236|     expect(queryFn1).toHaveBeenCalledTimes(0)
    1237|     expect(queryFn2).toHaveBeenCalledTimes(0)
```

**verdict:**

---

## 14. tanstack-query — packages/react-query/src/**tests**/useQueries.test.tsx:1233

**Message:** test id `fetchStatus2` violates kebab-case convention.

```
    1228|     await vi.advanceTimersByTimeAsync(0)
    1229|
    1230|     expect(rendered.getByTestId('status1')).toHaveTextContent('pending')
    1231|     expect(rendered.getByTestId('status2')).toHaveTextContent('pending')
    1232|     expect(rendered.getByTestId('fetchStatus1')).toHaveTextContent('idle')
>>> 1233|     expect(rendered.getByTestId('fetchStatus2')).toHaveTextContent('idle')
    1234|     expect(rendered.getByTestId('data1')).toHaveTextContent('undefined')
    1235|     expect(rendered.getByTestId('data2')).toHaveTextContent('undefined')
    1236|     expect(queryFn1).toHaveBeenCalledTimes(0)
    1237|     expect(queryFn2).toHaveBeenCalledTimes(0)
    1238|
```

**verdict:**

---

## 15. tanstack-query — packages/react-query/src/**tests**/useQueries.test.tsx:1243

**Message:** test id `fetchStatus1` violates kebab-case convention.

```
    1238|
    1239|     await vi.advanceTimersByTimeAsync(11)
    1240|
    1241|     expect(rendered.getByTestId('status1')).toHaveTextContent('pending')
    1242|     expect(rendered.getByTestId('status2')).toHaveTextContent('pending')
>>> 1243|     expect(rendered.getByTestId('fetchStatus1')).toHaveTextContent('idle')
    1244|     expect(rendered.getByTestId('fetchStatus2')).toHaveTextContent('idle')
    1245|     expect(rendered.getByTestId('data1')).toHaveTextContent('undefined')
    1246|     expect(rendered.getByTestId('data2')).toHaveTextContent('undefined')
    1247|     expect(queryFn1).toHaveBeenCalledTimes(0)
    1248|     expect(queryFn2).toHaveBeenCalledTimes(0)
```

**verdict:**

---

## 16. tanstack-query — packages/react-query/src/**tests**/useQueries.test.tsx:1244

**Message:** test id `fetchStatus2` violates kebab-case convention.

```
    1239|     await vi.advanceTimersByTimeAsync(11)
    1240|
    1241|     expect(rendered.getByTestId('status1')).toHaveTextContent('pending')
    1242|     expect(rendered.getByTestId('status2')).toHaveTextContent('pending')
    1243|     expect(rendered.getByTestId('fetchStatus1')).toHaveTextContent('idle')
>>> 1244|     expect(rendered.getByTestId('fetchStatus2')).toHaveTextContent('idle')
    1245|     expect(rendered.getByTestId('data1')).toHaveTextContent('undefined')
    1246|     expect(rendered.getByTestId('data2')).toHaveTextContent('undefined')
    1247|     expect(queryFn1).toHaveBeenCalledTimes(0)
    1248|     expect(queryFn2).toHaveBeenCalledTimes(0)
    1249|   })
```

**verdict:**

---

## 17. tanstack-query — packages/react-query/src/**tests**/useQueries.test.tsx:1288

**Message:** test id `fetchStatus1` violates kebab-case convention.

```
    1283|
    1284|     await vi.advanceTimersByTimeAsync(0)
    1285|
    1286|     expect(rendered.getByTestId('status1')).toHaveTextContent('pending')
    1287|     expect(rendered.getByTestId('status2')).toHaveTextContent('pending')
>>> 1288|     expect(rendered.getByTestId('fetchStatus1')).toHaveTextContent('idle')
    1289|     expect(rendered.getByTestId('fetchStatus2')).toHaveTextContent('idle')
    1290|     expect(rendered.getByTestId('data1')).toHaveTextContent('undefined')
    1291|     expect(rendered.getByTestId('data2')).toHaveTextContent('undefined')
    1292|     expect(queryFn1).toHaveBeenCalledTimes(0)
    1293|     expect(queryFn2).toHaveBeenCalledTimes(0)
```

**verdict:**

---

## 18. tanstack-query — packages/react-query/src/**tests**/useQueries.test.tsx:1289

**Message:** test id `fetchStatus2` violates kebab-case convention.

```
    1284|     await vi.advanceTimersByTimeAsync(0)
    1285|
    1286|     expect(rendered.getByTestId('status1')).toHaveTextContent('pending')
    1287|     expect(rendered.getByTestId('status2')).toHaveTextContent('pending')
    1288|     expect(rendered.getByTestId('fetchStatus1')).toHaveTextContent('idle')
>>> 1289|     expect(rendered.getByTestId('fetchStatus2')).toHaveTextContent('idle')
    1290|     expect(rendered.getByTestId('data1')).toHaveTextContent('undefined')
    1291|     expect(rendered.getByTestId('data2')).toHaveTextContent('undefined')
    1292|     expect(queryFn1).toHaveBeenCalledTimes(0)
    1293|     expect(queryFn2).toHaveBeenCalledTimes(0)
    1294|
```

**verdict:**

---

## 19. tanstack-query — packages/react-query/src/**tests**/useQueries.test.tsx:1299

**Message:** test id `fetchStatus1` violates kebab-case convention.

```
    1294|
    1295|     await vi.advanceTimersByTimeAsync(11)
    1296|
    1297|     expect(rendered.getByTestId('status1')).toHaveTextContent('pending')
    1298|     expect(rendered.getByTestId('status2')).toHaveTextContent('pending')
>>> 1299|     expect(rendered.getByTestId('fetchStatus1')).toHaveTextContent('idle')
    1300|     expect(rendered.getByTestId('fetchStatus2')).toHaveTextContent('idle')
    1301|     expect(rendered.getByTestId('data1')).toHaveTextContent('undefined')
    1302|     expect(rendered.getByTestId('data2')).toHaveTextContent('undefined')
    1303|     expect(queryFn1).toHaveBeenCalledTimes(0)
    1304|     expect(queryFn2).toHaveBeenCalledTimes(0)
```

**verdict:**

---

## 20. tanstack-query — packages/react-query/src/**tests**/useQueries.test.tsx:1300

**Message:** test id `fetchStatus2` violates kebab-case convention.

```
    1295|     await vi.advanceTimersByTimeAsync(11)
    1296|
    1297|     expect(rendered.getByTestId('status1')).toHaveTextContent('pending')
    1298|     expect(rendered.getByTestId('status2')).toHaveTextContent('pending')
    1299|     expect(rendered.getByTestId('fetchStatus1')).toHaveTextContent('idle')
>>> 1300|     expect(rendered.getByTestId('fetchStatus2')).toHaveTextContent('idle')
    1301|     expect(rendered.getByTestId('data1')).toHaveTextContent('undefined')
    1302|     expect(rendered.getByTestId('data2')).toHaveTextContent('undefined')
    1303|     expect(queryFn1).toHaveBeenCalledTimes(0)
    1304|     expect(queryFn2).toHaveBeenCalledTimes(0)
    1305|
```

**verdict:**

---
