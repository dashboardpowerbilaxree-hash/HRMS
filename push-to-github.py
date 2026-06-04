#!/usr/bin/env python3
"""
Push all project files to GitHub using the REST API.
This bypasses git protocol authentication issues with fine-grained PATs.
"""
import os
import base64
import json
import time
import requests

TOKEN = "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"
OWNER = "dashboardpowerbilaxree-hash"
REPO = "HRMS"
BASE_URL = f"https://api.github.com/repos/{OWNER}/{REPO}"
HEADERS = {
    "Authorization": f"token {TOKEN}",
    "Accept": "application/vnd.github.v3+json",
}

# Files/dirs to exclude
EXCLUDE_DIRS = {
    "node_modules", ".next", ".git", "upload", "download", "skills",
    "agent-ctx", "db", "mini-services", ".zscripts", "examples",
}
EXCLUDE_FILES = {
    "dev.log", "server.log", "custom.db", "custom.db.bak",
    "package-lock.json", "bun.lock",
    "robust-daemon.sh", "daemon.sh", "start-daemon.sh", "start-server.sh",
    "restart-server.sh", "run-server.sh", "keep-alive.sh", "start-with-warmup.sh",
    "keep-alive-server.mjs", "mini-server.mjs", "Caddyfile",
    "deploy-to-vercel.sh", "worklog.md", "next-env.d.ts",
    "push-to-github.py",
}

def get_local_files(base_dir):
    """Get all local files that should be pushed."""
    files = {}
    for root, dirs, filenames in os.walk(base_dir):
        # Skip excluded directories
        rel_root = os.path.relpath(root, base_dir)
        parts = rel_root.split(os.sep)
        if any(p in EXCLUDE_DIRS for p in parts):
            continue
        
        for fname in filenames:
            if fname in EXCLUDE_FILES:
                continue
            
            filepath = os.path.join(root, fname)
            rel_path = os.path.relpath(filepath, base_dir)
            
            # Skip binary files and large files
            try:
                with open(filepath, 'rb') as f:
                    content = f.read()
                
                # Skip files larger than 1MB
                if len(content) > 1_000_000:
                    print(f"  SKIP (too large): {rel_path} ({len(content)} bytes)")
                    continue
                
                # Try to encode as text
                content.decode('utf-8')
                files[rel_path] = base64.b64encode(content).decode('utf-8')
            except (UnicodeDecodeError, PermissionError, OSError):
                print(f"  SKIP (binary/error): {rel_path}")
                continue
    
    return files

def get_remote_files():
    """Get all files currently in the remote repo."""
    files = {}
    
    def fetch_dir(path=""):
        url = f"{BASE_URL}/contents/{path}"
        params = {"ref": "main"}
        resp = requests.get(url, headers=HEADERS, params=params)
        if resp.status_code != 200:
            return
        
        for item in resp.json():
            if item['type'] == 'file':
                files[item['path']] = item['sha']
            elif item['type'] == 'dir':
                fetch_dir(item['path'])
                time.sleep(0.1)  # Rate limiting
    
    fetch_dir()
    return files

def create_blob(content_base64):
    """Create a git blob."""
    url = f"{BASE_URL}/git/blobs"
    data = {"content": content_base64, "encoding": "base64"}
    resp = requests.post(url, headers=HEADERS, json=data)
    if resp.status_code in (200, 201):
        return resp.json()['sha']
    else:
        print(f"  Blob creation failed: {resp.status_code} {resp.text[:200]}")
        return None

def get_head_commit():
    """Get the current HEAD commit SHA."""
    url = f"{BASE_URL}/git/refs/heads/main"
    resp = requests.get(url, headers=HEADERS)
    if resp.status_code == 200:
        return resp.json()['object']['sha']
    return None

def get_commit_tree(commit_sha):
    """Get the tree SHA for a commit."""
    url = f"{BASE_URL}/git/commits/{commit_sha}"
    resp = requests.get(url, headers=HEADERS)
    if resp.status_code == 200:
        return resp.json()['tree']['sha']
    return None

def create_tree(tree_items):
    """Create a new tree with the given items."""
    url = f"{BASE_URL}/git/trees"
    data = {"base_tree": None, "tree": tree_items}
    resp = requests.post(url, headers=HEADERS, json=data)
    if resp.status_code in (200, 201):
        return resp.json()['sha']
    else:
        print(f"  Tree creation failed: {resp.status_code} {resp.text[:200]}")
        return None

def create_commit(tree_sha, parent_sha, message):
    """Create a new commit."""
    url = f"{BASE_URL}/git/commits"
    data = {
        "message": message,
        "tree": tree_sha,
        "parents": [parent_sha],
    }
    resp = requests.post(url, headers=HEADERS, json=data)
    if resp.status_code in (200, 201):
        return resp.json()['sha']
    else:
        print(f"  Commit creation failed: {resp.status_code} {resp.text[:200]}")
        return None

def update_ref(commit_sha):
    """Update the main branch to point to the new commit."""
    url = f"{BASE_URL}/git/refs/heads/main"
    data = {"sha": commit_sha, "force": True}
    resp = requests.patch(url, headers=HEADERS, json=data)
    if resp.status_code == 200:
        return True
    else:
        print(f"  Ref update failed: {resp.status_code} {resp.text[:200]}")
        return False

def main():
    base_dir = "/home/z/my-project"
    
    print("=" * 60)
    print("Pushing Laxree HRMS to GitHub via REST API")
    print("=" * 60)
    
    # Step 1: Get local files
    print("\n[1/5] Collecting local files...")
    local_files = get_local_files(base_dir)
    print(f"  Found {len(local_files)} files to push")
    
    # Step 2: Get current remote HEAD
    print("\n[2/5] Getting remote HEAD commit...")
    head_sha = get_head_commit()
    if not head_sha:
        print("  ERROR: Could not get HEAD commit")
        return
    print(f"  HEAD: {head_sha[:7]}")
    
    # Step 3: Create blobs for all files
    print("\n[3/5] Creating blobs for all files...")
    tree_items = []
    blob_cache = {}
    
    for i, (path, content_b64) in enumerate(local_files.items()):
        # Normalize path separators
        path = path.replace(os.sep, '/')
        
        # Skip .env (we'll handle it separately in Vercel)
        if path == '.env':
            print(f"  SKIP (.env): {path}")
            continue
        
        blob_sha = create_blob(content_b64)
        if blob_sha:
            tree_items.append({
                "path": path,
                "mode": "100644",
                "type": "blob",
                "sha": blob_sha,
            })
            blob_cache[path] = blob_sha
        
        if (i + 1) % 20 == 0:
            print(f"  Progress: {i + 1}/{len(local_files)} files processed")
        time.sleep(0.05)  # Rate limiting
    
    print(f"  Created {len(tree_items)} blobs")
    
    # Step 4: Create tree and commit
    print("\n[4/5] Creating tree and commit...")
    
    # Process in batches if needed (GitHub tree API has limits)
    tree_sha = create_tree(tree_items)
    if not tree_sha:
        print("  ERROR: Could not create tree")
        return
    print(f"  Tree: {tree_sha[:7]}")
    
    commit_sha = create_commit(tree_sha, head_sha, "Push complete Laxree HRMS project code")
    if not commit_sha:
        print("  ERROR: Could not create commit")
        return
    print(f"  Commit: {commit_sha[:7]}")
    
    # Step 5: Update reference
    print("\n[5/5] Updating main branch reference...")
    if update_ref(commit_sha):
        print("  SUCCESS: Branch updated!")
    else:
        print("  ERROR: Could not update branch")
        return
    
    print("\n" + "=" * 60)
    print(f"Push complete! Commit: {commit_sha[:7]}")
    print(f"Repo: https://github.com/{OWNER}/{REPO}")
    print("=" * 60)

if __name__ == "__main__":
    main()
