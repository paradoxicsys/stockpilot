# ---------------------------------------------------------------------------
# Lets the GitHub Actions deploy job assume an AWS role with a short-lived
# OIDC token, so no AWS access keys are ever stored in GitHub.
# Only created when var.github_repository is set.
# ---------------------------------------------------------------------------
locals {
  github_enabled = var.github_repository != ""
}

resource "aws_iam_openid_connect_provider" "github" {
  count = local.github_enabled && var.create_github_oidc_provider ? 1 : 0

  url            = "https://token.actions.githubusercontent.com"
  client_id_list = ["sts.amazonaws.com"]
}

data "aws_iam_openid_connect_provider" "github" {
  count = local.github_enabled && !var.create_github_oidc_provider ? 1 : 0
  url   = "https://token.actions.githubusercontent.com"
}

locals {
  github_oidc_arn = !local.github_enabled ? "" : (
    var.create_github_oidc_provider ? aws_iam_openid_connect_provider.github[0].arn : data.aws_iam_openid_connect_provider.github[0].arn
  )
}

resource "aws_iam_role" "github_deploy" {
  count = local.github_enabled ? 1 : 0
  name  = "${var.project}-github-deploy"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Federated = local.github_oidc_arn }
      Action    = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
        }
        # Only workflows on the main branch of this repository may deploy
        StringLike = {
          "token.actions.githubusercontent.com:sub" = "repo:${var.github_repository}:ref:refs/heads/main"
        }
      }
    }]
  })
}

# Just enough AWS permission to fetch a kubeconfig; what the role may do
# inside Kubernetes is controlled by the EKS access entry in eks.tf.
resource "aws_iam_role_policy" "github_deploy" {
  count = local.github_enabled ? 1 : 0
  name  = "eks-describe"
  role  = aws_iam_role.github_deploy[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["eks:DescribeCluster"]
      Resource = module.eks.cluster_arn
    }]
  })
}
