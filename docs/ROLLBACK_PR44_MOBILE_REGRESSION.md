# Emergency rollback: PR #44 mobile regression

Scope: exact Git revert of merge commit `82b8d95d4097de46a3c48d112d75d7c473faba47`.

Reason: the iPhone player lost its header, Now Playing, artwork and control zones after the merged single-writer/splash changes.

No new CSS or JavaScript layer is introduced. The rollback restores the repository state immediately before PR #44. This document is removed by the final revert commit workflow before merge.
