terraform {
  backend "s3" {
    bucket       = "reelify-tfstate-666730152143"
    key          = "envs/prod/terraform.tfstate"
    region       = "us-east-1"
    encrypt      = true
    use_lockfile = true
  }
}
