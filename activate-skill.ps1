# Antigravity Skills Activator
param(
    [string]$Bundle = "",
    [string]$Skill = "",
    [switch]$List,
    [switch]$Clear
)

$LibraryDir = "$HOME\.gemini\config\skills_library"
$SkillsDir = "$HOME\.gemini\config\skills"
$WorkspaceSkills = "$PSScriptRoot\.agents\skills"

if ($List) {
    Write-Host "Available skills in library: " -ForegroundColor Cyan
    Get-ChildItem $LibraryDir | Select-Object -First 50 Name
    Write-Host "`nUse: .\activate-skill.ps1 -Skill <skill-name> to activate any skill."
    exit
}

if ($Skill) {
    $src = Join-Path $LibraryDir $Skill
    if (Test-Path $src) {
        Copy-Item -Recurse -Force $src (Join-Path $SkillsDir $Skill)
        if (Test-Path "$PSScriptRoot\.agents") {
            Copy-Item -Recurse -Force $src (Join-Path $WorkspaceSkills $Skill)
        }
        Write-Host "Activated skill: $Skill" -ForegroundColor Green
    } else {
        Write-Host "Skill not found: $Skill" -ForegroundColor Red
    }
}
