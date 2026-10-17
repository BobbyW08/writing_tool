# Snippet intake and continuity check

This feature is specified in `traveler-wiki-build-plan.md` under **Continuity check (ported)** and was
built in v1 (see `BUILD_GUIDE.md`, "Continuity check mechanics"). In v2 a snippet is a record in the
`writing` collection and the check runs from Payload. The pure logic in `lib/continuity/` carries over;
the data layer is rewritten in Phase 4.
