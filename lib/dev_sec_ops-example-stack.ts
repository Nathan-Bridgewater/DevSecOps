import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import { Construct } from 'constructs';

export class DevSecOpsExampleStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    cdk.Tags.of(this).add('CostCentre', 'TEAM-A')
    cdk.Tags.of(this).add('Project', 'Blue Whale')

    // Creates VPC with 2 public / 2 private subnets
    // Each subnet has its own route table
    // Each private subnet has a route to local and to a NAT gateway in a public subnet
    // Each public subnet has a route to locakl and the internet gateway
    const vpc = new ec2.Vpc(this, 'MyVpc', {
      // Each decimal number is essentially 1 byte (or 8 bits)
      ipAddresses: ec2.IpAddresses.cidr('10.0.0.0/16')
    })

    const bastion = new ec2.Instance(this, 'BastionHost', {
      vpc: vpc,
      vpcSubnets: vpc.selectSubnets({subnetType: ec2.SubnetType.PUBLIC}),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.BURSTABLE2, ec2.InstanceSize.MICRO),
      machineImage: new ec2.AmazonLinuxImage({generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2}),
      keyName: 'bastion'
    })

    bastion.connections.allowFrom(ec2.Peer.ipv4('94.9.162.214/32'), ec2.Port.tcp(22))
  }
}
