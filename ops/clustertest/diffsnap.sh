#!/bin/bash
# usage: diffsnap.sh A B  — show cluster lines that differ between two snapshot tags across all datasets
for f in items*.json; do d=$(diff <(tr '|' '\n' < /dev/null) /dev/null >/dev/null; diff $f.$1.txt $f.$2.txt 2>/dev/null | grep -c '^[<>]'); [ "$d" != "0" ] && echo "== $f ($d changed lines)" && diff $f.$1.txt $f.$2.txt | grep '^[<>]' | cut -c1-230; done
