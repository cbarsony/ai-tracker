# Human-Centered Code Generation

This skill defines how AI coding agents should generate code in this repository.
The goal is code that mirrors how a human naturally thinks through a problem —
not code that is compact, clever, or pattern-optimized.

---

## Core principle

> Code is written once but read many times.
> The writer has nearly 100% context. The reader starts at nearly 0%.
> Generate code that serves the reader, not the writer.

---

## User-defined rules (strict)

These rules were defined by the repository owner and must be followed strictly.

### 1. Think deeply about sequence

The order in which sub-tasks are executed determines the outcome — often dramatically.
Changing the order of steps is not just an implementation detail; it is architecture.

Before writing any code, reason explicitly about the order of operations:
- What must exist before the next step can begin?
- What happens if this step is moved earlier or later?
- Could a different order produce a simpler result?

**Analogy:** Build the basement first, then the walls, then the roof.
Reversing any step leads to a structurally broken result.

Write code in the order a human would do the task by hand.
Do not reorder steps to be "more efficient" if that breaks the human reasoning chain.

### 2. Long lists are acceptable

Do not collapse long lists into loops, maps, or abstractions just to reduce line count.
If the items are enumerable and their format is consistent, write them out explicitly.

Programmers can scroll. Modern IDEs have instant search.
A 200-line explicit list is not a problem. A 10-line loop that hides logic is.

```js
// Acceptable — format is consistent, items are searchable, meaning is clear
const VALID_STATUSES = [
  "pending",
  "active",
  "paused",
  "cancelled",
  "completed",
  "refunded",
  "disputed",
  "expired",
];
```

### 3. Nested if-else is acceptable

If the logic fits in one flowchart, keep it together.
Do not extract branches into separate functions just to reduce nesting depth.

Extracting nested logic scatters what was originally one coherent decision tree.
The reader then has to mentally reassemble it from multiple locations.

```js
// Acceptable — all cases visible in one place
if (user.isLoggedIn) {
  if (user.hasPermission) {
    if (resource.isAvailable) {
      grantAccess();
    } else {
      showUnavailable();
    }
  } else {
    showForbidden();
  }
} else {
  redirectToLogin();
}
```

### 4. Avoid premature abstraction — strictly

**This is the strictest rule.**

Abstractions are the primary source of reader confusion.
Every abstraction requires the reader to mentally look up its behavior.
Every function call is a question mark until the reader inspects its body.

Do not abstract until:
- The same logic appears at least 3–4 times (see Rule of Four below)
- The abstraction has a name that is more meaningful than the code it replaces
- The abstraction genuinely reduces cognitive load, not just line count

When in doubt: do not abstract. Write it out.

```js
// Prefer this — concrete, traceable, no mental indirection
const emailIsValid = email.includes("@") && email.includes(".");
const nameIsValid = name.length > 0 && name.length <= 100;
const formIsValid = emailIsValid && nameIsValid;

// Avoid this — hides meaning behind a generic abstraction
const formIsValid = validate(form);
```

### 5. Use lots of comments

In this codebase, comments are valuable when they explain the human thinking process.

**Write comments that describe:**
- What the human would think or say at this step
- Why this step comes before the next
- Why a simpler or less elegant approach was chosen

**Also comment when choosing dumber code intentionally:**

```js
// NOTE: A more concise way to write this would be:
//   const result = items.filter(isValid).map(transform);
// We are writing it as a loop instead to make each step visible
// and to allow easier debugging of individual cases.
for (const item of items) {
  if (!isValid(item)) continue;
  result.push(transform(item));
}
```

This kind of comment preserves the knowledge of both approaches.
It tells the reader: "Yes, we know there is a shorter way. We chose not to use it."

### 6. Re-think the whole architecture before every change

Do not just add code or adapt existing patterns.
Before every change, re-read the surrounding code and ask:

- Does this still follow the rules above?
- Is there a simpler order of operations now that I understand the problem better?
- Does the current structure force the next reader to think about too many things at once?
- Is there an abstraction that no longer earns its existence?

**Refactor if needed.** The goal of refactoring here is not performance or DRY compliance —
it is to keep the code aligned with human reasoning.

---

## Foundational principles (selected)

These principles from the broader software engineering literature reinforce the rules above.
They are the conceptual foundation, not additional rules.

### Working memory / 4–7 rule

Human working memory holds approximately 4–7 active items at a time.
Code that requires tracking more than that forces the reader to re-read, backtrack, or context-switch.

**In practice:**
- Each function should require tracking only a small number of variables
- Each block should introduce only one new concept
- If understanding a piece of code requires remembering state from many places, simplify it

### Cognitive load theory

Cognitive load is the mental effort required to process information.
Unnecessary complexity — abstractions, indirect calls, magic methods, hidden state — all add cognitive load without adding value.

**Principle:** Prefer boring, explicit code if it lowers the reader's mental burden.

### WET programming and the Rule of Three/Four

WET stands for "Write Everything Twice" (or three times).
It is the practical counterweight to DRY (Don't Repeat Yourself).

Do not abstract repeated logic until:
- It has appeared at least 3–4 times
- The repeated copies are truly semantically identical, not just syntactically similar
- Abstracting it produces a name that is more meaningful than the code

Duplication is often cheaper than the wrong abstraction.

### AHA — Avoid Hasty Abstractions

> Prefer duplication over the wrong abstraction.

Bad abstraction is worse than repetition because it:
- Hides intent
- Couples unrelated cases under one name
- Forces every future reader to understand a generalization that only appeared necessary in hindsight

Abstract only when the shape of the problem is proven and stable.

### YAGNI — You Aren't Gonna Need It

Do not build flexibility before it is actually needed.

Do not add:
- Configuration systems
- Factories or registries
- Generic interfaces or base classes
- Extension points or plugin hooks
- Reusable utilities for a single use case

Solve the current problem plainly.
Prepare for nothing hypothetical.

### Optimize for reading, not writing

The writer has full context. The reader starts cold.

Code that is easy to write is often compact, idiomatic, and pattern-heavy.
Code that is easy to read is often verbose, explicit, and step-by-step.

Choose the latter.

### Whiteboard-aligned code

Code should preserve the shape of the solution you would draw on a whiteboard.

A whiteboard solution has:
- Named steps in order
- Visible intermediate states
- Limited branching
- No compression of multiple ideas into one symbol

If you cannot explain the code on a whiteboard, the code is too clever.

### Local reasoning

The reader should be able to understand any piece of code without reading the whole system.

Prefer code that:
- Does not depend on distant shared state
- Does not require understanding a chain of abstract base classes
- Does not rely on behavior injected from elsewhere

The answer to "what does this do?" should be visible in the current file.

### Explicit is better than implicit

Show the condition. Show the transformation. Show the side effect.
Do not hide behavior behind conventions, magic methods, decorators, or frameworks.

```js
// Explicit — the reader sees exactly what is happening
const userIsActive = user.status === "active";
const sessionIsValid = session.expiresAt > Date.now();
const canProceed = userIsActive && sessionIsValid;

// Implicit — the reader must look up what isAllowed() actually checks
const canProceed = isAllowed(user, session);
```

### Naming as thinking

Variable and function names should expose the human reasoning chain.
Use names to state the meaning of each step, not just describe the type or shape of data.

```js
// Names that think out loud
const invoiceIsOverdue = invoice.dueDate < today;
const customerHasPaymentMethod = customer.paymentMethod !== null;
const shouldSendReminder = invoiceIsOverdue && !customerHasPaymentMethod;

// Names that say nothing
const flag1 = invoice.dueDate < today;
const flag2 = customer.paymentMethod !== null;
const result = flag1 && !flag2;
```

---

## Summary checklist

Before finalizing any generated code, verify:

- [ ] Does the code follow the natural order a human would do this task by hand?
- [ ] Are all steps visible, or are they hidden inside abstractions?
- [ ] Does any function require holding more than ~7 concepts in mind simultaneously?
- [ ] Were abstractions introduced before the pattern appeared 3–4 times?
- [ ] Are there comments that explain *why* simpler code was chosen when a smarter version exists?
- [ ] Can a new reader trace the entire logic without leaving the current file?
- [ ] Does every variable name describe the human meaning, not just the data shape?
- [ ] Was the architecture reconsidered before the change, not just adapted?
- [ ] Could this code be drawn on a whiteboard as-is?

If any answer is "no", revise the code before finalizing.
