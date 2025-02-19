import * as cdk from 'aws-cdk-lib'
import { Construct } from 'constructs'
import { FileFactory } from './functions/file-factory'
import { getConfigEnv } from './config/env'

const envConfig = getConfigEnv()

export class StaticHostingStack extends cdk.Stack {
	constructor(scope: Construct, id: string, props?: cdk.StackProps) {
		super(scope, id, props)

		// 1. Create Bucket
		const sourceBucket = new cdk.aws_s3.Bucket(this, 'MySourceBucket', {
			bucketName: 'jin-jot-source',
			autoDeleteObjects: true,
			removalPolicy: cdk.RemovalPolicy.DESTROY,
		})

		// 2. Create CloudFront Function - Restrict request IP
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
		restrictIpCloudfrontFunction.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY)

		// 3. Create Cloudfront distribution for Admin
		const adminCloudFrontIdentity = new cdk.aws_cloudfront.OriginAccessIdentity(
			this,
			'AdminCloudfrontIdentity',
		)
		adminCloudFrontIdentity.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY)

		const adminCloudFront = new cdk.aws_cloudfront.Distribution(
			this,
			'MyAdminDistribution',
			{
				defaultBehavior: {
					origin: new cdk.aws_cloudfront_origins.S3Origin(sourceBucket, {
						originPath: '/admin',
						originAccessIdentity: adminCloudFrontIdentity,
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
		sourceBucket.grantRead(adminCloudFrontIdentity)
		adminCloudFront.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY)

		new cdk.CfnOutput(this, 'AdminDistributionDomainName', {
			value: adminCloudFront.distributionDomainName,
		})

		// 4. Create CloudFront distribution for Web
		const webCloudFrontIdentity = new cdk.aws_cloudfront.OriginAccessIdentity(
			this,
			'WebCloudfrontIdentity',
		)
		webCloudFrontIdentity.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY)

		const webCloudFront = new cdk.aws_cloudfront.Distribution(
			this,
			'MyWebDistribution',
			{
				defaultBehavior: {
					origin: new cdk.aws_cloudfront_origins.S3Origin(sourceBucket, {
						originPath: '/web',
						originAccessIdentity: webCloudFrontIdentity,
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
			},
		)
		sourceBucket.grantRead(webCloudFrontIdentity)
		webCloudFront.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY)

		new cdk.CfnOutput(this, 'WebDistributionDomainName', {
			value: webCloudFront.distributionDomainName,
		})
	}
}
