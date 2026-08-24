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
- After running/pushing any migration, ALWAYS regenerate the database types with:
  ```
  npm run updateSupabase
  ```
- NEVER hand-edit `src/integrations/supabase/types.ts`. It is auto-generated from the live database by the command above.
