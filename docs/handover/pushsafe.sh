#!/bin/bash
# usage: pushsafe.sh <commit>...  — push local commits to origin/paycheck-page via a temp worktree (main tree may have others' uncommitted edits)
set -e
cd /home/user/Playground_01
W=/tmp/pushwt; git worktree remove --force $W 2>/dev/null || true
C=$(for c in "$@"; do git rev-parse "$c"; done); git fetch -q origin paycheck-page
git worktree add -q --detach $W origin/paycheck-page
cd $W; for c in $C; do git cherry-pick $c >/dev/null; done
for i in 1 2 3; do git push -q origin HEAD:paycheck-page && break || { git fetch -q origin paycheck-page; git rebase -q origin/paycheck-page; }; done
git log --oneline -1; cd /home/user/Playground_01; git worktree remove --force $W
