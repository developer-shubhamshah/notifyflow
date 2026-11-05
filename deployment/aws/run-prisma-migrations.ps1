
[CmdletBinding()]
param(
    [string]$TaskDefinition = "",
    [switch]$ConfirmProduction
)

$ErrorActionPreference = "Stop"

. "$PSScriptRoot\config.ps1"
. "$PSScriptRoot\common.ps1"

# Step 1: Require explicit production confirmation
if (-not $ConfirmProduction) {
    throw "Production database migration. Review migration files and backups, then rerun with -ConfirmProduction."
}

Assert-AwsCli

$region = $Config.Region
$cluster = $Config.Cluster
$service = $Config.Backend.Service
$containerName = $Config.Backend.ContainerName

# Step 2: Resolve task definition
if ([string]::IsNullOrWhiteSpace($TaskDefinition)) {

    $TaskDefinition = aws ecs describe-services `
        --cluster $cluster `
        --services $service `
        --region $region `
        --query "services[0].taskDefinition" `
        --output text

    if ($LASTEXITCODE -ne 0 -or
        [string]::IsNullOrWhiteSpace($TaskDefinition) -or
        $TaskDefinition -eq "None") {
        throw "Could not get active API task definition."
    }

    $TaskDefinition = $TaskDefinition.Trim()
}

Write-Host "Migration task definition: $TaskDefinition" -ForegroundColor Cyan

# Step 3: Validate task definition and API container
$taskDefinitionJson = aws ecs describe-task-definition `
    --task-definition $TaskDefinition `
    --region $region `
    --output json

if ($LASTEXITCODE -ne 0) {
    throw "Could not retrieve task definition: $TaskDefinition"
}

$taskDefinitionDetails = $taskDefinitionJson | ConvertFrom-Json

if (-not $taskDefinitionDetails.taskDefinition) {
    throw "Task definition details are empty."
}

$apiContainer = $taskDefinitionDetails.taskDefinition.containerDefinitions |
    Where-Object { $_.name -eq $containerName }

if (-not $apiContainer) {
    throw "Expected API container '$containerName' not found in $TaskDefinition."
}

Write-Host "API container validated: $containerName" -ForegroundColor Green

# Step 4: Prepare Prisma migration command
$overrides = @{
    containerOverrides = @(
        @{
            name = $containerName
            command = @(
                "npx",
                "prisma",
                "migrate",
                "deploy"
            )
        }
    )
}

$overrideFile = Join-Path $PSScriptRoot "migration-overrides.json"

Write-Utf8NoBom $overrideFile ($overrides | ConvertTo-Json -Depth 20)

# Step 5: Prepare Fargate networking
$subnets = $Config.Migration.Subnets -join ","
$securityGroups = $Config.Migration.SecurityGroups -join ","

if ([string]::IsNullOrWhiteSpace($subnets) -or
    [string]::IsNullOrWhiteSpace($securityGroups)) {
    Remove-Item $overrideFile -Force -ErrorAction SilentlyContinue
    throw "Migration subnet or security group configuration is missing."
}

$networkConfiguration = "awsvpcConfiguration={subnets=[$subnets],securityGroups=[$securityGroups],assignPublicIp=$($Config.Migration.AssignPublicIp)}"

# Step 6: Start one-off migration task
try {

    $runTaskJson = aws ecs run-task `
        --cluster $cluster `
        --task-definition $TaskDefinition `
        --launch-type FARGATE `
        --network-configuration $networkConfiguration `
        --overrides "file://$overrideFile" `
        --region $region `
        --output json

    if ($LASTEXITCODE -ne 0) {
        throw "AWS ECS run-task command failed."
    }

    $runTaskResult = $runTaskJson | ConvertFrom-Json

    if ($runTaskResult.failures -and $runTaskResult.failures.Count -gt 0) {
        $runTaskResult.failures | Format-List
        throw "ECS rejected the migration task."
    }

    if (-not $runTaskResult.tasks -or
        $runTaskResult.tasks.Count -eq 0) {
        throw "ECS did not return a migration task ARN."
    }

    $taskArn = $runTaskResult.tasks[0].taskArn

    if ([string]::IsNullOrWhiteSpace($taskArn)) {
        throw "Migration task ARN is empty."
    }

}
finally {
    Remove-Item $overrideFile -Force -ErrorAction SilentlyContinue
}

$taskId = ($taskArn -split "/")[-1]

Write-Host "Migration task started: $taskArn" -ForegroundColor Cyan

# Step 7: Wait for migration task completion
aws ecs wait tasks-stopped `
    --cluster $cluster `
    --tasks $taskArn `
    --region $region

if ($LASTEXITCODE -ne 0) {
    throw "Timed out waiting for migration task. Inspect ECS and CloudWatch logs."
}

# Step 8: Retrieve final migration task status
$taskDetailsJson = aws ecs describe-tasks `
    --cluster $cluster `
    --tasks $taskArn `
    --region $region `
    --query "tasks[0].{status:lastStatus,containers:containers[].{name:name,exitCode:exitCode,reason:reason,lastStatus:lastStatus},stoppedReason:stoppedReason}" `
    --output json

$awsExitCode = $LASTEXITCODE

if ($awsExitCode -ne 0) {
    throw "Could not describe migration task."
}

$result = $taskDetailsJson | ConvertFrom-Json

if (-not $result) {
    throw "Migration task details are empty."
}

$apiContainerResult = $result.containers |
    Where-Object { $_.name -eq $containerName }

Write-Host "`nMigration task status:" -ForegroundColor Cyan
$result | Format-List

Write-Host "API container status:" -ForegroundColor Cyan
$apiContainerResult | Format-List

# Step 9: Verify successful Prisma migration
if ($result.status -ne "STOPPED") {
    throw "Migration task did not reach STOPPED state."
}

if (-not $apiContainerResult) {
    throw "API container was not found in migration task results."
}

if ($apiContainerResult.lastStatus -ne "STOPPED") {
    throw "API migration container did not stop successfully."
}

if ($null -eq $apiContainerResult.exitCode -or
    $apiContainerResult.exitCode -ne 0) {
    throw "Prisma migration failed. Inspect CloudWatch logs before retrying."
}

# Step 10: Display success summary
Write-Host "`nPrisma migrations completed successfully." -ForegroundColor Green

Write-Host "Log group: $($Config.Migration.LogGroup)"
Write-Host "Task ID: $taskId"
Write-Host "Task definition: $TaskDefinition"
