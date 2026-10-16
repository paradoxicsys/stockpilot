terraform {
  required_version = ">= 1.6"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }

  # State is local by default so the project works out of the box.
  # For a team, store it remotely instead, e.g.:
  # backend "s3" {
  #   bucket       = "my-terraform-state-bucket"
  #   key          = "stockpilot/terraform.tfstate"
  #   region       = "ap-south-1"
  #   use_lockfile = true
  # }
}

provider "aws" {
  region = var.region

  default_tags {
    tags = {
      Project   = var.project
      ManagedBy = "terraform"
    }
  }
}
