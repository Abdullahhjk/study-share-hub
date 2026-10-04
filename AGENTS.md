# Project Rules

## Approval policy (mandatory)
- Before finishing, before running a command that may ask for approval, run this command:
```
osascript -e 'display notification \"$1\" with title \"$2\"'
```
where $1 is the message and $2 is the title.
- Do NOT assume anything. Always ask for explicit user approval BEFORE any state-changing action:
  - deploying edge functions
  - pushing / applying database migrations
  - installing packages
  - git operations (commit, push, branch)
  - modifying files beyond the scope the user explicitly requested
- Read-only inspection (reading files, grep, status checks) is allowed without approval.
- If a command produces unexpected output related to schema, roles, or security: STOP, report it, and wait for instructions.

## Supabase workflow (mandatory)
- NEVER hand-edit `src/integrations/supabase/types.ts`. It is auto-generated from the live database by the command below.
- Before ANY type check (`tsc`, IDE/agent type validation, `tsc --noEmit`) and after ANY database change, ALWAYS regenerate the types first:
  ```
  npm run updateSupabase
  ```
- This is mandatory whenever:
  - a migration was applied by you OR by the user (Dashboard, SQL Editor, `db push`, any external tool)
  - any table, view, function, column, enum or RLS policy was added, altered or dropped
  - a new edge function was added or deployed that touches the schema
  - you are about to report on schema, RPC or Supabase type errors
- Run it directly. Do NOT generate into a temporary file and diff it — the redirect already overwrites `types.ts` in place.
- If the command fails, STOP, report the error, and do not type check against stale types.
