---
paths:
  - "src/ui/**"
  - "Assets/**/{UI,Ui,ui}/**/*.cs"
  - "Source/**/{UI,Ui,ui}/**/*.{h,cpp}"
---

# UI Code Rules

- UI must NEVER own or directly modify game state — display only, use commands/events to request changes
- User-facing strings live in one place per screen (constants or data), not scattered literals; full localization
  only when the project ships more than one language
- Mouse and touch input for every interactive element; gamepad only when the GDD asks for it
- Long animations (over about a second) can be skipped
- UI sounds trigger through the audio event system, not directly
- UI must never block the game thread
- Text stays readable at the reference resolution (contrast, size); colorblind modes only when the GDD asks
- Check every UI change on the standard 16:9 screen only (the Canvas reference resolution; a portrait game: 9:16),
  whatever the change. Other sizes and aspect ratios: `/ui-resolution-check`, only when the user asks for it
