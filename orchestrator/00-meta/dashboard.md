# Dashboard

> Live overview of the Ten&See knowledge graph.

## Open Decisions

```dataview
TABLE status, impact, decision-needed-by AS "Due"
FROM #decision
WHERE status = "open"
SORT decision-needed-by ASC
```

## Recently Updated

```dataview
TABLE file.mtime AS "Updated"
FROM ""
WHERE file.path != "00-meta/dashboard"
SORT file.mtime DESC
LIMIT 10
```

## Notes by Type

```dataview
TABLE rows.file.link AS "Notes"
FROM ""
WHERE type
GROUP BY type
```

## Orphan Notes (Need Links)

```dataview
LIST
FROM ""
WHERE length(file.inlinks) = 0 AND length(file.outlinks) = 0
AND file.folder != "00-meta"
```

## Backlog by Effort/Impact

```dataview
TABLE effort, impact, status
FROM "05-roadmap"
WHERE type = "idea"
SORT impact DESC, effort ASC
```

---

#tags #meta #dashboard #dataview #live
