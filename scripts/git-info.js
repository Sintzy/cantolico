#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

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
    .filter(line => !line.startsWith('NEXT_PUBLIC_COMMIT_SHA=') && !line.startsWith('NEXT_PUBLIC_BRANCH='))
    .join('\n');
  
  // Add new git variables
  envContent += `\n# Git info (auto-generated)\nNEXT_PUBLIC_COMMIT_SHA=${commit}\nNEXT_PUBLIC_BRANCH=${branch}\n`;
  
  fs.writeFileSync(envPath, envContent);
  
  console.log(`✅ Updated .env.local with git info:`);
  console.log(`   Commit: ${commit.slice(0, 7)}`);
  console.log(`   Branch: ${branch}`);
}

// Only run if called directly (not imported)
if (require.main === module) {
  updateEnvLocal();
}

module.exports = { getGitInfo, updateEnvLocal };
