# Contributing

`main` is what's live. Nothing lands on it except through a pull request that passes CI.

## Workflow

1. Update `main`: `git checkout main && git pull`
2. Branch off it, one branch per change:

   | Type | Example |
   | --- | --- |
   | New feature | `feat/product-quantity-selector` |
   | Bug fix | `fix/mobile-menu-overflow` |
   | Content / docs | `docs/update-delivery-info` |
   | Tooling, deps, cleanup | `chore/upgrade-next` |

3. Commit in small steps using [Conventional Commits](https://www.conventionalcommits.org/):

   ```
   feat(cart): add quantity selector to product page
   fix(header): stop logo overlapping menu on small screens
   docs(readme): explain how to add product photos
   chore(deps): bump next to 16.4.3
   ```

   Format: `type(scope): summary` — lowercase, imperative ("add", not "added"), no full stop.
   Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.

4. Before pushing, run the same checks CI runs:

   ```bash
   npm run lint
   npm run typecheck
   npm run build
   ```

5. Push and open a PR. Fill in every section of the template.
6. Merge with **Squash and merge**, so the PR title becomes the commit on `main`. That's why CI checks the PR title.

## Reviewing (including your own PRs)

Read the whole diff in the **Files changed** tab, not in your editor. Ask:

- **Correct?** Does it do what the PR says? What input or screen size breaks it?
- **Clear?** Would someone new understand this in six months? Are names honest?
- **Scoped?** Is anything in here unrelated to the PR's purpose? Split it out.
- **Safe?** Hard-coded phone numbers, prices or secrets outside `src/lib/site.ts`?

Leave comments as questions or concrete suggestions ("This re-renders on every keystroke — move it into `useMemo`?"), not verdicts. When replying to review, either make the change or explain why not, then resolve the thread.
