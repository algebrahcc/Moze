---
name: "supabase-postgres-best-practices"
description: "Postgres performance optimization and best practices from Supabase. Invoke when designing schemas, writing/optimizing SQL, indexing, connection pooling, or RLS policies."
---

# Supabase Postgres Best Practices

Comprehensive performance optimization guide for Postgres, maintained by Supabase. Rules are grouped into 8 categories, prioritized by impact:

1. Query Performance (CRITICAL)
2. Connection Management (CRITICAL)
3. Security & RLS (CRITICAL)
4. Schema Design (HIGH)
5. Concurrency & Locking (MEDIUM-HIGH)
6. Data Access Patterns (MEDIUM)
7. Monitoring & Diagnostics (LOW-MEDIUM)
8. Advanced Features (LOW)

## When To Use

Use this skill when:

- Writing SQL queries or designing schemas
- Implementing indexes or query optimization
- Reviewing database performance issues
- Configuring connection pooling or scaling (serverless included)
- Working with Row-Level Security (RLS)

## How To Use

The canonical reference files live in the upstream repository:

- Repo: https://github.com/supabase/agent-skills
- Skill: skills/supabase-postgres-best-practices/
- References: skills/supabase-postgres-best-practices/references/

Load only the specific reference file(s) you need from upstream and apply the rules to the current task. Avoid loading everything at once.

### Suggested entry points

- references/_sections.md

## References

- https://www.postgresql.org/docs/current/
- https://supabase.com/docs
- https://wiki.postgresql.org/wiki/Performance_Optimization
- https://supabase.com/docs/guides/auth/row-level-security
