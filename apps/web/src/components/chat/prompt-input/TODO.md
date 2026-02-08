# TODO

- [] refactor prompt-input following apps/web/src/components/README.md specs (take example on message ui)

rough idea:

- restructure L2 standalone primitive file exporting many composable components (take example on apps/web/src/components/ui-custom/chat/message.tsx) extends ai-elements prompt-input when makes sense.
- restructure L3 with
  - \_hooks folder with the prompt-input scoped hooks (input, draft etc)
  - \_parts like model selector (already moved but must check structure because haven't been refactored yet), queue, draft, files, etc.
