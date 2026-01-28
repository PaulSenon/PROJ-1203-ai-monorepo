# Git References for LLMs

This folder stores optional “source references” to external repos to help local LLM Agent to understand how used libs are working (because documentation might not help llm much sometimes). They are kept as Git submodules so they are NOT downloaded on a normal clone. Contributors fetch them only when needed, and we can pin them to an exact commit/tag to match the library version used by this project.

## How it works

Each reference is a Git submodule checked out under: `.llms/git-references/<name>/`  
The parent repo commits a pointer to a specific commit of that external repo (a “gitlink”), plus the mapping in `.gitmodules`.

## How to use

### Global project clone

Normal clone (does NOT fetch references):

```bash
git clone <THIS_REPO_URL>
```

Clone + fetch references immediately:

```bash
git clone --recurse-submodules <THIS_REPO_URL>
```

### Fetch references (all / one ad-hoc)

Fetch all references:

```bash
make llms-ref-fetch-all
```

Fetch a single reference:

```bash
make llms-ref-fetch-one name=<NAME>
```

### Add a new reference (custom folder name)

From the parent repo root:

```bash
make llms-ref-add url=<GIT_URL> name=<NAME>
git commit -m "Add llms git reference: <NAME>"
```

Example:

```bash
make llms-ref-add url=https://github.com/vercel/ai-elements.git name=ai-elements
git commit -m "Add llms git reference: ai-elements"
```

### Hard-pin / change tag ref of one reference

Goal: checkout the exact tag inside the submodule, then commit the updated pointer in the parent repo.

```bash
make llms-ref-pin-tag name=<NAME> tag=<TAG>
git commit -m "Pin llms git reference: <NAME> to <TAG>"
```

### Delete a reference

This removes it cleanly from Git’s submodule config and from the working tree.

```bash
make llms-ref-remove name=<NAME>
git commit -m "Remove llms git reference: <NAME>"
```

### Clear local downloaded refs (free disk space)

Keep the submodule definitions but remove the checked-out files from disk:

Remove all checked-out reference folders:

```bash
make llms-ref-clear
```

After cleaning, to restore references again:

```bash
make llms-ref-fetch-all
```
