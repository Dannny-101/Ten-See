---
type: moc
section: team
created: 2026-06-20
---

# MOC — Team

> Map of Content for people, roles, and culture.

## Topics

- [[04-team/04-01-org-chart|Org Chart]] — Roles, responsibilities
- [[04-team/04-02-meetings|Meetings]] — Cadence, decision log
- [[04-team/04-03-onboarding|Onboarding]] — New hire checklist

## AI Team Member

- Role: 4th team member (read/write vault access)
- Responsibilities: Drafting, analysis, code review, knowledge maintenance
- Limitations: No direct customer-facing without review, no financial/legal decisions

## Active Decisions

```dataview
TABLE status, impact
FROM #decision-needed
WHERE section = "team"
SORT impact DESC
```

## Related MOCs

- [[00-meta/MOC - Operations|Operations]] — The work they do
- [[00-meta/MOC - Roadmap|Roadmap]] — What they're building

---

#tags #moc #team #hub #hiring #ai-team-member
