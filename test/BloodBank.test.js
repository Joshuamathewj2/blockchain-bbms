const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("BloodBank Smart Contract", function () {
  let BloodBank, bloodBank;
  let admin, donor1, hospital1, recipient;

  beforeEach(async function () {
    [admin, donor1, hospital1, recipient] = await ethers.getSigners();
    BloodBank = await ethers.getContractFactory("BloodBank");
    bloodBank = await BloodBank.deploy();
    await bloodBank.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the deployer as the admin", async function () {
      expect(await bloodBank.admin()).to.equal(admin.address);
    });
  });

  describe("Donor Registration", function () {
    it("Should allow a donor to register with valid details", async function () {
      await expect(bloodBank.connect(donor1).registerDonor("Alice", 0, 25, "1234567890"))
        .to.emit(bloodBank, "DonorRegistered");

      const donor = await bloodBank.donors(donor1.address);
      expect(donor.name).to.equal("Alice");
      expect(donor.isRegistered).to.be.true;
    });

    it("Should reject donor registration under 18 years old", async function () {
      await expect(
        bloodBank.connect(donor1).registerDonor("Young Bob", 0, 16, "1234567890")
      ).to.be.revertedWith("BloodBank: age must be 18-65");
    });
  });

  describe("Hospital Registration & Verification", function () {
    it("Should allow hospital registration and admin verification", async function () {
      await bloodBank.connect(hospital1).registerHospital("Apollo City", "Downtown");
      let hospital = await bloodBank.hospitals(hospital1.address);
      expect(hospital.isVerified).to.be.false;

      await bloodBank.connect(admin).verifyHospital(hospital1.address);
      hospital = await bloodBank.hospitals(hospital1.address);
      expect(hospital.isVerified).to.be.true;
    });
  });

  describe("Donation & Request Lifecycle", function () {
    it("Should record blood donation and allow verified hospital request approval", async function () {
      // Register donor & donate
      await bloodBank.connect(donor1).registerDonor("Alice", 0, 25, "1234567890"); // Group A+ (0)
      await expect(bloodBank.connect(donor1).donateBlood("Apollo City"))
        .to.emit(bloodBank, "BloodDonated");

      // Register hospital & verify
      await bloodBank.connect(hospital1).registerHospital("Apollo City", "Downtown");
      await bloodBank.connect(admin).verifyHospital(hospital1.address);

      // Hospital places blood request
      await expect(bloodBank.connect(hospital1).requestBlood(0, 1, "Patient John", "CRITICAL"))
        .to.emit(bloodBank, "BloodRequested");

      const requestIds = await bloodBank.getAllRequestIds();
      expect(requestIds.length).to.equal(1);

      // Admin approves request
      await expect(bloodBank.connect(admin).approveRequest(requestIds[0]))
        .to.emit(bloodBank, "RequestApproved");
    });
  });
});
