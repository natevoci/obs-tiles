# Development Setup Script for obs-tiles-electron
# This script handles the complete development environment setup

$ErrorActionPreference = "Stop"

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "obs-tiles-electron Development Setup" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

# Check if nvm-windows is installed
Write-Host "`nChecking for nvm-windows installation..." -ForegroundColor Yellow
try {
    $nvmVersion = nvm --version
    Write-Host "[OK] nvm-windows is installed (version: $nvmVersion)" -ForegroundColor Green
}
catch {
    Write-Host "[FAIL] nvm-windows is not installed" -ForegroundColor Red
    Write-Host "Please install nvm-windows from: https://github.com/coreybutler/nvm-windows/releases" -ForegroundColor Yellow
    exit 1
}

# Use Node.js version 25.2.1
Write-Host "`nChecking Node.js version..." -ForegroundColor Yellow
$currentVersion = node --version
$targetVersion = "v25.2.1"

if ($currentVersion -ne $targetVersion) {
    Write-Host "Current version: $currentVersion, switching to $targetVersion..." -ForegroundColor Yellow
    nvm use 25.2.1 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Version 25.2.1 not found locally, installing..." -ForegroundColor Yellow
        nvm install 25.2.1
        nvm use 25.2.1
    }
} else {
    Write-Host "[OK] Already using Node.js version $targetVersion" -ForegroundColor Green
}
Write-Host "[OK] Using Node.js version 25.2.1" -ForegroundColor Green

# Verify Node and npm installation
$nodeVersion = node --version
$npmVersion = npm --version
Write-Host "[OK] Node: $nodeVersion | npm: $npmVersion" -ForegroundColor Green

# Install yarn globally
Write-Host "`nInstalling yarn globally..." -ForegroundColor Yellow
npm install --global yarn
$yarnVersion = yarn --version
Write-Host "[OK] yarn is installed (version: $yarnVersion)" -ForegroundColor Green

# Install project dependencies
Write-Host "`nInstalling project dependencies..." -ForegroundColor Yellow
yarn install
if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Dependencies installed successfully" -ForegroundColor Green
} else {
    Write-Host "[FAIL] Failed to install dependencies" -ForegroundColor Red
    exit 1
}

# Build the project
Write-Host "`nBuilding project..." -ForegroundColor Yellow
yarn build
if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Build completed successfully" -ForegroundColor Green
} else {
    Write-Host "[FAIL] Build failed" -ForegroundColor Red
    exit 1
}

Write-Host "`n=====================================" -ForegroundColor Cyan
Write-Host "Setup and build completed successfully!" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
