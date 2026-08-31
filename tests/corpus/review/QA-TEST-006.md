# QA-TEST-006 — Sample Findings for Classification

Total sampled: 2 (max 20 per rule)

Classify each finding as:

- **TP** (True Positive) — the finding is correct, this IS the anti-pattern
- **FP** (False Positive) — the finding is wrong, this is legitimate code
- **UNSURE** — cannot determine without more context

---

## 1. grafana-grafana — public/app/features/alerting/unified/components/contact-points/EditContactPoint.test.tsx:54

**Message:** `jest.retryTimes(2)` enabled.

```
      49|   within(await screen.findByTestId('template-preview')).findByTestId('mockeditor');
      50|
      51| const templatesSelectorTestId = 'existing-templates-selector';
      52|
      53| describe('Edit contact point', () => {
>>>   54|   jest.retryTimes(2);
      55|   it('can edit a contact point with existing template field values', async () => {
      56|     const { user } = renderEditContactPoint('lotsa-emails');
      57|
      58|     // Expand settings and open "edit message template" drawer
      59|     await user.click(await screen.findByText(/optional email settings/i));
```

**verdict:**

---

## 2. grafana-grafana — public/app/features/alerting/unified/components/rule-editor/labels/LabelsField.test.tsx:81

**Message:** `jest.retryTimes(2)` enabled.

```
      76|     mockAlertRuleApi(server).rulerRules(GRAFANA_RULES_SOURCE_NAME, {
      77|       [grafanaRule.namespace.name]: [{ name: grafanaRule.group.name, interval: '1m', rules: [grafanaRule.rulerRule!] }],
      78|     });
      79|   });
      80|
>>>   81|   jest.retryTimes(2);
      82|
      83|   it('Should display two dropdowns with the existing labels', async () => {
      84|     await renderLabelsWithSuggestions();
      85|
      86|     expect(screen.getByTestId('labelsInSubform-key-0').querySelector('input')).toHaveValue('key1');
```

**verdict:**

---
