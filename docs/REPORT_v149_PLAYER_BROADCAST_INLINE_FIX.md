# v149 Player Broadcast Inline Fix

Scope: PC player broadcast message UI placement only.

Changes:
- Existing PC broadcast sender DOM is kept.
- Sender is removed from normal document flow by CSS and placed beside the History button.
- Text area is compact so it does not stretch the now-playing panel.
- No ticker, transport, EQ, Discord, Worker or stream routing changes.
- Cache/version strings updated to v149.
