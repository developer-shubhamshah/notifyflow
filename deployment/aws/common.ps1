Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Assert-AwsCli {
    if (-not (Get-Command aws -ErrorAction SilentlyContinue)) { throw "AWS CLI not found." }
    aws sts get-caller-identity --output json | Out-Host
    if ($LASTEXITCODE -ne 0) { throw "AWS identity check failed." }
}
function Write-Utf8NoBom([string]$Path,[string]$Content) {
    [System.IO.File]::WriteAllText($Path,$Content,[System.Text.UTF8Encoding]::new($false))
}
function Get-CleanTaskDefinition([string]$FamilyOrArn,[string]$Region) {
    $raw = aws ecs describe-task-definition --task-definition $FamilyOrArn --region $Region --query "taskDefinition" --output json
    if ($LASTEXITCODE -ne 0) { throw "Could not describe task definition $FamilyOrArn" }
    $td = $raw | ConvertFrom-Json
    @("taskDefinitionArn","revision","status","requiresAttributes","compatibilities","registeredAt","registeredBy","deregisteredAt") | ForEach-Object { $td.PSObject.Properties.Remove($_) }
    return $td
}
