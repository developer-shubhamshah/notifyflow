
[CmdletBinding()]
param(
    [string]$ImageTag = "latest"
)

. "$PSScriptRoot\config.ps1"
. "$PSScriptRoot\common.ps1"

$ErrorActionPreference = "Stop"

Assert-AwsCli

$target = $Config.Frontend
$region = $Config.Region
$cluster = $Config.Cluster
$repo = $target.Repository
$service = $target.Service
$containerName = $target.ContainerName
$image = "$($Config.EcrRegistry)/$repo`:$ImageTag"

Write-Host "Deploying ${repo}:$ImageTag to $service" -ForegroundColor Cyan

# Step 1: Verify the image exists in ECR
$digest = aws ecr describe-images `
    --repository-name $repo `
    --image-ids "imageTag=$ImageTag" `
    --region $region `
    --query "imageDetails[0].imageDigest" `
    --output text

if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($digest) -or $digest -eq "None") {
    throw "ECR image tag not found: ${repo}:$ImageTag"
}

Write-Host "ECR digest: $digest" -ForegroundColor Green

# Step 2: Get current ECS service configuration
$serviceJson = aws ecs describe-services `
    --cluster $cluster `
    --services $service `
    --region $region `
    --query "services[0]" `
    --output json

if ($LASTEXITCODE -ne 0) {
    throw "Could not retrieve ECS service $service."
}

$svc = $serviceJson | ConvertFrom-Json

if (-not $svc -or $svc.status -ne "ACTIVE") {
    throw "ECS service $service not found or inactive."
}

$previousTd = $svc.taskDefinition

Write-Host "Current task definition: $previousTd"

# Step 3: Get current task definition
$td = Get-CleanTaskDefinition $previousTd $region

$container = $td.containerDefinitions |
    Where-Object { $_.name -eq $containerName }

if (-not $container) {
    throw "Container $containerName not found in task definition."
}

# Step 4: Update container image
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

    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($newTd) -or $newTd -eq "None") {
        throw "Task definition registration failed."
    }
}
finally {
    Remove-Item $temp -Force -ErrorAction SilentlyContinue
}

$newTd = $newTd.Trim()

Write-Host "Previous task definition: $previousTd"
Write-Host "New task definition: $newTd" -ForegroundColor Cyan

# Step 6: Update ECS service
aws ecs update-service `
    --cluster $cluster `
    --service $service `
    --task-definition $newTd `
    --region $region `
    --output none

if ($LASTEXITCODE -ne 0) {
    throw "ECS service update failed."
}

Write-Host "ECS deployment started. Waiting for service stability..." -ForegroundColor Yellow

# Step 7: Wait for ECS service stability
aws ecs wait services-stable `
    --cluster $cluster `
    --services $service `
    --region $region

if ($LASTEXITCODE -ne 0) {
    throw "ECS service did not become stable. Inspect service events and target health."
}

# Step 8: Verify the deployed task definition
$finalServiceJson = aws ecs describe-services `
    --cluster $cluster `
    --services $service `
    --region $region `
    --query "services[0]" `
    --output json

if ($LASTEXITCODE -ne 0) {
    throw "Could not verify final ECS service state."
}

$finalSvc = $finalServiceJson | ConvertFrom-Json

if (-not $finalSvc) {
    throw "Final ECS service details are empty."
}

if ($finalSvc.taskDefinition -ne $newTd) {
    throw "Deployment failed or ECS rolled back. Expected: $newTd. Actual: $($finalSvc.taskDefinition)"
}

if (
    $finalSvc.runningCount -ne $finalSvc.desiredCount -or
    $finalSvc.pendingCount -ne 0
) {
    throw "Deployment is stable but task counts are unhealthy."
}

# Step 9: Display deployment summary
Write-Host "`nFrontend deployment summary:" -ForegroundColor Cyan

$finalSvc |
    Select-Object serviceName, taskDefinition, desiredCount, runningCount, pendingCount |
    Format-Table -AutoSize

Write-Host "Frontend deployment completed successfully." -ForegroundColor Green
