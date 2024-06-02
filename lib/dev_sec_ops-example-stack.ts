import * as cdk from 'aws-cdk-lib';
import * as autoscale from 'aws-cdk-lib/aws-autoscaling'; 
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as fs from 'fs';
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

    const bastionAsg = new autoscale.AutoScalingGroup(this, 'BastionASG', {
      vpc: vpc,
      vpcSubnets: vpc.selectSubnets({ 
        subnetType: ec2.SubnetType.PUBLIC,
      }),
      minCapacity: 2,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T2, ec2.InstanceSize.MICRO),
      machineImage: new ec2.AmazonLinuxImage({generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2}),
      keyName: 'bastion'
    })

    bastionAsg.connections.allowFrom(ec2.Peer.ipv4('94.9.162.214/32'), ec2.Port.tcp(22))

    const jenkinsUserData = ec2.UserData.forLinux();
    jenkinsUserData.addCommands(
      'mkdir -p /home/ec2-user/.ssh',
      `echo ${fs.readFileSync('../bastion_id_rsa.pub')} > /home/ec2-user/.ssh/authorized_keys`,
      'chown -R ec2-user:ec2-user /home/ec2-user/.ssh',
      'chmod 600 /home/ec2-user/.ssh/authorized_keys'
    )

    const jenkinsAsg = new autoscale.AutoScalingGroup(this, 'JenkinsASG', {
      vpc: vpc,
      vpcSubnets: vpc.selectSubnets({
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      }),
      minCapacity: 2,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T2, ec2.InstanceSize.MICRO),
      machineImage: new ec2.AmazonLinuxImage({generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2})
    })
    
    jenkinsAsg.connections.allowFrom(bastionAsg, ec2.Port.tcp(8080))

  }
}
