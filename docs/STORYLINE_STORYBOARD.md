# Storyline storyboard

Open Command Center → Storyline Studio, select a prepared game, then open **Storyboard**.

- Append a 30-second trailer, player portrait, or postgame recap template, or add a blank scene. Templates are editable production prompts, not invented quotes or results.
- Select a visual scene card to edit framing, duration, visual action, dialogue/audio, screen text, location, crew owner, reference image and footage links, and production notes.
- Link scenes to a story angle and one of the seven production assignments. Choose an outcome condition where needed. The outcome preview combines base scenes with the selected alternative; no branch automatically publishes or changes game records.
- Filter by assignment to plan an individual deliverable. Visible timings recalculate in sequence order. Move earlier/later operates on the full board; duplicate creates a new planned scene and clears captured footage.
- Mark scenes shoot-ready after adding visual/audio direction and an owner. Captured additionally requires a footage URL. These progress labels are separate from publication approval.
- Reference images load only when requested, without a referrer. Use a direct HTTP(S) image link; storage uploads and media rendering are not included.
- Download a readable shot list for the crew. The existing JSON production packet also includes the complete storyboard.
- Save workspace to persist the board. Existing optimistic revision handling, administrator access and audit history apply. Storyboard edits reopen approved/released tasks for review. Removing a story angle leaves linked scenes intact and moves them to episode-wide.

Legacy documents without a storyboard remain valid. The additive database trigger validates up to 60 scenes, references, durations, required fields and progress requirements. It prevents an outdated client from silently dropping a saved storyboard.

Verification: eight focused tests plus the application suite; rollback-only database create/edit/invalid-data checks. Signed-in visual verification remains separate.
