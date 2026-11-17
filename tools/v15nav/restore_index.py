#!/usr/bin/env python3
"""Restore out/index.html from the V15.2 ZIP, resumably.

The container's filesystem intermittently returns EPERM on writes (waves
lasting minutes). This script appends in 8 KB chunks and resumes after each
EPERM instead of restarting from zero, so progress accumulates across waves.
Verifies the final size + sha256 against the ZIP entry.
"""
import hashlib
import os
import sys
import time
import zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))  # ~/workspace/v7build
ZIP = os.path.join(ROOT, "Korean_English_Vocab_Farm_V15_Library_UI_Upgrade.zip")
DST = os.path.join(ROOT, "out", "index.html")
CHUNK = 8192
DEADLINE = time.time() + 600  # 10 minutes max

z = zipfile.ZipFile(ZIP)
data = z.read("index.html")
want_sha = hashlib.sha256(data).hexdigest()
print(f"want {len(data)} bytes sha256={want_sha[:16]}...", flush=True)

# start from a clean slate (delete the 0/5-byte stub if present)
try:
    if os.path.exists(DST):
        os.unlink(DST)
        print("removed stub", flush=True)
except OSError as e:
    print("unlink failed:", e, flush=True)

written = 0
bad_streak = 0
while written < len(data):
    if time.time() > DEADLINE:
        print(f"TIMEOUT at {written}/{len(data)}", flush=True)
        sys.exit(1)
    try:
        with open(DST, "ab") as f:
            while written < len(data):
                n = f.write(data[written:written + CHUNK])
                if n == 0:
                    raise OSError("short write")
                written += n
                bad_streak = 0
        print(f"done {written}/{len(data)}", flush=True)
    except PermissionError:
        bad_streak += 1
        if bad_streak % 10 == 0:
            print(f"EPERM wave... {written}/{len(data)} ({bad_streak} fails)", flush=True)
        time.sleep(3)
    except OSError as e:
        print("write error:", e, flush=True)
        time.sleep(3)

got = open(DST, "rb").read()
got_sha = hashlib.sha256(got).hexdigest()
print(f"restored {len(got)} bytes sha256={got_sha[:16]}...", flush=True)
assert len(got) == len(data) and got_sha == want_sha, "RESTORED FILE DOES NOT MATCH ZIP"
print("RESTORE OK — out/index.html matches the V15.2 ZIP byte-for-byte", flush=True)
