 Deployment Documentation

This document describes how the Coolify + Next.js deployment for this task was set up, so another developer could replicate it end-to-end.

## Overview

- **VM**: Ubuntu 26.04 server hosted on Hetzner (bare metal/VPS, accessed via SSH with username/password).
- **Deployment platform**: [Coolify](https://coolify.io/) v4.1.2, self-hosted on the VM.
- **App**: `demo-nextjs-app`, a Next.js demonstration application.

## 1. VM Access

Connected via SSH:
ssh <username>@<vm-ip>
Credentials were provided via a 1Password shared vault link (not stored in this repo — see the security note at the end).

## 2. Installing Coolify

Ran the official Coolify install script as root:
```bash
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | sudo bash

Issue hit: install hung indefinitely on Step 1/9 (package installation).

- Root cause: the underlying apt-get install process got stuck holding the dpkg frontend lock — most likely due to an interactive needrestart prompt (asking which services to restart) that had nothing to answer it, since the script runs non-interactively via curl | sudo bash.
- Symptom: apt-get/dpkg process shown in ps aux with almost 0 CPU time used over an hour — i.e., blocked, not actually working.
- Fix:
  a. Identify the stuck process: ps aux | grep apt-get
  b. Kill it: sudo kill -9 <pid> (had to kill both the parent and child apt-get processes)
  c. Confirm the dpkg lock was released: sudo lsof /var/lib/dpkg/lock-frontend (should return nothing)
  d. Repair any partial package state: sudo dpkg --configure -a
  e. Set needrestart to non-interactive mode to prevent recurrence:
echo '$nrconf{restart} = "a";' | sudo tee -a /etc/needrestart/needrestart.conf
  f. Re-ran the install script — it completed successfully in a few minutes, skipping already-installed packages.

Once complete, Coolify was accessible at:
http://<vm-ip>:8000
Created the admin account through the web UI on first visit.

Note: Coolify warns to back up /data/coolify/source/.env (contains its secrets/keys) to a password manager — do this outside of any git repo.

3. Connecting the Repository

The task's demo app repo (CrazedBySerenity/demo-nextjs-app) was only granted read access, so branches couldn't be created directly on it.

Fix: forked the repo to a personal GitHub account (Abduloyebode/demo-nextjs-app), and created the feature branch there instead:
feature/update-content

In Coolify:
- New Resource → Applications → Public Repository
- Repository URL: https://github.com/Abduloyebode/demo-nextjs-app
- Branch: feature/update-content
- Build Pack: Nixpacks (auto-detected Node/Next.js app)
- Base Directory: /
- Port: 3000
- Static site: No (Next.js app runs as a Node server)

Gotcha: the branch dropdown on the initial "Create Application" screen didn't reliably pick up the newly created branch (likely a stale/rate-limited fetch from GitHub's public API). Workaround: create the application anyway, then go to Configuration → Git Source after creation — the branch field there is directly editable and reliably takes the correct branch name.

4. First Deployment & the "Bad Gateway" Issue

First deploy succeeded (build completed, container started), but visiting the app's URL returned 502 Bad Gateway.

- Root cause: Next.js's "standalone" server build binds to whatever process.env.HOSTNAME is set to. Docker automatically sets HOSTNAME to the container's ID (visible in the logs: Local: http://<container-id>:3000), so the app was listening on that specific hostname instead of all interfaces — meaning Coolify's reverse proxy (Traefik) couldn't reach it.
- Fix: added an environment variable in Coolify (Environment Variables tab):
HOSTNAME=0.0.0.0
- Redeployed — app logs then showed it listening correctly, resolving the Bad Gateway.

5. Still To Do

- [ ] Enable HTTPS (Let's Encrypt via Coolify, on the assigned domain/subdomain)
- [ ] Configure a GitHub webhook so pushes to feature/update-content trigger automatic redeploys
- [ ] Clone the fork locally, set up Cursor, make a small content change
- [ ] Open PR from fork → CrazedBySerenity/demo-nextjs-app with summary, testing notes, before/after screenshots
- [ ] Open PR from this docs fork → CrazedBySerenity/Introduction-project

Security Notes

- No passwords, SSH keys, tokens, or the Coolify .env contents are included in this document or committed anywhere in this repo.
- VM credentials were shared via 1Password and used directly; not stored in git.
