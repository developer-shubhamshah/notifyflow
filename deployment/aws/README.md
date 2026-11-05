
# NotifyFlow AWS Manual Deployment Toolkit

## 1. Overview

This toolkit supports manual deployment of NotifyFlow frontend and backend applications to AWS ECS.

The backend workflow separates task-definition preparation, database migration, and ECS deployment. This allows production database migrations to be reviewed and executed independently.

## 2. Scripts

| Script | Purpose |
|---|---|
| `config.ps1` | AWS account configuration, region, cluster, repositories, services and migration networking |
| `common.ps1` | Shared PowerShell helpers |
| `deploy-frontend.ps1` | Deploy frontend image to ECS |
| `prepare-backend.ps1` | Register a new API task definition without updating ECS |
| `run-prisma-migrations.ps1` | Run Prisma migrations in a one-off Fargate task |
| `deploy-backend-task.ps1` | Deploy a prepared API task definition to ECS |
| `deploy-backend.ps1` | Legacy direct deployment script; not part of the recommended manual workflow |

## 3. AWS Configuration

Current deployment configuration:

- Region: `ap-south-1`
- Cluster: `notifyflow-cluster`
- ECR registry: `981006822520.dkr.ecr.ap-south-1.amazonaws.com`

### Frontend

- Repository: `notifyflow-web`
- ECS service: `notifyflow-web-service`
- Container: `notifyflow-web`

### Backend

- Repository: `notifyflow-api`
- ECS service: `notifyflow-api-service`
- Container: `notifyflow-api`

Migration subnets, security groups, public IP configuration and CloudWatch log group are configured in `config.ps1`.

Review `config.ps1` before use if AWS infrastructure changes.

## 4. Prerequisites

- AWS CLI v2 installed and configured.
- Correct AWS deployment identity.
- PowerShell available.
- Docker images built and pushed to the appropriate ECR repositories.
- IAM permissions for required ECR and ECS operations.
- Required CloudWatch Logs permissions for inspecting migration logs.
- Production database backup reviewed and available before migrations.

Verify AWS identity:

```powershell
aws sts get-caller-identity
```

These deployment scripts use existing ECR images. They do not build or push Docker images.

## 5. Frontend Deployment

Build and push the frontend image to ECR first.

From the project root:

```powershell
npm run deploy:web
```

This deploys the configured frontend image tag to `notifyflow-web-service`.

## 6. Manual Backend Deployment

The recommended backend deployment process has three independent stages.

### Stage 1: Prepare the API task definition

Build and push the API image to ECR first.

From the project root:

```powershell
npm run prepare:api
```

This script:

1. Verifies the API image exists in ECR.
2. Retrieves the current API ECS task definition.
3. Updates the API container image.
4. Registers a new task-definition revision.
5. Prints the new task-definition ARN.

It does NOT update the ECS service.

Save the new task-definition ARN displayed in the output.

### Stage 2: Run production Prisma migrations

Review and commit the required Prisma migration files.

Ensure the newly prepared task definition points to an API image containing those migration files.

Run the migration using the new task-definition ARN:

```powershell
npm run db:migrate:prod -- -TaskDefinition "NEW_TASK_DEFINITION_ARN"
```

Example format:

```powershell
npm run db:migrate:prod -- -TaskDefinition "arn:aws:ecs:ap-south-1:981006822520:task-definition/notifyflow-api:7"
```

The example revision is illustrative. Use the actual ARN printed by `prepare:api`.

The migration script:

- Requires the explicit `-ConfirmProduction` switch.
- Starts a one-off Fargate task.
- Runs `npx prisma migrate deploy`.
- Waits for the task to stop.
- Checks the API container exit code.
- Reports migration success or failure.

It does not run `prisma db push`.

Inspect migration logs in:

`/ecs/notifyflow-api`

Do not proceed with backend deployment if the migration fails.

### Stage 3: Deploy the prepared API task definition

Only after successful migration, run:

```powershell
npm run deploy:api -- -TaskDefinition "NEW_TASK_DEFINITION_ARN"
```

Use exactly the same task-definition ARN from Stage 1.

The deployment script:

1. Validates the task definition and API container.
2. Retrieves the current ECS service state.
3. Updates the ECS service.
4. Waits for ECS service stability.
5. Verifies the final task definition and task counts.
6. Detects an ECS rollback if the expected task definition is not active.

## 7. Recommended Production Release Sequence

1. Review application changes and Prisma migration files.
2. Build and push the API image to ECR.
3. Prepare the new API task definition.
4. Review the task-definition ARN and container image.
5. Verify the RDS backup.
6. Run Prisma migrations using the prepared task definition.
7. Confirm migration success.
8. Deploy the API task definition to ECS.
9. Verify ECS service health and application behavior.
10. Build and push the frontend image.
11. Deploy the frontend.
12. Smoke-test the website and API endpoints.

### Database compatibility

Migrations run while the existing API service may still be running.

Design production migrations to be backward compatible with the currently running API version. For breaking schema changes, use an expand-and-contract migration strategy and plan the application rollout accordingly.

## 8. Deployment Safety

- Prefer immutable ECR image tags for production traceability.
- Review migration SQL before applying it.
- Verify an RDS backup before production migration.
- Always pass the newly prepared task-definition ARN to the migration script.
- Deploy the API only after successful migration.
- Do not use the legacy `deploy-backend.ps1` for this manual workflow.
- ECS service stability alone does not prove application correctness.
- Verify target health, application logs and API smoke tests after deployment.
- Do not rerun failed migrations blindly; inspect the task and database migration history first.

## 9. Important Notes

- `prepare-backend.ps1` registers a task definition but does not update ECS.
- `run-prisma-migrations.ps1` runs a one-off migration task but does not update the ECS service.
- `deploy-backend-task.ps1` updates ECS but does not run migrations.
- `deploy-frontend.ps1` deploys the frontend independently.
- None of these workflows intentionally deletes ECS services, ECR repositories or databases.
