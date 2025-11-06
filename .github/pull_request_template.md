## Description

<!-- Provide a clear description of what this PR does and why it's needed. Link to related issue(s). -->

Closes #<!-- issue number -->

## Type of Change

<!-- Check all that apply -->

- [ ] `feat`: New feature
- [ ] `fix`: Bug fix
- [ ] `chore`: Maintenance (dependencies, config, etc.)
- [ ] `docs`: Documentation only
- [ ] `refactor`: Code refactoring (no functional changes)
- [ ] `test`: Adding or updating tests
- [ ] `perf`: Performance improvement

## Risk Level

<!-- Select one and provide details if high -->

- [ ] `low` - Low risk change (docs, tests, minor refactors)
- [ ] `medium` - Moderate risk (new features, non-critical fixes)
- [ ] `high` - High risk (migrations, infra changes, breaking changes)

<!-- If high risk, describe why and what could go wrong -->

## Testing

<!-- Describe how you tested this change -->

- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed
- [ ] E2E tests added/updated (if applicable)

**Testing evidence:**
<!-- Add screenshots, test results, or describe manual testing steps -->

## Rollback Plan

<!-- Required for high-risk PRs. Describe how to revert if deployment fails. -->

<!-- For migrations: include down migration SQL or restore steps -->
<!-- For infra changes: describe how to rollback configuration -->
<!-- For other changes: describe git revert steps -->

## Database Changes

<!-- Check if applicable -->

- [ ] No database changes
- [ ] Migration included (idempotent)
- [ ] Migration includes down migration
- [ ] Database backup created (see `backups/` directory)
- [ ] Checkpoint tag created: `checkpoint/<date>-<topic>`

**Migration file:** `supabase/migrations/<!-- filename -->`

## Checklist

<!-- Ensure all items are completed before requesting review -->

- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Documentation updated (if needed)
- [ ] No new warnings or errors
- [ ] Lint passes (`npm run lint`)
- [ ] Typecheck passes (`npm run typecheck`)
- [ ] Build passes (`npm run build`)
- [ ] Tests pass (`npm test`)
- [ ] No secrets or sensitive data committed
- [ ] CHANGELOG updated (if user-facing change)

## Additional Notes

<!-- Any additional context, concerns, or follow-up items -->

