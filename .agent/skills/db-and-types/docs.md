# Database and Types Documentation

## Supabase CLI usage
If you have the Supabase CLI installed, you can use it to manage your local database.
- `supabase migration new your_migration_name`: Create a new migration file.
- `supabase db reset`: Reset your local database and apply all migrations.

## TypeScript Type Generation
To generate types from your database:
`supabase gen types typescript --local > types/supabase.ts`

## Migration Guidelines
- **Always** use descriptive names for migrations.
- **Always** test your migrations locally before pushing.
- Avoid manual schema changes through the dashboard; favor migrations for reproducibility.

## Folder Structure
- `supabase/migrations/`: SQL files for schema changes.
- `supabase/functions/`: Supabase Edge Functions.
- `types/`: Global TypeScript definitions, including generated database types.
