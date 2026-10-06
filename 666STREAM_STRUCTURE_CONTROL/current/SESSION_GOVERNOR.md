# 666STREAM Session Governor

SESSION_SCOPE=CHAT_LOCAL
ONE_ACTIVE_PROJECT_PER_CHAT=true
GLOBAL_ACTIVE_PROJECT=FORBIDDEN
PARALLEL_PROJECT_CHATS=SUPPORTED
COMMAND_SCOPE=ACTIVE_PROJECT_ONLY

A different chat may bind to a different project in the same repository.
One chat must not change another chat's active project.
Repository HEAD movement must be reconciled but must not switch project scope.
Explicit direct user intent may switch the current chat after project re-resolution.
CodeForge inherits the active project scope and may not escape it.
