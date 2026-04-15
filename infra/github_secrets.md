# infra/github_secrets.md
# Variables que debes configurar en GitHub → Settings → Secrets and variables → Actions

## Secretos requeridos

| Secret                        | Valor                                                   |
|-------------------------------|---------------------------------------------------------|
| AWS_ACCESS_KEY_ID             | Key de un IAM User con permisos de deploy (no root)     |
| AWS_SECRET_ACCESS_KEY         | Secret del mismo IAM User                               |
| AWS_REGION                    | us-east-1  (o tu región)                                |
| S3_BUCKET_FRONTEND            | render-app-frontend  (nombre del bucket del frontend)   |
| S3_BUCKET_ARTIFACTS           | render-app-artifacts (nombre del bucket de artefactos)  |
| CLOUDFRONT_DISTRIBUTION_ID    | E1XXXXXXXXX  (ID de tu distribución CloudFront)         |

## IAM User de GitHub Actions
Crea un IAM User dedicado (NO uses tu cuenta root) con la siguiente policy:

{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject", "s3:GetObject", "s3:DeleteObject",
        "s3:ListBucket", "s3:PutObjectAcl"
      ],
      "Resource": [
        "arn:aws:s3:::render-app-frontend",
        "arn:aws:s3:::render-app-frontend/*",
        "arn:aws:s3:::render-app-artifacts",
        "arn:aws:s3:::render-app-artifacts/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": ["cloudfront:CreateInvalidation"],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "codedeploy:CreateDeployment",
        "codedeploy:GetDeployment",
        "codedeploy:GetDeploymentConfig",
        "codedeploy:RegisterApplicationRevision"
      ],
      "Resource": "*"
    }
  ]
}
