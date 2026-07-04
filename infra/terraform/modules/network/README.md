# Module: network

VPC with public/private subnets across `az_count` AZs (>=2), an internet
gateway, NAT gateway(s), and VPC endpoints.

- **NAT cost knob**: `single_nat_gateway = true` (default) uses one NAT for the
  whole VPC (dev). Set `false` for one NAT per AZ (prod HA). NAT gateways bill
  hourly + per-GB, so this is the main networking cost lever.
- **Endpoints**: an S3 **gateway** endpoint (free) is always created and wired to
  the private route tables. Interface endpoints for SQS, Secrets Manager,
  ECR (api+dkr), CloudWatch Logs, and KMS are created when
  `enable_interface_endpoints = true`, keeping worker traffic off the public
  internet (plan §11 network security).

Private subnets host ECS tasks, workers, and RDS. Public subnets host the NAT
and (later) the ALB.

## Inputs (key)

| Name                         | Default                                              | Purpose                        |
| ---------------------------- | ---------------------------------------------------- | ------------------------------ |
| `name`                       | —                                                    | resource name prefix           |
| `aws_region`                 | —                                                    | builds endpoint service names  |
| `vpc_cidr`                   | `10.0.0.0/16`                                         | VPC address space              |
| `az_count`                   | `2`                                                  | AZ spread (>=2)                |
| `single_nat_gateway`         | `true`                                               | cost vs HA                     |
| `enable_interface_endpoints` | `true`                                               | private AWS API access         |

## Outputs

`vpc_id`, `vpc_cidr`, `public_subnet_ids`, `private_subnet_ids`,
`availability_zones`, `nat_gateway_ids`, `endpoint_security_group_id`.
