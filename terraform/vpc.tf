data "aws_availability_zones" "available" {
  state = "available"
}

locals {
  azs = slice(data.aws_availability_zones.available.names, 0, 2)
}

# Two public + two private subnets across two AZs.
#   public  -> internet-facing load balancers (ingress-nginx), NAT gateway
#   private -> EKS worker nodes (no public IPs)
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 6.0"

  name = "${var.project}-vpc"
  cidr = var.vpc_cidr
  azs  = local.azs

  public_subnets  = [for i, _ in local.azs : cidrsubnet(var.vpc_cidr, 8, i)]      # 10.20.0.0/24, 10.20.1.0/24
  private_subnets = [for i, _ in local.azs : cidrsubnet(var.vpc_cidr, 8, i + 10)] # 10.20.10.0/24, 10.20.11.0/24

  enable_nat_gateway   = true
  single_nat_gateway   = true # one NAT keeps the classroom bill down; use one per AZ in production
  enable_dns_hostnames = true
  enable_dns_support   = true

  # Tags that tell Kubernetes which subnets to place load balancers in
  public_subnet_tags = {
    "kubernetes.io/role/elb" = 1
  }
  private_subnet_tags = {
    "kubernetes.io/role/internal-elb" = 1
  }
}
