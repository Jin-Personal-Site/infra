#!/bin/bash
# Install SSM Agent
sudo yum install -y https://s3.ap-southeast-1.amazonaws.com/ec2-downloads-windows/SSMAgent/latest/linux_amd64/amazon-ssm-agent.rpm

# Ensure SSM agent started
sudo systemctl start amazon-ssm-agent
