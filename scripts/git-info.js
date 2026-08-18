#!/usr/bin/env node

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getGitInfo() {
  try {
    const commit = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
    
    return { commit, branch };
  } catch (error) {
    console.warn('Git information not available:', error.message);
    return { 
      commit: 'unknown', 
      branch: 'local' 
    };
  }
}

function updateEnvLocal() {
  const { commit, branch } = getGitInfo();
  const envPath = path.join(__dirname, '..', '.env.local');
  
  let envContent = '';
  
  // Read existing .env.local if it exists
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }
  
  // Remove existing git-related variables
  envContent = envContent
    .split('\n')
    .filter(line => !line.startsWith('NEXT_PUBLIC_COMMIT_SHA=') && !line.startsWith('NEXT_PUBLIC_BRANCH=') && !line.startsWith('NEXT_PUBLIC_BUILD_TIME='))
    .join('\n');
  
  // Add new git variables with build timestamp
  const buildTime = new Date().toISOString();
  envContent += `\n# Git info (auto-generated)\nNEXT_PUBLIC_COMMIT_SHA=${commit}\nNEXT_PUBLIC_BRANCH=${branch}\nNEXT_PUBLIC_BUILD_TIME=${buildTime}\n`;
  
  fs.writeFileSync(envPath, envContent);
  
  console.log(`✅ Updated .env.local with git info:`);
  console.log(`   Commit: ${commit.slice(0, 7)}`);
  console.log(`   Branch: ${branch}`);
  console.log(`   Build Time: ${buildTime}`);
}

// Only run if called directly (not imported)
if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  updateEnvLocal();
}

export { getGitInfo, updateEnvLocal };
