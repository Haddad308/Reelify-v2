terraform {
  backend "s3" {
    bucket       = "reelify-tfstate-666730152143"
    key          = "envs/dev/terraform.tfstate"
    region       = "us-east-1"
    encrypt      = true
    use_lockfile = true # S3-native state locking (DynamoDB table also available)
  }
}
