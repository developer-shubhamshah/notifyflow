
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$TaskDefinition
)

$ErrorActionPreference = "Stop"

. "$PSScriptRoot\config.ps1"
. "$PSScriptRoot\common.ps1"

Assert-AwsCli

$region = $Config.Region
$cluster = $Config.Cluster
$service = $Config.Backend.Service

# Step 1: Validate supplied task definition
if ([string]::IsNullOrWhiteSpace($TaskDefinition)) {
    throw "TaskDefinition ARN is required."
}

Write-Host "Validating task definition..." -ForegroundColor Cyan

$taskDefinitionJson = aws ecs describe-task-definition `
    --task-definition $TaskDefinition `
    --region $region `
    --output json

if ($LASTEXITCODE -ne 0) {
    throw "Could not retrieve task definition: $TaskDefinition"
}

$tdResult = $taskDefinitionJson | ConvertFrom-Json
$td = $tdResult.taskDefinition

if (-not $td) {
    throw "Task definition details are empty."
}

if ($td.family -ne $Config.Backend.TaskDefinitionFamily) {
    throw "Task definition family mismatch. Expected $($Config.Backend.TaskDefinitionFamily), found $($td.family)."
}

$container = $td.containerDefinitions |
    Where-Object { $_.name -eq $Config.Backend.ContainerName }

if (-not $container) {
    throw "Expected API container not found in task definition."
}

Write-Host "Task definition validated: $($td.taskDefinitionArn)" -ForegroundColor Green
Write-Host "API image: $($container.image)"

# Step 2: Retrieve current ECS service state
$serviceJson = aws ecs describe-services `
    --cluster $cluster `
    --services $service `
    --region $region `
    --query "services[0]" `
    --output json

if ($LASTEXITCODE -ne 0) {
    throw "Could not retrieve ECS service."
}

$svc = $serviceJson | ConvertFrom-Json

if (-not $svc -or $svc.status -ne "ACTIVE") {
    throw "ECS service is not active."
}

$previousTd = $svc.taskDefinition

Write-Host "Current task definition: $previousTd"

if ($previousTd -eq $td.taskDefinitionArn) {
    throw "The supplied task definition is already active on the ECS service."
}

# Step 3: Update ECS service
Write-Host "`nUpdating backend ECS service..." -ForegroundColor Yellow

aws ecs update-service `
    --cluster $cluster `
    --service $service `
    --task-definition $td.taskDefinitionArn `
    --region $region `
    --output none

if ($LASTEXITCODE -ne 0) {
    throw "ECS service update failed."
}

Write-Host "Deployment started. Waiting for service stability..." -ForegroundColor Yellow

# Step 4: Wait for ECS service stability
aws ecs wait services-stable `
    --cluster $cluster `
    --services $service `
    --region $region

if ($LASTEXITCODE -ne 0) {
    throw "ECS service did not become stable. Inspect ECS events and target health."
}

# Step 5: Verify final deployment
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

if ($finalSvc.taskDefinition -ne $td.taskDefinitionArn) {
    throw "Deployment failed or ECS rolled back. Expected: $($td.taskDefinitionArn). Actual: $($finalSvc.taskDefinition)"
}

if (
    $finalSvc.runningCount -ne $finalSvc.desiredCount -or
    $finalSvc.pendingCount -ne 0
) {
    throw "Deployment is stable but task counts are unhealthy."
}

# Step 6: Display deployment summary
Write-Host "`nBackend deployment summary:" -ForegroundColor Cyan

$finalSvc |
    Select-Object serviceName, taskDefinition, desiredCount, runningCount, pendingCount |
    Format-Table -AutoSize

Write-Host "Backend deployment completed successfully." -ForegroundColor Green
