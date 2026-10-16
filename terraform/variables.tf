variable "region" {
  description = "AWS region for all resources"
  type        = string
  default     = "ap-south-1"
}

variable "project" {
  description = "Name prefix for every resource"
  type        = string
  default     = "stockpilot"
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.20.0.0/16"
}

variable "kubernetes_version" {
  description = "EKS Kubernetes version. Pick one in AWS standard support to avoid extended-support charges."
  type        = string
  default     = "1.36"
}

variable "node_instance_types" {
  description = "EC2 instance types for the managed node group"
  type        = list(string)
  default     = ["t3.medium"]
}

variable "node_desired_size" {
  type    = number
  default = 3
}

variable "node_min_size" {
  type    = number
  default = 2
}

variable "node_max_size" {
  type    = number
  default = 4
}

variable "github_repository" {
  description = "GitHub repo allowed to deploy via OIDC, as \"owner/repo\". Leave empty to skip creating the CI deploy role."
  type        = string
  default     = ""
}

variable "github_oidc_sub_prefix" {
  description = <<-EOT
    The repo's OIDC subject prefix when GitHub uses immutable subjects, e.g.
    "repo:owner@1234/repo@5678". Find it with:
      gh api repos/<owner>/<repo>/actions/oidc/customization/sub --jq .sub_claim_prefix
    Leave empty if your tokens use the classic "repo:owner/repo" format.
  EOT
  type        = string
  default     = ""
}

variable "create_github_oidc_provider" {
  description = "Create the GitHub Actions OIDC provider. Set false if your AWS account already has one."
  type        = bool
  default     = true
}
