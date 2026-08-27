# QA-JV-106 — Sample Findings for Classification

Total sampled: 20 (max 20 per rule)

Classify each finding as:

- **TP** (True Positive) — the finding is correct, this IS the anti-pattern
- **FP** (False Positive) — the finding is wrong, this is legitimate code
- **UNSURE** — cannot determine without more context

---

## 1. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestDispatchEvent.java:129

**Message:** Brittle selector (id via querySelector).

```
     124|   void shouldDispatchDragDropEvents() {
     125|     page.navigate(server.PREFIX + "/drag-n-drop.html");
     126|     JSHandle dataTransfer = page.evaluateHandle("() => new DataTransfer()");
     127|     page.dispatchEvent("#source", "dragstart", mapOf("dataTransfer", dataTransfer));
     128|     page.dispatchEvent("#target", "drop", mapOf("dataTransfer", dataTransfer));
>>>  129|     ElementHandle source = page.querySelector("#source");
     130|     ElementHandle target = page.querySelector("#target");
     131|     assertEquals(true, page.evaluate("({source, target}) => {\n" +
     132|       "  return source.parentElement === target;\n" +
     133|       "}", mapOf("source", source,"target", target)));
     134|   }
```

**verdict:**

---

## 2. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestDispatchEvent.java:130

**Message:** Brittle selector (id via querySelector).

```
     125|     page.navigate(server.PREFIX + "/drag-n-drop.html");
     126|     JSHandle dataTransfer = page.evaluateHandle("() => new DataTransfer()");
     127|     page.dispatchEvent("#source", "dragstart", mapOf("dataTransfer", dataTransfer));
     128|     page.dispatchEvent("#target", "drop", mapOf("dataTransfer", dataTransfer));
     129|     ElementHandle source = page.querySelector("#source");
>>>  130|     ElementHandle target = page.querySelector("#target");
     131|     assertEquals(true, page.evaluate("({source, target}) => {\n" +
     132|       "  return source.parentElement === target;\n" +
     133|       "}", mapOf("source", source,"target", target)));
     134|   }
     135|
```

**verdict:**

---

## 3. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestDispatchEvent.java:140

**Message:** Brittle selector (id via querySelector).

```
     135|
     136|   @Test
     137|   void shouldDispatchDragDropEventsOnHandle() {
     138|     page.navigate(server.PREFIX + "/drag-n-drop.html");
     139|     JSHandle dataTransfer = page.evaluateHandle("() => new DataTransfer()");
>>>  140|     ElementHandle source = page.querySelector("#source");
     141|     source.dispatchEvent("dragstart", mapOf("dataTransfer", dataTransfer));
     142|     ElementHandle target = page.querySelector("#target");
     143|     target.dispatchEvent("drop", mapOf("dataTransfer", dataTransfer));
     144|     assertEquals(true, page.evaluate("({source, target}) => {\n" +
     145|       "  return source.parentElement === target;\n" +
```

**verdict:**

---

## 4. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestDispatchEvent.java:142

**Message:** Brittle selector (id via querySelector).

```
     137|   void shouldDispatchDragDropEventsOnHandle() {
     138|     page.navigate(server.PREFIX + "/drag-n-drop.html");
     139|     JSHandle dataTransfer = page.evaluateHandle("() => new DataTransfer()");
     140|     ElementHandle source = page.querySelector("#source");
     141|     source.dispatchEvent("dragstart", mapOf("dataTransfer", dataTransfer));
>>>  142|     ElementHandle target = page.querySelector("#target");
     143|     target.dispatchEvent("drop", mapOf("dataTransfer", dataTransfer));
     144|     assertEquals(true, page.evaluate("({source, target}) => {\n" +
     145|       "  return source.parentElement === target;\n" +
     146|       "}", mapOf("source", source,"target", target)));
     147|   }
```

**verdict:**

---

## 5. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestElementHandleBoundingBox.java:85

**Message:** Brittle selector (id via querySelector).

```
      80|   @Test
      81|   void shouldWorkWithSVGNodes() {
      82|     page.setContent("<svg xmlns='http://www.w3.org/2000/svg' width='500' height='500'>\n" +
      83|       "<rect id='theRect' x='30' y='50' width='200' height='300'></rect>\n" +
      84|       "</svg>");
>>>   85|     ElementHandle element = page.querySelector("#therect");
      86|     BoundingBox pwBoundingBox = element.boundingBox();
      87|     @SuppressWarnings("unchecked")
      88|     Map<String, Integer> webBoundingBox = (Map<String, Integer>) page.evaluate("e => {\n" +
      89|       "  const rect = e.getBoundingClientRect();\n" +
      90|       "  return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };\n" +
```

**verdict:**

---

## 6. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestElementHandleContentFrame.java:30

**Message:** Brittle selector (id via querySelector).

```
      25|
      26|   @Test
      27|   void shouldWork() {
      28|     page.navigate(server.EMPTY_PAGE);
      29|     attachFrame(page, "frame1", server.EMPTY_PAGE);
>>>   30|     ElementHandle elementHandle = page.querySelector("#frame1");
      31|     Frame frame = elementHandle.contentFrame();
      32|     assertEquals(page.frames().get(1), frame);
      33|   }
      34|
      35|   @Test
```

**verdict:**

---

## 7. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestElementHandleContentFrame.java:39

**Message:** Brittle selector (id via querySelector).

```
      34|
      35|   @Test
      36|   void shouldWorkForCrossProcessIframes() {
      37|     page.navigate(server.EMPTY_PAGE);
      38|     attachFrame(page, "frame1", server.CROSS_PROCESS_PREFIX + "/empty.html");
>>>   39|     ElementHandle elementHandle = page.querySelector("#frame1");
      40|     Frame frame = elementHandle.contentFrame();
      41|     assertEquals(page.frames().get(1), frame);
      42|   }
      43|
      44|   @Test
```

**verdict:**

---

## 8. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestElementHandleConvenience.java:29

**Message:** Brittle selector (id via querySelector).

```
      24|
      25| public class TestElementHandleConvenience extends TestBase {
      26|   @Test
      27|   void shouldHaveANicePreview() {
      28|     page.navigate(server.PREFIX + "/dom.html");
>>>   29|     ElementHandle outer = page.querySelector("#outer");
      30|     ElementHandle inner = page.querySelector("#inner");
      31|     ElementHandle check = page.querySelector("#check");
      32|     JSHandle text = inner.evaluateHandle("e => e.firstChild");
      33|     page.evaluate("() => 1");  // Give them a chance to calculate the preview.
      34|     assertEquals("JSHandle@<div id=\"outer\" name=\"value\">…</div>", outer.toString());
```

**verdict:**

---

## 9. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestElementHandleConvenience.java:30

**Message:** Brittle selector (id via querySelector).

```
      25| public class TestElementHandleConvenience extends TestBase {
      26|   @Test
      27|   void shouldHaveANicePreview() {
      28|     page.navigate(server.PREFIX + "/dom.html");
      29|     ElementHandle outer = page.querySelector("#outer");
>>>   30|     ElementHandle inner = page.querySelector("#inner");
      31|     ElementHandle check = page.querySelector("#check");
      32|     JSHandle text = inner.evaluateHandle("e => e.firstChild");
      33|     page.evaluate("() => 1");  // Give them a chance to calculate the preview.
      34|     assertEquals("JSHandle@<div id=\"outer\" name=\"value\">…</div>", outer.toString());
      35|     assertEquals("JSHandle@<div id=\"inner\">Text,↵more text</div>", inner.toString());
```

**verdict:**

---

## 10. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestElementHandleConvenience.java:31

**Message:** Brittle selector (id via querySelector).

```
      26|   @Test
      27|   void shouldHaveANicePreview() {
      28|     page.navigate(server.PREFIX + "/dom.html");
      29|     ElementHandle outer = page.querySelector("#outer");
      30|     ElementHandle inner = page.querySelector("#inner");
>>>   31|     ElementHandle check = page.querySelector("#check");
      32|     JSHandle text = inner.evaluateHandle("e => e.firstChild");
      33|     page.evaluate("() => 1");  // Give them a chance to calculate the preview.
      34|     assertEquals("JSHandle@<div id=\"outer\" name=\"value\">…</div>", outer.toString());
      35|     assertEquals("JSHandle@<div id=\"inner\">Text,↵more text</div>", inner.toString());
      36|     assertEquals("JSHandle@#text=Text,↵more text", text.toString());
```

**verdict:**

---

## 11. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestElementHandleConvenience.java:54

**Message:** Brittle selector (id via querySelector).

```
      49|   }
      50|
      51|   @Test
      52|   void getAttributeShouldWork() {
      53|     page.navigate(server.PREFIX + "/dom.html");
>>>   54|     ElementHandle handle = page.querySelector("#outer");
      55|     assertEquals("value", handle.getAttribute("name"));
      56|     assertNull(handle.getAttribute("foo"));
      57|     assertEquals("value", page.getAttribute("#outer", "name"));
      58|     assertNull(page.getAttribute("#outer", "foo"));
      59|   }
```

**verdict:**

---

## 12. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestElementHandleConvenience.java:70

**Message:** Brittle selector (id via querySelector).

```
      65|     page.fill("#textarea", "text value");
      66|     assertEquals("text value", page.inputValue("#textarea"));
      67|
      68|     page.fill("#input", "input value");
      69|     assertEquals("input value", page.inputValue("#input"));
>>>   70|     ElementHandle handle = page.querySelector("#input");
      71|     assertEquals("input value", handle.inputValue());
      72|
      73|     PlaywrightException e = assertThrows(PlaywrightException.class, () -> page.inputValue("#inner"));
      74|     assertTrue(e.getMessage().contains("Node is not an <input>, <textarea> or <select> element"), e.getMessage());
      75|
```

**verdict:**

---

## 13. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestElementHandleConvenience.java:76

**Message:** Brittle selector (id via querySelector).

```
      71|     assertEquals("input value", handle.inputValue());
      72|
      73|     PlaywrightException e = assertThrows(PlaywrightException.class, () -> page.inputValue("#inner"));
      74|     assertTrue(e.getMessage().contains("Node is not an <input>, <textarea> or <select> element"), e.getMessage());
      75|
>>>   76|     ElementHandle handle2 = page.querySelector("#inner");
      77|     e = assertThrows(PlaywrightException.class, () -> handle2.inputValue());
      78|     assertTrue(e.getMessage().contains("Node is not an <input>, <textarea> or <select> element"), e.getMessage());
      79|   }
      80|
      81|   @Test
```

**verdict:**

---

## 14. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestElementHandleConvenience.java:84

**Message:** Brittle selector (id via querySelector).

```
      79|   }
      80|
      81|   @Test
      82|   void innerHTMLShouldWork() {
      83|     page.navigate(server.PREFIX + "/dom.html");
>>>   84|     ElementHandle handle = page.querySelector("#outer");
      85|     assertEquals("<div id=\"inner\">Text,\nmore text</div>", handle.innerHTML());
      86|     assertEquals("<div id=\"inner\">Text,\nmore text</div>", page.innerHTML("#outer"));
      87|   }
      88|
      89|   @Test
```

**verdict:**

---

## 15. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestElementHandleConvenience.java:92

**Message:** Brittle selector (id via querySelector).

```
      87|   }
      88|
      89|   @Test
      90|   void innerTextShouldWork() {
      91|     page.navigate(server.PREFIX + "/dom.html");
>>>   92|     ElementHandle handle = page.querySelector("#inner");
      93|     assertEquals("Text, more text", handle.innerText());
      94|     assertEquals("Text, more text", page.innerText("#inner"));
      95|   }
      96|
      97|   @Test
```

**verdict:**

---

## 16. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestElementHandleConvenience.java:110

**Message:** Brittle selector (id via querySelector).

```
     105|   }
     106|
     107|   @Test
     108|   void textContentShouldWork() {
     109|     page.navigate(server.PREFIX + "/dom.html");
>>>  110|     ElementHandle handle = page.querySelector("#inner");
     111|     assertEquals("Text,\nmore text", handle.textContent());
     112|     assertEquals("Text,\nmore text", page.textContent("#inner"));
     113|   }
     114|
     115|   @Test
```

**verdict:**

---

## 17. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestElementHandleConvenience.java:248

**Message:** Brittle selector (id via querySelector).

```
     243|
     244|   @Test
     245|   void isEditableShouldWork() {
     246|     page.setContent("<input id=input1 disabled><textarea></textarea><input id=input2>");
     247|     page.evalOnSelector("textarea", "t => t.readOnly = true");
>>>  248|     ElementHandle input1 = page.querySelector("#input1");
     249|     assertFalse(input1.isEditable());
     250|     assertFalse(page.isEditable("#input1"));
     251|     ElementHandle input2 = page.querySelector("#input2");
     252|     assertTrue(input2.isEditable());
     253|     assertTrue(page.isEditable("#input2"));
```

**verdict:**

---

## 18. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestElementHandleConvenience.java:251

**Message:** Brittle selector (id via querySelector).

```
     246|     page.setContent("<input id=input1 disabled><textarea></textarea><input id=input2>");
     247|     page.evalOnSelector("textarea", "t => t.readOnly = true");
     248|     ElementHandle input1 = page.querySelector("#input1");
     249|     assertFalse(input1.isEditable());
     250|     assertFalse(page.isEditable("#input1"));
>>>  251|     ElementHandle input2 = page.querySelector("#input2");
     252|     assertTrue(input2.isEditable());
     253|     assertTrue(page.isEditable("#input2"));
     254|     ElementHandle textarea = page.querySelector("textarea");
     255|     assertFalse(textarea.isEditable());
     256|     assertFalse(page.isEditable("textarea"));
```

**verdict:**

---

## 19. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestElementHandleMisc.java:29

**Message:** Brittle selector (id via querySelector).

```
      24|
      25| public class TestElementHandleMisc extends TestBase {
      26|   @Test
      27|   void shouldHover() {
      28|     page.navigate(server.PREFIX + "/input/scrollable.html");
>>>   29|     ElementHandle button = page.querySelector("#button-6");
      30|     button.hover();
      31|     assertEquals("button-6", page.evaluate("document.querySelector('button:hover').id"));
      32|   }
      33|
      34|   @Test
```

**verdict:**

---

## 20. microsoft-playwright-java — playwright/src/test/java/com/microsoft/playwright/TestElementHandleMisc.java:38

**Message:** Brittle selector (id via querySelector).

```
      33|
      34|   @Test
      35|   void shouldHoverWhenNodeIsRemoved() {
      36|     page.navigate(server.PREFIX + "/input/scrollable.html");
      37|     page.evaluate("() => delete window['Node']");
>>>   38|     ElementHandle button = page.querySelector("#button-6");
      39|     button.hover();
      40|     assertEquals("button-6", page.evaluate("document.querySelector('button:hover').id"));
      41|   }
      42|
      43|   @Test
```

**verdict:**

---
