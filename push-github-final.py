#!/usr/bin/env python3
"""Push all project files to GitHub using Git Data API."""

import os
import base64
import json
import time
import requests

TOKEN = "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"
REPO = "dashboardpowerbilaxree-hash/HRMS"
API = f"https://api.github.com/repos/{REPO}/git"
HEADERS = {
    "Authorization": f"token {TOKEN}",
    "Accept": "application/vnd.github.v3+json",
    "Content-Type": "application/json"
}

# Files to include (relative to project root)
PROJECT_ROOT = "/home/z/my-project"

# Exclude patterns
EXCLUDE_DIRS = {
    "node_modules", ".next", ".git", ".vercel", ".claude", "upload",
    "download", "agent-ctx", "skills", "db", "examples", "prisma/migrations"
}

EXCLUDE_FILES = {
    ".env", ".env.local", ".env.production", ".env.development",
    "push-to-github.py", "push-github-final.py", "deploy-to-vercel.sh",
    "Caddyfile", "worklog.md", ".z-ai-config",
    "robust-daemon.sh", "start-with-warmup.sh", "run-server.sh",
    "start-daemon.sh", "restart-server.sh", "keep-alive.sh",
    "mini-server.mjs", "keep-alive-server.mjs", "start-server.sh",
    "daemon.sh", ".zscripts/dev.pid"
}

EXCLUDE_EXTENSIONS = {".db", ".db.bak", ".log"}

def should_include(filepath):
    """Check if file should be included in the push."""
    rel = os.path.relpath(filepath, PROJECT_ROOT)

    # Check excluded directories
    for exc_dir in EXCLUDE_DIRS:
        if rel.startswith(exc_dir + "/") or rel.startswith(exc_dir + os.sep):
            return False

    # Check excluded files
    if os.path.basename(filepath) in EXCLUDE_FILES:
        return False

    # Check extensions
    for ext in EXCLUDE_EXTENSIONS:
        if filepath.endswith(ext):
            return False

    # Skip shell scripts and mjs in root
    if os.path.dirname(filepath) == PROJECT_ROOT:
        if filepath.endswith('.sh') or (filepath.endswith('.mjs') and 'next.config' not in filepath):
            return False

    return True

def collect_files():
    """Collect all files to push."""
    files = []
    for root, dirs, filenames in os.walk(PROJECT_ROOT):
        # Filter out excluded dirs from walk
        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS and not d.startswith('.')]

        for fname in filenames:
            fpath = os.path.join(root, fname)
            if should_include(fpath):
                rel_path = os.path.relpath(fpath, PROJECT_ROOT)
                files.append((rel_path, fpath))

    return sorted(files, key=lambda x: x[0])

def create_blob(content, is_binary=False):
    """Create a blob in GitHub."""
    if is_binary:
        data = {
            "content": base64.b64encode(content).decode('utf-8'),
            "encoding": "base64"
        }
    else:
        data = {
            "content": content,
            "encoding": "utf-8"
        }

    resp = requests.post(f"{API}/blobs", headers=HEADERS, json=data)
    if resp.status_code != 201:
        print(f"  Blob error: {resp.status_code} - {resp.text[:200]}")
        return None
    return resp.json()["sha"]

def get_base_tree_sha():
    """Get the tree SHA of the latest commit on main."""
    resp = requests.get(f"{API}/refs/heads/main", headers=HEADERS)
    if resp.status_code == 200:
        commit_sha = resp.json()["object"]["sha"]
        resp2 = requests.get(f"{API}/commits/{commit_sha}", headers=HEADERS)
        if resp2.status_code == 200:
            return resp2.json()["tree"]["sha"], commit_sha
    return None, None

def create_tree(entries, base_tree=None):
    """Create a tree in GitHub."""
    data = {
        "tree": entries
    }
    if base_tree:
        data["base_tree"] = base_tree

    resp = requests.post(f"{API}/trees", headers=HEADERS, json=data)
    if resp.status_code != 201:
        print(f"  Tree error: {resp.status_code} - {resp.text[:300]}")
        return None
    return resp.json()["sha"]

def create_commit(tree_sha, parent_sha, message):
    """Create a commit in GitHub."""
    data = {
        "message": message,
        "tree": tree_sha,
        "parents": [parent_sha]
    }
    resp = requests.post(f"{API}/commits", headers=HEADERS, json=data)
    if resp.status_code != 201:
        print(f"  Commit error: {resp.status_code} - {resp.text[:200]}")
        return None
    return resp.json()["sha"]

def update_ref(commit_sha):
    """Update the main branch to point to the new commit."""
    data = {
        "sha": commit_sha,
        "force": True
    }
    resp = requests.patch(f"{API}/refs/heads/main", headers=HEADERS, json=data)
    if resp.status_code != 200:
        print(f"  Ref update error: {resp.status_code} - {resp.text[:200]}")
        return False
    return True

def main():
    print("Collecting files...")
    files = collect_files()
    print(f"Found {len(files)} files to push")

    # Binary file extensions
    BINARY_EXTS = {'.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.woff', '.woff2', '.ttf', '.eot'}

    # Create blobs in batches
    print("\nCreating blobs...")
    tree_entries = []
    batch_size = 20

    for i in range(0, len(files), batch_size):
        batch = files[i:i+batch_size]
        print(f"  Batch {i//batch_size + 1}/{(len(files) + batch_size - 1)//batch_size}: files {i+1}-{min(i+batch_size, len(files))}")

        for rel_path, abs_path in batch:
            ext = os.path.splitext(rel_path)[1].lower()
            is_binary = ext in BINARY_EXTS

            try:
                if is_binary:
                    with open(abs_path, 'rb') as f:
                        content = f.read()
                    sha = create_blob(content, is_binary=True)
                else:
                    with open(abs_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    sha = create_blob(content, is_binary=False)
            except Exception as e:
                print(f"  Error reading {rel_path}: {e}")
                continue

            if sha:
                # GitHub paths use forward slashes
                gh_path = rel_path.replace(os.sep, '/')
                tree_entries.append({
                    "path": gh_path,
                    "mode": "100644",
                    "type": "blob",
                    "sha": sha
                })
            else:
                print(f"  Failed to create blob for {rel_path}")

        # Small delay between batches to avoid rate limiting
        if i + batch_size < len(files):
            time.sleep(1)

    print(f"\nCreated {len(tree_entries)} blobs successfully")

    # Get base tree
    print("\nGetting base tree...")
    base_tree_sha, parent_sha = get_base_tree_sha()
    print(f"  Base tree: {base_tree_sha}")
    print(f"  Parent commit: {parent_sha}")

    # Create new tree
    print("\nCreating tree...")
    tree_sha = create_tree(tree_entries, base_tree=base_tree_sha)
    if not tree_sha:
        print("FAILED to create tree")
        return
    print(f"  New tree: {tree_sha}")

    # Create commit
    print("\nCreating commit...")
    commit_sha = create_commit(tree_sha, parent_sha, "Update Laxree HRMS - Neon PostgreSQL + Vercel deployment ready")
    if not commit_sha:
        print("FAILED to create commit")
        return
    print(f"  New commit: {commit_sha}")

    # Update ref
    print("\nUpdating main branch...")
    if update_ref(commit_sha):
        print("  SUCCESS! Main branch updated")
    else:
        print("  FAILED to update main branch")

    print(f"\n✅ Push complete! View at: https://github.com/{REPO}")

if __name__ == "__main__":
    main()
