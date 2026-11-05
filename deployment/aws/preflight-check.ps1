
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidateNotNullOrEmpty()]
    [string]$ImageTag,

    [string]$TaskDefinition = ""
)

$ErrorActionPreference = "Stop"

. "$PSScriptRoot\config.ps1"

$script:Failures = 0
$script:Passed = 0

function Write-Check {
    param(
        [string]$Name,
        [bool]$Success,
        [string]$Details
    )

    if ($Success) {
        $script:Passed++
        Write-Host "[PASS] $Name - $Details" -ForegroundColor Green
    }
    else {
        $script:Failures++
        Write-Host "[FAIL] $Name - $Details" -ForegroundColor Red
    }
}

function Invoke-AwsJson {
    param([string[]]$Arguments)

    $output = & aws @Arguments 2>&1

    if ($LASTEXITCODE -ne 0) {
        throw "AWS CLI failed: $($Arguments -join ' ')`n$($output -join "`n")"
    }

    $json = $output -join "`n"

    if ([string]::IsNullOrWhiteSpace($json)) {
        throw "AWS CLI returned empty output: $($Arguments -join ' ')"
    }

    return ($json | ConvertFrom-Json)
}

function Invoke-AwsText {
    param([string[]]$Arguments)

    $output = & aws @Arguments 2>&1

    if ($LASTEXITCODE -ne 0) {
        throw "AWS CLI failed: $($Arguments -join ' ')`n$($output -join "`n")"
    }

    return (($output -join "`n").Trim())
}

function Test-EcrRepository {
    param([string]$Repository)

    try {
        $result = Invoke-AwsJson -Arguments @(
            "ecr", "describe-repositories",
            "--repository-names", $Repository,
            "--region", $Config.Region
        )

        $exists = @($result.repositories).Count -gt 0

        Write-Check "ECR repository $Repository" $exists "Repository availability"
        return $exists
    }
    catch {
        Write-Check "ECR repository $Repository" $false $_.Exception.Message
        return $false
    }
}

function Test-EcrImage {
    param(
        [string]$Repository,
        [string]$Tag
    )

    try {
        $result = Invoke-AwsJson -Arguments @(
            "ecr", "describe-images",
            "--repository-name", $Repository,
            "--image-ids", "imageTag=$Tag",
            "--region", $Config.Region
        )

        $image = $result.imageDetails | Select-Object -First 1

        if (-not $image) {
            Write-Check "ECR image $Repository" $false "Tag '$Tag' not found."
            return $null
        }

        Write-Check "ECR image $Repository" $true `
            "Tag '$Tag' exists; digest $($image.imageDigest)"

        return $image
    }
    catch {
        Write-Check "ECR image $Repository" $false $_.Exception.Message
        return $null
    }
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host " NotifyFlow AWS Production Preflight" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Region: $($Config.Region)"
Write-Host "Cluster: $($Config.Cluster)"
Write-Host "Image tag: $ImageTag"
Write-Host ""

# 1. AWS identity and target region

$identity = $null

try {
    $identity = Invoke-AwsJson -Arguments @(
        "sts", "get-caller-identity"
    )

    $expectedAccount = $Config.EcrRegistry.Split('.')[0]

    Write-Check "AWS account identity" `
        ($identity.Account -eq $expectedAccount) `
        "Actual: $($identity.Account); Expected: $expectedAccount"

    Write-Host "AWS identity: $($identity.Arn)"
}
catch {
    Write-Check "AWS account identity" $false $_.Exception.Message
}

try {
    $regionResult = Invoke-AwsJson -Arguments @(
        "ec2", "describe-availability-zones",
        "--region", $Config.Region
    )

    $regionAvailable = @($regionResult.AvailabilityZones).Count -gt 0

    Write-Check "AWS target region" $regionAvailable `
        "Region: $($Config.Region)"
}
catch {
    Write-Check "AWS target region" $false $_.Exception.Message
}

# 2. ECR repositories and explicitly requested image tags

$webRepoExists = Test-EcrRepository $Config.Frontend.Repository
$apiRepoExists = Test-EcrRepository $Config.Backend.Repository

$apiImage = $null

if ($webRepoExists) {
    Test-EcrImage $Config.Frontend.Repository $ImageTag | Out-Null
}

if ($apiRepoExists) {
    $apiImage = Test-EcrImage $Config.Backend.Repository $ImageTag
}

# 3. ECS cluster and services

$apiService = $null
$serviceResult = $null

try {
    $clusterResult = Invoke-AwsJson -Arguments @(
        "ecs", "describe-clusters",
        "--clusters", $Config.Cluster,
        "--region", $Config.Region
    )

    $cluster = $clusterResult.clusters | Select-Object -First 1

    $clusterActive = (
        $null -ne $cluster -and
        $cluster.status -eq "ACTIVE"
    )

    Write-Check "ECS cluster" $clusterActive `
        "Cluster: $($Config.Cluster); Status: $($cluster.status)"

    if (-not $clusterActive) {
        throw "ECS cluster is missing or not ACTIVE."
    }

    $services = @(
        $Config.Frontend.Service,
        $Config.Backend.Service
    )

    $serviceArguments = @(
        "ecs", "describe-services",
        "--cluster", $Config.Cluster,
        "--services"
    ) + $services + @(
        "--region", $Config.Region
    )

    $serviceResult = Invoke-AwsJson -Arguments $serviceArguments

    foreach ($serviceName in $services) {
        $service = $serviceResult.services |
            Where-Object { $_.serviceName -eq $serviceName } |
            Select-Object -First 1

        $healthy = (
            $null -ne $service -and
            $service.status -eq "ACTIVE" -and
            $service.runningCount -eq $service.desiredCount -and
            $service.pendingCount -eq 0
        )

        Write-Check "ECS service $serviceName" $healthy `
            "Status=$($service.status); Desired=$($service.desiredCount); Running=$($service.runningCount); Pending=$($service.pendingCount)"

        if ($service) {
            Write-Host "  Active task definition: $($service.taskDefinition)"
        }
    }

    $apiService = $serviceResult.services |
        Where-Object { $_.serviceName -eq $Config.Backend.Service } |
        Select-Object -First 1

    if (-not $apiService) {
        throw "API ECS service was not found."
    }

    if ([string]::IsNullOrWhiteSpace($TaskDefinition)) {
        $TaskDefinition = $apiService.taskDefinition

        Write-Host ""
        Write-Host "No task definition supplied. Using active API task definition:"
        Write-Host $TaskDefinition -ForegroundColor Yellow
    }
}
catch {
    Write-Check "ECS validation" $false $_.Exception.Message
}

# 4. Migration networking and CloudWatch log group

try {
    $subnetArguments = @(
        "ec2", "describe-subnets",
        "--subnet-ids"
    ) + @($Config.Migration.Subnets) + @(
        "--region", $Config.Region
    )

    $subnetResult = Invoke-AwsJson -Arguments $subnetArguments

    $availableSubnets = @(
        $subnetResult.Subnets |
        Where-Object { $_.State -eq "available" }
    )

    $validSubnets = (
        $availableSubnets.Count -eq $Config.Migration.Subnets.Count
    )

    Write-Check "Migration subnets" $validSubnets `
        "Available: $($availableSubnets.Count)/$($Config.Migration.Subnets.Count)"

    $securityGroupArguments = @(
        "ec2", "describe-security-groups",
        "--group-ids"
    ) + @($Config.Migration.SecurityGroups) + @(
        "--region", $Config.Region
    )

    $sgResult = Invoke-AwsJson -Arguments $securityGroupArguments

    $validSecurityGroups = (
        @($sgResult.SecurityGroups).Count -eq
        $Config.Migration.SecurityGroups.Count
    )

    Write-Check "Migration security groups" $validSecurityGroups `
        "Found: $(@($sgResult.SecurityGroups).Count)/$($Config.Migration.SecurityGroups.Count)"

    $logResult = Invoke-AwsJson -Arguments @(
        "logs", "describe-log-groups",
        "--log-group-name-prefix", $Config.Migration.LogGroup,
        "--region", $Config.Region
    )

    $logGroupExists = @(
        $logResult.logGroups |
        Where-Object {
            $_.logGroupName -eq $Config.Migration.LogGroup
        }
    ).Count -gt 0

    Write-Check "Migration CloudWatch log group" $logGroupExists `
        $Config.Migration.LogGroup

    $validPublicIp = (
        $Config.Migration.AssignPublicIp -in @("ENABLED", "DISABLED")
    )

    Write-Check "Migration public IP setting" $validPublicIp `
        "AssignPublicIp=$($Config.Migration.AssignPublicIp)"
}
catch {
    Write-Check "Migration infrastructure" $false $_.Exception.Message
}

# 5. API task definition and Prisma configuration

try {
    if ([string]::IsNullOrWhiteSpace($TaskDefinition)) {
        throw "No API task definition ARN or revision is available."
    }

    $tdResult = Invoke-AwsJson -Arguments @(
        "ecs", "describe-task-definition",
        "--task-definition", $TaskDefinition,
        "--region", $Config.Region
    )

    $td = $tdResult.taskDefinition

    $familyValid = (
        $null -ne $td -and
        $td.family -eq $Config.Backend.TaskDefinitionFamily
    )

    Write-Check "API task definition family" $familyValid `
        "Actual: $($td.family); Expected: $($Config.Backend.TaskDefinitionFamily)"

    $apiContainer = $td.containerDefinitions |
        Where-Object { $_.name -eq $Config.Backend.ContainerName } |
        Select-Object -First 1

    Write-Check "API container" ($null -ne $apiContainer) `
        "Expected container: $($Config.Backend.ContainerName)"

    if ($apiContainer) {
        $expectedRepository = "$($Config.EcrRegistry)/$($Config.Backend.Repository)"
        $containerImage = [string]$apiContainer.image

        $imageMatches = $false

        if ($apiImage) {
            $expectedTaggedImage = "${expectedRepository}:$ImageTag"
            $expectedDigestImage = "$expectedRepository@$($apiImage.imageDigest)"

            $imageMatches = (
                $containerImage -eq $expectedTaggedImage -or
                $containerImage -eq $expectedDigestImage
            )
        }

        Write-Check "API task definition image" $imageMatches `
            "Configured: $containerImage; Requested tag: $ImageTag"

        $environmentNames = @(
            $apiContainer.environment |
            ForEach-Object { $_.name }
        )

        $secretNames = @(
            $apiContainer.secrets |
            ForEach-Object { $_.name }
        )

        $databaseConfigured = (
            $environmentNames -contains "DATABASE_URL" -or
            $secretNames -contains "DATABASE_URL" -or
            $environmentNames -contains "DIRECT_URL" -or
            $secretNames -contains "DIRECT_URL"
        )

        Write-Check "Prisma database configuration" $databaseConfigured `
            "DATABASE_URL or DIRECT_URL must be configured in environment variables or ECS secrets."

        $executionRoleConfigured = (
            -not [string]::IsNullOrWhiteSpace($td.executionRoleArn)
        )

        Write-Check "Task execution role" $executionRoleConfigured `
            "Execution role: $($td.executionRoleArn)"

        $logConfiguration = $apiContainer.logConfiguration

        $logsConfigured = (
            $null -ne $logConfiguration -and
            $logConfiguration.logDriver -eq "awslogs"
        )

        Write-Check "API container logging" $logsConfigured `
            "Log driver: $($logConfiguration.logDriver)"
    }
}
catch {
    Write-Check "API task definition / Prisma configuration" $false `
        $_.Exception.Message
}

# Final report

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host " PREFLIGHT SUMMARY" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

Write-Host "Passed: $script:Passed" -ForegroundColor Green

$failureColor = if ($script:Failures -gt 0) { "Red" } else { "Green" }

Write-Host "Failed: $script:Failures" -ForegroundColor $failureColor

if ($script:Failures -gt 0) {
    Write-Host ""
    Write-Host "PREFLIGHT FAILED. Do not proceed with deployment." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "PREFLIGHT PASSED. All configured checks succeeded." -ForegroundColor Green
exit 0
