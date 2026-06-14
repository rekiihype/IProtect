import { network } from "hardhat";

async function main() {
  const conn = await network.connect();
  const ethers = conn.ethers;

  const IPProtection = await ethers.getContractFactory("IPProtection");
  const ipProtection = await IPProtection.deploy();

  await ipProtection.waitForDeployment();

  const address = await ipProtection.getAddress();
  console.log("IPProtection deployed to:", address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
