import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Contract, BigNumber, Signer } from "ethers";
import { parseEther } from "ethers/lib/utils";
import hre, { ethers } from "hardhat";

describe("Goverance Token", function () {
  let signers: Signer[];
  let owner: SignerWithAddress;
  let proposers: SignerWithAddress;
  let voter1: SignerWithAddress;
  let voter2: SignerWithAddress;
  let voter3: SignerWithAddress;
  let voter4: SignerWithAddress;
  let voter5: SignerWithAddress;

  let token: Contract;
  let treasury: Contract;
  let timeLock: Contract;
  let governance: Contract;

  before(async () => {
    [owner, proposers, voter1, voter2, voter3, voter4, voter5] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("Token");
    token = await Token.deploy("Governace Token", "GT");

    const Treasury = await ethers.getContractFactory("Treasury");
    treasury = await Treasury.deploy(proposers.address, { value: parseEther("20") });

    const TimeLock = await ethers.getContractFactory("TimeLock");
    timeLock = await TimeLock.deploy(0, [proposers.address], [owner.address], owner.address);

    const Governance = await ethers.getContractFactory("Governance");

    governance = await Governance.deploy(token.address, timeLock.address, 5, 0, 5);
  });

  it("Functions", async function () {
    console.log(token.functions);
    console.log(await token.totalSupply());

    await treasury.connect(owner).transferOwnership(timeLock.address);

    const proposerRole = await timeLock.PROPOSER_ROLE();
    const executorRole = await timeLock.EXECUTOR_ROLE();

    await timeLock.connect(owner).grantRole(proposerRole, governance.address);
    await timeLock.connect(owner).grantRole(executorRole, governance.address);

    await token.delegate(voter1.address);
    await token.delegate(voter2.address);
    await token.delegate(voter3.address);
    await token.delegate(voter3.address);
    await token.delegate(voter4.address);

    console.log(await ethers.provider.getBalance(treasury.address));

    const encodeData = treasury.interface.encodeFunctionData("releaseFunds");

    const description = "Release Funds from Treasury";

    const iReleased = await treasury.isReleased();
    console.log(`Funds released? ${iReleased}`);

    const tx = await governance.connect(proposers).propose([treasury.address], [0], [encodeData], description);

    const data = await tx.wait();

    const id = data.events[0].args.proposalId;

    console.log(await ethers.provider.getBlockNumber());

    await governance.connect(voter1).castVote(id, 1);
    await governance.connect(voter2).castVote(id, 1);
    await governance.connect(voter3).castVote(id, 1);
    await governance.connect(voter4).castVote(id, 1);
    await governance.connect(voter5).castVote(id, 0);

    // NOTE: Transfer serves no purposes, it's just used to fast foward one block after the voting period ends
    await token.connect(owner).transfer(proposers.address, parseEther("50"));

    await governance.proposalVotes(id);
    // States: Pending, Active, Canceled, Defeated, Succeeded, Queued, Expired, Executed
    const st = await governance.state(id);

    const startline = await governance.proposalSnapshot(id);

    const deadline = await governance.proposalDeadline(id);

    console.log(st);
    console.log(startline);
    console.log("Balancxe", await ethers.provider.getBalance(treasury.address));

    console.log(deadline);

    const blockNumber = await ethers.provider.getBlockNumber();

    console.log(blockNumber);

    const quorum = await governance.quorum(blockNumber - 1);

    console.log(`Number of votes required to pass: ${(quorum.toString(), "ether")}\n`);

    const hash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("Release Funds from Treasury"));

    // Queue
    await governance.connect(owner).queue([treasury.address], [0], [encodeData], hash);

    // Execute
    await governance.connect(owner).execute([treasury.address], [0], [encodeData], hash);

    const isReleased = await treasury.isReleased();
    console.log(`Funds released? ${isReleased}`);

    console.log(await ethers.provider.getBalance(proposers.address));

    console.log(await ethers.provider.getBalance(treasury.address));
  });
});
