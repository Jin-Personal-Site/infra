import * as cdk from 'aws-cdk-lib'
import { Construct } from 'constructs'

export class WebStaticHostingStack extends cdk.Stack {
	constructor(scope: Construct, id: string, props?: cdk.StackProps) {
		super(scope, id, props)

		// 1. Create Bucket
		const sourceBucket = new cdk.aws_s3.Bucket(this, 'MySourceBucket', {
			bucketName: 'jin-jot-source',
		})
		sourceBucket.policy?.applyRemovalPolicy(cdk.RemovalPolicy.RETAIN)

		// 2. Create Cloudfront distribution
		const cloudFrontIdentity = new cdk.aws_cloudfront.OriginAccessIdentity(
			this,
			'WebCloudfrontIdentity'
		)
		const webCloudFront = new cdk.aws_cloudfront.Distribution(
			this,
			'MyWebDistribution',
			{
				defaultBehavior: {
					origin: new cdk.aws_cloudfront_origins.S3Origin(sourceBucket, {
						originPath: '/web',
						originAccessIdentity: cloudFrontIdentity,
					}),
					compress: true,
					viewerProtocolPolicy:
						cdk.aws_cloudfront.ViewerProtocolPolicy.ALLOW_ALL,
					allowedMethods:
						cdk.aws_cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
					cachePolicy: cdk.aws_cloudfront.CachePolicy.CACHING_OPTIMIZED,
					originRequestPolicy:
						cdk.aws_cloudfront.OriginRequestPolicy
							.ALL_VIEWER_EXCEPT_HOST_HEADER,
				},
				priceClass: cdk.aws_cloudfront.PriceClass.PRICE_CLASS_ALL,
				defaultRootObject: 'index.html',
				errorResponses: [
					{
						ttl: cdk.Duration.seconds(10),
						httpStatus: 403,
						responseHttpStatus: 404,
						responsePagePath: '/404.html',
					},
				],
			}
		)
		sourceBucket.grantRead(cloudFrontIdentity)
		webCloudFront.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY)

		new cdk.CfnOutput(this, 'AdminDistributionDomainName', {
			value: webCloudFront.distributionDomainName,
		})
		// 2. Create CloudFront distribute
		// 3. Create Route53
		// 4. Setup VPC, subnets, IGW
		// 5. Create a tunnel EC2 instance
		// 6. Create RDS database
	}
}
