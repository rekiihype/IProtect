import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.create();

describe("IPProtection", function () {
  async function deploy() {
    const [admin, verifier, user1, user2] = await ethers.getSigners();
    const contract = await ethers.deployContract("IPProtection");

    const VERIFIER_ROLE = await contract.VERIFIER_ROLE();
    await contract.connect(admin).grantRole(VERIFIER_ROLE, verifier.address);

    return { contract, admin, verifier, user1, user2, VERIFIER_ROLE };
  }

  // ─── registerIP ──────────────────────────────────────────────────────────────

  describe("registerIP", function () {
    it("should register an IP, emit IPRegistered, and return ID 1", async function () {
      const { contract, user1 } = await deploy();
      await expect(
        contract.connect(user1).registerIP("My Work", "A description", "QmHash1")
      )
        .to.emit(contract, "IPRegistered")
        .withArgs(1n, user1.address, "QmHash1", "My Work");

      expect(await contract.getTotalIPCount()).to.equal(1n);
    });

    it("should assign sequential IDs for multiple registrations", async function () {
      const { contract, user1 } = await deploy();
      await contract.connect(user1).registerIP("Work A", "", "QmHashA");
      await contract.connect(user1).registerIP("Work B", "", "QmHashB");
      expect(await contract.getTotalIPCount()).to.equal(2n);
    });

    it("should revert on empty title", async function () {
      const { contract, user1 } = await deploy();
      await expect(
        contract.connect(user1).registerIP("", "desc", "QmHash1")
      ).to.be.revertedWith("Title cannot be empty");
    });

    it("should revert on empty IPFS hash", async function () {
      const { contract, user1 } = await deploy();
      await expect(
        contract.connect(user1).registerIP("Title", "desc", "")
      ).to.be.revertedWith("IPFS hash cannot be empty");
    });

    it("should revert on duplicate IPFS hash", async function () {
      const { contract, user1, user2 } = await deploy();
      await contract.connect(user1).registerIP("Work A", "", "QmDupe");
      await expect(
        contract.connect(user2).registerIP("Work B", "", "QmDupe")
      ).to.be.revertedWith("This file has already been registered");
    });
  });

  // ─── getIPDetails / isHashRegistered / getTotalIPCount ───────────────────────

  describe("getIPDetails", function () {
    it("should return correct record details", async function () {
      const { contract, user1 } = await deploy();
      await contract.connect(user1).registerIP("Title", "Desc", "QmABC");
      const rec = await contract.getIPDetails(1n);
      expect(rec.ipId).to.equal(1n);
      expect(rec.title).to.equal("Title");
      expect(rec.ipfsHash).to.equal("QmABC");
      expect(rec.owner).to.equal(user1.address);
      expect(rec.isVerified).to.equal(false);
    });

    it("should revert for non-existent IP", async function () {
      const { contract } = await deploy();
      await expect(contract.getIPDetails(99n)).to.be.revertedWith("IP record does not exist");
    });
  });

  describe("isHashRegistered", function () {
    it("should return false before registration", async function () {
      const { contract } = await deploy();
      expect(await contract.isHashRegistered("QmNone")).to.equal(false);
    });

    it("should return true after registration", async function () {
      const { contract, user1 } = await deploy();
      await contract.connect(user1).registerIP("T", "", "QmExists");
      expect(await contract.isHashRegistered("QmExists")).to.equal(true);
    });
  });

  // ─── verifyIPRecord ───────────────────────────────────────────────────────────

  describe("verifyIPRecord", function () {
    it("should verify an IP and emit IPVerified", async function () {
      const { contract, user1, verifier } = await deploy();
      await contract.connect(user1).registerIP("T", "", "QmV1");
      await expect(contract.connect(verifier).verifyIPRecord(1n))
        .to.emit(contract, "IPVerified")
        .withArgs(1n, verifier.address);

      expect((await contract.getIPDetails(1n)).isVerified).to.equal(true);
    });

    it("should revert if caller lacks VERIFIER_ROLE", async function () {
      const { contract, user1, user2 } = await deploy();
      await contract.connect(user1).registerIP("T", "", "QmV2");
      await expect(contract.connect(user2).verifyIPRecord(1n)).to.be.revertedWith(
        "Caller is not an authorized verifier"
      );
    });

    it("should revert for non-existent IP", async function () {
      const { contract, verifier } = await deploy();
      await expect(contract.connect(verifier).verifyIPRecord(99n)).to.be.revertedWith(
        "IP record does not exist"
      );
    });

    it("should revert if already verified", async function () {
      const { contract, user1, verifier } = await deploy();
      await contract.connect(user1).registerIP("T", "", "QmV3");
      await contract.connect(verifier).verifyIPRecord(1n);
      await expect(contract.connect(verifier).verifyIPRecord(1n)).to.be.revertedWith(
        "IP record is already verified"
      );
    });
  });

  // ─── transferIPOwnership ─────────────────────────────────────────────────────

  describe("transferIPOwnership", function () {
    it("should transfer ownership, reset isVerified, and emit event", async function () {
      const { contract, user1, user2, verifier } = await deploy();
      await contract.connect(user1).registerIP("T", "", "QmT1");
      await contract.connect(verifier).verifyIPRecord(1n);
      expect((await contract.getIPDetails(1n)).isVerified).to.equal(true);

      await expect(contract.connect(user1).transferIPOwnership(1n, user2.address))
        .to.emit(contract, "IPOwnershipTransferred")
        .withArgs(1n, user1.address, user2.address);

      const rec = await contract.getIPDetails(1n);
      expect(rec.owner).to.equal(user2.address);
      expect(rec.isVerified).to.equal(false); // reset on transfer
    });

    it("should revert if caller is not the IP owner", async function () {
      const { contract, user1, user2 } = await deploy();
      await contract.connect(user1).registerIP("T", "", "QmT2");
      await expect(
        contract.connect(user2).transferIPOwnership(1n, user2.address)
      ).to.be.revertedWith("Caller is not the IP owner");
    });

    it("should revert if newOwner is zero address", async function () {
      const { contract, user1 } = await deploy();
      await contract.connect(user1).registerIP("T", "", "QmT3");
      await expect(
        contract.connect(user1).transferIPOwnership(1n, ethers.ZeroAddress)
      ).to.be.revertedWith("New owner cannot be the zero address");
    });

    it("should revert if newOwner is the current owner", async function () {
      const { contract, user1 } = await deploy();
      await contract.connect(user1).registerIP("T", "", "QmT4");
      await expect(
        contract.connect(user1).transferIPOwnership(1n, user1.address)
      ).to.be.revertedWith("New owner cannot be the current owner");
    });

    it("should revert for non-existent IP", async function () {
      const { contract, user1 } = await deploy();
      await expect(
        contract.connect(user1).transferIPOwnership(99n, user1.address)
      ).to.be.revertedWith("IP record does not exist");
    });
  });

  // ─── donateToOwner ───────────────────────────────────────────────────────────

  describe("donateToOwner", function () {
    it("should transfer ETH to the IP owner", async function () {
      const { contract, user1, user2 } = await deploy();
      await contract.connect(user1).registerIP("T", "", "QmDon1");
      const before = await ethers.provider.getBalance(user1.address);
      await contract.connect(user2).donateToOwner(1n, { value: ethers.parseEther("0.1") });
      const after = await ethers.provider.getBalance(user1.address);
      expect(after - before).to.equal(ethers.parseEther("0.1"));
    });

    it("should emit IPDonated event", async function () {
      const { contract, user1, user2 } = await deploy();
      await contract.connect(user1).registerIP("T", "", "QmDon2");
      await expect(
        contract.connect(user2).donateToOwner(1n, { value: ethers.parseEther("0.1") })
      )
        .to.emit(contract, "IPDonated")
        .withArgs(1n, user2.address, user1.address, ethers.parseEther("0.1"));
    });

    it("should revert for non-existent IP", async function () {
      const { contract, user1 } = await deploy();
      await expect(
        contract.connect(user1).donateToOwner(99n, { value: ethers.parseEther("0.1") })
      ).to.be.revertedWith("IP record does not exist");
    });

    it("should revert if msg.value is 0", async function () {
      const { contract, user1, user2 } = await deploy();
      await contract.connect(user1).registerIP("T", "", "QmDon3");
      await expect(
        contract.connect(user2).donateToOwner(1n, { value: 0n })
      ).to.be.revertedWith("Donation must be greater than zero");
    });
  });

  // ─── grantLicense ─────────────────────────────────────────────────────────────

  describe("grantLicense", function () {
    it("should emit IPLicensed event with correct args", async function () {
      const { contract, user1, user2 } = await deploy();
      await contract.connect(user1).registerIP("T", "", "QmL1");
      await expect(contract.connect(user1).grantLicense(1n, user2.address, 30n))
        .to.emit(contract, "IPLicensed")
        .withArgs(1n, user1.address, user2.address, 30n, (v: bigint) => v > 0n);
    });

    it("should revert if caller is not the IP owner", async function () {
      const { contract, user1, user2 } = await deploy();
      await contract.connect(user1).registerIP("T", "", "QmL2");
      await expect(
        contract.connect(user2).grantLicense(1n, user2.address, 30n)
      ).to.be.revertedWith("Caller is not the IP owner");
    });

    it("should revert if licensee is zero address", async function () {
      const { contract, user1 } = await deploy();
      await contract.connect(user1).registerIP("T", "", "QmL3");
      await expect(
        contract.connect(user1).grantLicense(1n, ethers.ZeroAddress, 30n)
      ).to.be.revertedWith("Licensee cannot be the zero address");
    });

    it("should revert if durationDays is 0", async function () {
      const { contract, user1, user2 } = await deploy();
      await contract.connect(user1).registerIP("T", "", "QmL4");
      await expect(
        contract.connect(user1).grantLicense(1n, user2.address, 0n)
      ).to.be.revertedWith("Duration must be greater than zero");
    });
  });
});
