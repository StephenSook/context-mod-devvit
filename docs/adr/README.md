# Architecture Decision Records — context-mod-devvit

The 10 load-bearing architectural decisions for this project live in [`/ARCHITECTURE.md`](../../ARCHITECTURE.md). Each section there follows the ADR structure: context → decision → alternatives → consequences → related files.

This directory holds **smaller, narrower decisions** that affect one or two files — design choices that don't rise to the load-bearing-invariant level but are still worth a paper trail.

## Index

(Empty as of v0.3.2. Add new ADRs as `NNNN-kebab-case-title.md` w/ the standard template below. Prior commits to the touched files should also reference the ADR for traceability.)

## Template

```markdown
# NNNN — Short noun-phrase title

**Status:** proposed | accepted | superseded by NNNN | deprecated
**Date:** YYYY-MM-DD
**Contexts:** [link to commit / PR / issue if any]

## Context

What problem are we solving? What forces are in play? 1-3 paragraphs.

## Decision

What did we choose? Specific enough that a future reader can implement.

## Alternatives considered

2-4 bullet points. What did we NOT pick + why?

## Consequences

- Positive
- Negative
- Neutral (knock-on work needed)

## Related files

- `path/to/file.ts:line`
```

## Why this exists

For the heavyweight decisions, [`ARCHITECTURE.md`](../../ARCHITECTURE.md) is the source of truth. But over the lifetime of a project there are dozens of smaller decisions ("we chose `crypto.randomUUID()` over `nanoid`", "we picked Mustache over Handlebars", etc.) that don't deserve a top-level section but still need a "why was this chosen" pointer for the future maintainer who shows up in 6 months and wants to know.

ADRs in this directory are that pointer.

## Cross-references

- Load-bearing invariants: [`/ARCHITECTURE.md`](../../ARCHITECTURE.md)
- Security model: [`/THREAT-MODEL.md`](../../THREAT-MODEL.md)
- Privacy + retention: [`/PRIVACY.md`](../../PRIVACY.md), [`/data-retention.md`](../../data-retention.md)
- API surface: [`/API.md`](../../API.md)
- Visual design: [`/DESIGN.md`](../../DESIGN.md)
- Version history: [`/CHANGELOG.md`](../../CHANGELOG.md)
