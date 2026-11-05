$Config = @{
    Region = "ap-south-1"
    Cluster = "notifyflow-cluster"
    EcrRegistry = "981006822520.dkr.ecr.ap-south-1.amazonaws.com"
    Frontend = @{ Repository="notifyflow-web"; Service="notifyflow-web-service"; TaskDefinitionFamily="notifyflow-web"; ContainerName="notifyflow-web" }
    Backend = @{ Repository="notifyflow-api"; Service="notifyflow-api-service"; TaskDefinitionFamily="notifyflow-api"; ContainerName="notifyflow-api" }
    Migration = @{
        Subnets = @("subnet-0f3e17aa3f5041817","subnet-08b890a8ce4e81e11")
        SecurityGroups = @("sg-0e72bf85f76d6a417")
        AssignPublicIp = "ENABLED"
        LogGroup = "/ecs/notifyflow-api"
    }
}
