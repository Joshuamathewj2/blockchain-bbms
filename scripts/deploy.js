// scripts/deploy.js
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("\n🩸 Deploying BloodChain Smart Contract...\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer address:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Deployer balance:", hre.ethers.formatEther(balance), "ETH\n");

  // Deploy
  const BloodBank = await hre.ethers.getContractFactory("BloodBank");
  const bloodBank = await BloodBank.deploy();
  await bloodBank.waitForDeployment();

  const address = await bloodBank.getAddress();
  console.log("✅ BloodBank deployed to:", address);
  console.log("   Transaction hash:", bloodBank.deploymentTransaction().hash);

  // Write address to backend .env
  const envPath = path.join(__dirname, "../backend/.env");
  if (fs.existsSync(envPath)) {
    let env = fs.readFileSync(envPath, "utf8");
    env = env.replace(/CONTRACT_ADDRESS=.*/, `CONTRACT_ADDRESS=${address}`);
    fs.writeFileSync(envPath, env);
    console.log("\n✅ Updated backend/.env with CONTRACT_ADDRESS");
  } else {
    console.log("\n📋 Add this to backend/.env:");
    console.log(`   CONTRACT_ADDRESS=${address}`);
  }

  // Save ABI to frontend
  const artifactPath = path.join(__dirname, "../artifacts/contracts/BloodBank.sol/BloodBank.json");
  if (fs.existsSync(artifactPath)) {
    const artifact = JSON.parse(fs.readFileSync(artifactPath));
    const abiOut = path.join(__dirname, "../frontend/src/utils/BloodBankABI.json");
    fs.mkdirSync(path.dirname(abiOut), { recursive: true });
    fs.writeFileSync(abiOut, JSON.stringify({ address, abi: artifact.abi }, null, 2));
    console.log("✅ ABI saved to frontend/src/utils/BloodBankABI.json");
  }

  console.log("\n🚀 Deployment complete!\n");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
