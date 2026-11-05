
[CmdletBinding()]
param(
    [string]$ImageTag = "latest"
)

$ErrorActionPreference = "Stop"

. "$PSScriptRoot\config.ps1"
. "$PSScriptRoot\common.ps1"

Assert-AwsCli

$target = $Config.Backend
$region = $Config.Region
$repo = $target.Repository
$containerName = $target.ContainerName
$image = "$($Config.EcrRegistry)/$repo`:$ImageTag"

Write-Host "Preparing backend task definition..." -ForegroundColor Cyan

# Step 1: Verify image exists in ECR
$digest = aws ecr describe-images `
    --repository-name $repo `
    --image-ids "imageTag=$ImageTag" `
    --region $region `
    --query "imageDetails[0].imageDigest" `
    --output text

if ($LASTEXITCODE -ne 0 -or
    [string]::IsNullOrWhiteSpace($digest) -or
    $digest -eq "None") {
    throw "ECR image tag not found: ${repo}:$ImageTag"
}

Write-Host "ECR digest: $digest" -ForegroundColor Green

# Step 2: Get current API service task definition
$serviceJson = aws ecs describe-services `
    --cluster $Config.Cluster `
    --services $target.Service `
    --region $region `
    --query "services[0]" `
    --output json

if ($LASTEXITCODE -ne 0) {
    throw "Could not retrieve API ECS service."
}

$svc = $serviceJson | ConvertFrom-Json

if (-not $svc -or $svc.status -ne "ACTIVE") {
    throw "API ECS service is not active."
}

$previousTd = $svc.taskDefinition

Write-Host "Current task definition: $previousTd"

# Step 3: Get clean task definition
$td = Get-CleanTaskDefinition $previousTd $region

$container = $td.containerDefinitions |
    Where-Object { $_.name -eq $containerName }

if (-not $container) {
    throw "Container $containerName not found in task definition."
}

# Step 4: Update API container image
$container.image = $image

# Step 5: Register new task definition
$temp = Join-Path $PSScriptRoot "register-task-definition.json"

Write-Utf8NoBom $temp ($td | ConvertTo-Json -Depth 100)

try {
    $newTd = aws ecs register-task-definition `
        --cli-input-json "file://$temp" `
        --region $region `
        --query "taskDefinition.taskDefinitionArn" `
        --output text

    if ($LASTEXITCODE -ne 0 -or
        [string]::IsNullOrWhiteSpace($newTd) -or
        $newTd -eq "None") {
        throw "Task definition registration failed."
    }
}
finally {
    Remove-Item $temp -Force -ErrorAction SilentlyContinue
}

$newTd = $newTd.Trim()

# Step 6: Display preparation summary
Write-Host "`nBackend task definition prepared successfully." -ForegroundColor Green
Write-Host "Previous task definition: $previousTd"
Write-Host "New task definition: $newTd" -ForegroundColor Cyan
Write-Host "Image: $image"
Write-Host "Image digest: $digest"

Write-Host "`nIMPORTANT: ECS service has NOT been updated." -ForegroundColor Yellow
Write-Host "Save the new task definition ARN for the migration and deployment steps."
