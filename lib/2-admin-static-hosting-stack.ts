import * as cdk from 'aws-cdk-lib'
import { Construct } from 'constructs'
import { FileFactory } from './functions/file-factory'
import { getConfigEnv } from './config/env'

const envConfig = getConfigEnv()

export class AdminStaticHostingStack extends cdk.Stack {
	constructor(scope: Construct, id: string, props?: cdk.StackProps) {
		super(scope, id, props)

		// 1. Create Bucket
		const sourceBucket = new cdk.aws_s3.Bucket(this, 'MySourceBucket', {
			bucketName: 'jin-jot-source',
		})
		sourceBucket.policy?.applyRemovalPolicy(cdk.RemovalPolicy.RETAIN)

		// 2. Create CloudFront function
		const restrictIpCloudfrontFunction = new cdk.aws_cloudfront.Function(
			this,
			'RestrictIpFunction',
			{
				autoPublish: true,
				functionName: 'RestrictRequestIp',
				comment: 'Only allow some IPs to access origin this CloudFront',
				runtime: cdk.aws_cloudfront.FunctionRuntime.JS_2_0,
				code: cdk.aws_cloudfront.FunctionCode.fromInline(
					FileFactory.parse('lib/functions/restrict-ip.js', {
						__ALLOWED_IPS__: JSON.stringify(
							envConfig.ALLOWED_IP?.split(',').filter((v) => v) ?? '',
						),
					}),
				),
			},
		)

		// 3. Create Cloudfront distribution
		const cloudFrontIdentity = new cdk.aws_cloudfront.OriginAccessIdentity(
			this,
			'WebCloudfrontIdentity',
		)
		const adminCloudFront = new cdk.aws_cloudfront.Distribution(
			this,
			'MyAdminDistribution',
			{
				defaultBehavior: {
					origin: new cdk.aws_cloudfront_origins.S3Origin(sourceBucket, {
						originPath: '/admin',
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
					functionAssociations: [
						{
							function: restrictIpCloudfrontFunction,
							eventType: cdk.aws_cloudfront.FunctionEventType.VIEWER_REQUEST,
						},
					],
				},
				priceClass: cdk.aws_cloudfront.PriceClass.PRICE_CLASS_ALL,
				defaultRootObject: 'index.html',
				errorResponses: [
					{
						ttl: cdk.Duration.seconds(10),
						httpStatus: 403,
						responseHttpStatus: 403,
						responsePagePath: '/index.html',
					},
				],
			},
		)
		sourceBucket.grantRead(cloudFrontIdentity)
		adminCloudFront.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY)

		new cdk.CfnOutput(this, 'AdminDistributionDomainName', {
			value: adminCloudFront.distributionDomainName,
		})
	}
}
