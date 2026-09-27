$ErrorActionPreference = "Stop"

# Get AWS Account ID and Region
$AccountId = (aws sts get-caller-identity --query Account --output text)
$Region = (aws configure get region)
if (-not $Region) {
    $Region = "us-east-1"
}

$RegistryUrl = "$AccountId.dkr.ecr.$Region.amazonaws.com"

Write-Host "Logging into ECR $RegistryUrl in region $Region..."
aws ecr get-login-password --region $Region | docker login --username AWS --password-stdin $RegistryUrl

$Repositories = @("finchatbot-frontend", "finchatbot-backend", "finchatbot-python")

foreach ($Repo in $Repositories) {
    # Check if repo exists, if not create it
    Write-Host "Checking if ECR repository $Repo exists..."
    $repoExists = aws ecr describe-repositories --repository-names $Repo 2>$null
    if (-not $repoExists) {
        Write-Host "Creating ECR repository $Repo..."
        aws ecr create-repository --repository-name $Repo --region $Region | Out-Null
    }
}

# 1. Build and push Frontend
Write-Host "Building frontend image..."
docker build -t finchatbot-frontend ./Frontend
docker tag finchatbot-frontend:latest "$RegistryUrl/finchatbot-frontend:latest"
Write-Host "Pushing frontend image..."
docker push "$RegistryUrl/finchatbot-frontend:latest"

# 2. Build and push Backend
Write-Host "Building backend image..."
docker build -t finchatbot-backend ./Backend
docker tag finchatbot-backend:latest "$RegistryUrl/finchatbot-backend:latest"
Write-Host "Pushing backend image..."
docker push "$RegistryUrl/finchatbot-backend:latest"

# 3. Build and push Python-Backend
Write-Host "Building python backend image..."
docker build -t finchatbot-python ./Python-Backend
docker tag finchatbot-python:latest "$RegistryUrl/finchatbot-python:latest"
Write-Host "Pushing python backend image..."
docker push "$RegistryUrl/finchatbot-python:latest"

Write-Host "All images successfully built and pushed to ECR!"
