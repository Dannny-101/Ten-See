# Graph Database

> This vault functions as a **neural knowledge graph**. Notes are neurons. Links are synapses. Tags are neurotransmitters.

## How It Works

| Concept | Implementation |
|---------|---------------|
| **Nodes** | Markdown notes (files) |
| **Edges** | `[[wikilinks]]` between notes |
| **Weights** | Frequency of links, recency of updates |
| **Labels** | YAML frontmatter `tags`, `type`, `status` |
| **Queries** | Dataview plugin (SQL-like over markdown) |
| **Visualization** | Obsidian Graph View (Ctrl/Cmd+G) |

## Graph Schema

### Node Types

| Type | Prefix | Example |
|------|--------|---------|
| `moc` | `MOC - ` | `MOC - Company` |
| `topic` | (none) | `01-01-overview` |
| `person` | (none) | `Danny` (future) |
| `decision` | `DEC - ` | `DEC - Differentiation Strategy` |
| `daily` | `YYYY-MM-DD` | `2026-06-20` |
| `sop` | `SOP - ` | `SOP - Responding to a New Lead` |
| `resource` | `RES - ` | `RES - Property Partner List` |

### Edge Types

| Edge | Syntax | Example |
|------|--------|---------|
| `relates-to` | `[[note\|alias]]` | `See [[01-02-strategy\|our strategy]]` |
| `parent-of` | MOC lists children | MOC - Company → 01-01-overview |
| `depends-on` | Explicit dependency callout | `> Depends on: [[day-11]]` |
| `decided-by` | Decision note links to context | DEC note → strategy discussion |
| `owned-by` | `owner:` in frontmatter | `owner: Danny` |

## Query Language (Dataview)

### List all open decisions
```dataview
TABLE status, date
FROM #decision
WHERE status = "open"
SORT date DESC
```

### Show all notes updated this week
```dataview
TABLE file.mtime AS "Last Modified"
FROM ""
WHERE file.mtime >= date(today) - dur(7 day)
SORT file.mtime DESC
```

### Show all notes by type
```dataview
TABLE type, status
FROM ""
WHERE type
SORT type ASC
```

## Graph View Tips

- **Color groups:** Set in Graph Settings → Groups by path or tag
  - `path:01-company` → Blue
  - `path:02-product` → Green
  - `path:04-team` → Orange
  - `tag:#decision-needed` → Red
- **Filters:** Hide `daily/` and `00-meta/` from graph to reduce noise
- **Local graph:** Open sidebar (Ctrl/Cmd+Shift+G) for current note's neighborhood

## Growing the Graph

1. **Create a note** → it becomes a node
2. **Link it** → `[[existing-note]]` creates an edge
3. **Tag it** → `#student-housing` groups it semantically
4. **Add frontmatter** → `type: decision` makes it queryable
5. **Link back** → bidirectional edges = stronger connections

---

#tags #meta #graph #database #knowledge-graph #neural
