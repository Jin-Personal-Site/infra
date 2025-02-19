import * as cdk from 'aws-cdk-lib'
import { Construct } from 'constructs'
import { FileFactory } from './functions/file-factory'
import { getConfigEnv } from './config/env'

const envConfig = getConfigEnv()

export class ServerAndDatabaseStack extends cdk.Stack {
	constructor(scope: Construct, id: string, props?: cdk.StackProps) {
		super(scope, id, props)

		// 1. Setup VPC, subnets, IGW
		const vpc = new cdk.aws_ec2.Vpc(this, 'JinJotVPC', {
			ipAddresses: cdk.aws_ec2.IpAddresses.cidr('10.0.0.0/16'),
			vpcName: 'jin-jot-vpc',
			maxAzs: 2,
			subnetConfiguration: [
				{
					subnetType: cdk.aws_ec2.SubnetType.PUBLIC,
					cidrMask: 24,
					name: 'jj-public-subnet',
				},
				{
					subnetType: cdk.aws_ec2.SubnetType.PRIVATE_ISOLATED,
					cidrMask: 24,
					name: 'jj-private-subnet',
				},
			],
		})

		// 2. Create EC2 instance for Tunnel SSM
		const tunnelSecurityGroup = new cdk.aws_ec2.SecurityGroup(
			this,
			'TunnelSecurityGroup',
			{
				vpc,
				description: 'Security group for Tunnel instance',
				securityGroupName: 'tunnel-instance',
				allowAllOutbound: true,
			},
		)
		tunnelSecurityGroup.addIngressRule(
			cdk.aws_ec2.Peer.anyIpv4(),
			cdk.aws_ec2.Port.SSH,
		)

		const tunnelInstance = new cdk.aws_ec2.Instance(this, 'TunnelInstance', {
			vpc,
			instanceName: 'JJ-tunnel',
			securityGroup: tunnelSecurityGroup,
			associatePublicIpAddress: true,
			vpcSubnets: {
				subnetType: cdk.aws_ec2.SubnetType.PUBLIC,
			},
			instanceType: cdk.aws_ec2.InstanceType.of(
				cdk.aws_ec2.InstanceClass.T3A,
				cdk.aws_ec2.InstanceSize.NANO,
			),
			machineImage: cdk.aws_ec2.MachineImage.latestAmazonLinux2023(),
			userData: cdk.aws_ec2.UserData.forLinux({
				shebang: FileFactory.parse('lib/scripts/user-data-tunnel.bash'),
			}),
			ssmSessionPermissions: true,
		})

		// 3. Create EC2 instance for API server
		const apiSecurityGroup = new cdk.aws_ec2.SecurityGroup(
			this,
			'ApiSecurityGroup',
			{
				vpc,
				description: 'Security group for API instance',
				securityGroupName: 'api-instance',
				allowAllOutbound: true,
			},
		)
		apiSecurityGroup.addIngressRule(
			cdk.aws_ec2.Peer.anyIpv4(),
			cdk.aws_ec2.Port.SSH,
		)
		const allowedIps = process.env.ALLOWED_IP?.split(',') ?? []
		if (allowedIps.length) {
			allowedIps.forEach((ip) => {
				apiSecurityGroup.addIngressRule(
					cdk.aws_ec2.Peer.ipv4(`${ip}/32`),
					cdk.aws_ec2.Port.HTTP,
				)
				apiSecurityGroup.addIngressRule(
					cdk.aws_ec2.Peer.ipv4(`${ip}/32`),
					cdk.aws_ec2.Port.HTTPS,
				)
			})
		} else {
			apiSecurityGroup.addIngressRule(
				cdk.aws_ec2.Peer.anyIpv4(),
				cdk.aws_ec2.Port.HTTP,
			)
			apiSecurityGroup.addIngressRule(
				cdk.aws_ec2.Peer.anyIpv4(),
				cdk.aws_ec2.Port.HTTPS,
			)
		}

		const apiInstance = new cdk.aws_ec2.Instance(this, 'ApiInstance', {
			vpc,
			instanceName: 'JJ-api',
			securityGroup: apiSecurityGroup,
			associatePublicIpAddress: true,
			vpcSubnets: {
				subnetType: cdk.aws_ec2.SubnetType.PUBLIC,
			},
			instanceType: cdk.aws_ec2.InstanceType.of(
				cdk.aws_ec2.InstanceClass.T3A,
				cdk.aws_ec2.InstanceSize.MICRO,
			),
			machineImage: cdk.aws_ec2.MachineImage.latestAmazonLinux2023(),
			userData: cdk.aws_ec2.UserData.forLinux({
				shebang: FileFactory.parse('lib/scripts/user-data-api.bash', {
					__DOMAIN__: envConfig.APP_DOMAIN ? `api.${envConfig.APP_DOMAIN}` : '',
				}),
			}),
			keyPair: cdk.aws_ec2.KeyPair.fromKeyPairName(
				this,
				'apiKeyPair',
				'tunnel_key',
			),
		})

		// 4. Create S3 bucket
		const resourceBucket = new cdk.aws_s3.Bucket(this, 'MyAssetBucket', {
			bucketName: 'jin-jot-resources',
		})
		resourceBucket.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY)

		// 5. Create RDS database
		const database = new cdk.aws_rds.DatabaseInstance(this, 'DBInstance', {
			engine: cdk.aws_rds.DatabaseInstanceEngine.postgres({
				version: cdk.aws_rds.PostgresEngineVersion.VER_16_4,
			}),
			vpc,
			instanceIdentifier: 'jin-jot-db',
			instanceType: cdk.aws_ec2.InstanceType.of(
				cdk.aws_ec2.InstanceClass.T4G,
				cdk.aws_ec2.InstanceSize.MICRO,
			),
			storageType: cdk.aws_rds.StorageType.GP2,
			allocatedStorage: 20,
			credentials: cdk.aws_rds.Credentials.fromUsername('postgres', {
				password: cdk.SecretValue.unsafePlainText('postgres'),
			}),
			multiAz: false,
			databaseName: 'personal_site',
			subnetGroup: new cdk.aws_rds.SubnetGroup(this, 'DatabaseSubnetGroup', {
				vpc,
				description: 'Subnet group for RDS instance',
				removalPolicy: cdk.RemovalPolicy.DESTROY,
				vpcSubnets: {
					subnets: vpc.isolatedSubnets,
				},
			}),
			publiclyAccessible: false,
		})
		database.connections.allowFrom(tunnelInstance, cdk.aws_ec2.Port.POSTGRES)
		database.connections.allowFrom(apiInstance, cdk.aws_ec2.Port.POSTGRES)
	}
}
