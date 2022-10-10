const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers");

async function deployCryptoDevsNftsAndWhitelist() {
  const [owner, otherAccount] = await ethers.getSigners();

  const maxWhitelistedAddresses = 25
  const Whitelist = await ethers.getContractFactory("Whitelist");
  const whitelist = await Whitelist.deploy(maxWhitelistedAddresses);

  const baseURI= 'www.test.com'
  const CryptoDevs = await ethers.getContractFactory("CryptoDevs");
  const cryptoDevs = await CryptoDevs.deploy(baseURI, whitelist.address);

  // add wallet to whitelist
  await whitelist.addAddressToWhitelist()

  return { cryptoDevs, whitelist, owner, otherAccount };
}

describe("CryptoDevs pre-sale", function () {

  it('Should be able to mint a nft on the pre-sale', async() => {
    const {  cryptoDevs, owner, otherAccount } = await loadFixture(deployCryptoDevsNftsAndWhitelist);

    const deployerAddress = owner.address;

    // start the pre sale period
    await cryptoDevs.startPresale()

    const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);

    // balance of is a function that comes form ERC721.sol on @openzeppelin, is from the standard, it retuns the number of NFTs of a particular wallet address
    const deployerBalanceBefore = await cryptoDevs.balanceOf(deployerAddress)
    expect(deployerBalanceBefore.toString()).to.be.equal("0")

    const transactionResponse = await cryptoDevs.presaleMint({ value: ethers.utils.parseEther("0.01")})

    // extract the gas cost of the presaleMint transaction
    const transactionReceipt = await transactionResponse.wait()
    const { gasUsed, effectiveGasPrice } = transactionReceipt
    const gasCost = gasUsed.mul(effectiveGasPrice)

    const deployerBalanceAfter = await cryptoDevs.balanceOf(deployerAddress)
    const ownerOf = await cryptoDevs.ownerOf("1")

    // the owner now has 1 nft
    expect(deployerBalanceAfter.toString()).to.be.equal("1")

    // the owner of the nft with the tokenID 1 is the owner account
    expect(ownerOf).to.be.equal(deployerAddress)

    const contractBalance = await ethers.provider.getBalance(cryptoDevs.address);

    // the contract cryptoDevs has now 0.01eth of balance
    expect(contractBalance).to.be.equal(ethers.utils.parseEther("0.01"))

    const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);

    const finalOwnerBalanceMath = ownerBalanceBefore.sub(ethers.utils.parseEther("0.01")).sub(gasCost)

    expect(ownerBalanceAfter).to.be.equal(finalOwnerBalanceMath)
  })

  it('Should not be able to mint on pre-sale after the pre-sale period', async() => {
    const {  cryptoDevs, owner, otherAccount } = await loadFixture(deployCryptoDevsNftsAndWhitelist);
    
     // start the pre sale period
     await cryptoDevs.startPresale()
     const FIVE_MINUTES_IN_SECS = 5 * 60
     const preSalePeriodEnd = (await time.latest()) + FIVE_MINUTES_IN_SECS;

     await time.increaseTo(preSalePeriodEnd);
     await expect(cryptoDevs.presaleMint()).to.be.revertedWith("Presale is not running");
  })

  it('Should not be able to mint a nft on pre-sale if it was not started', async() => {
    const {  cryptoDevs, owner, otherAccount } = await loadFixture(deployCryptoDevsNftsAndWhitelist);

    await expect(cryptoDevs.presaleMint()).to.be.revertedWith("Presale is not running");
  })

  it('Should not be able to mint a nft on pre-sale if not whitelisted', async() => {
    const {  cryptoDevs, owner, otherAccount } = await loadFixture(deployCryptoDevsNftsAndWhitelist);
    // start the pre sale period
    await cryptoDevs.startPresale()

    await expect(cryptoDevs.connect(otherAccount).presaleMint()).to.be.revertedWith("You are not whitelisted");
  })

  it('Should not be able to mint a nft on pre-sale if not send the corrent amount', async() => {
    const {  cryptoDevs, owner, otherAccount } = await loadFixture(deployCryptoDevsNftsAndWhitelist);
    // start the pre sale period
    await cryptoDevs.startPresale()

    await expect(cryptoDevs.presaleMint({ value: ethers.utils.parseEther("0.009")})).to.be.revertedWith("Ether sent is not correct");
  })

  it('Should not be able to mint a nft on pre-sale if sale is paused', async() => {
    const {  cryptoDevs, owner, otherAccount } = await loadFixture(deployCryptoDevsNftsAndWhitelist);
    // start the pre sale period
    await cryptoDevs.startPresale()

    await cryptoDevs.setPaused(true)

    await expect(cryptoDevs.presaleMint()).to.be.revertedWith("Contract currently paused");
  })

  it('Should not be able to start pre-sale if not owner', async() => {
    const {  cryptoDevs, owner, otherAccount } = await loadFixture(deployCryptoDevsNftsAndWhitelist);
    // start the pre sale period
    await cryptoDevs.startPresale()

    await expect(cryptoDevs.connect(otherAccount).startPresale()).to.be.revertedWith("Ownable: caller is not the owner");
  })

  it('Should not be able mint on pre-sale if more than supply', async() => {
    const {  cryptoDevs, whitelist } = await loadFixture(deployCryptoDevsNftsAndWhitelist);

    // calling this function again here so we can get multiple accounts
    // it would be better to pass the supply as argument on the constructor, so we could more easily test
    const [owner, acc1, acc2, acc3, acc4, acc5, acc6, acc7, acc8, acc9, acc10, acc11] = await ethers.getSigners();
    // start the pre sale period
    await cryptoDevs.startPresale()

    await whitelist.connect(acc1).addAddressToWhitelist()
    await whitelist.connect(acc2).addAddressToWhitelist()
    await whitelist.connect(acc3).addAddressToWhitelist()
    await whitelist.connect(acc4).addAddressToWhitelist()
    await whitelist.connect(acc5).addAddressToWhitelist()
    await whitelist.connect(acc6).addAddressToWhitelist()
    await whitelist.connect(acc7).addAddressToWhitelist()
    await whitelist.connect(acc8).addAddressToWhitelist()
    await whitelist.connect(acc9).addAddressToWhitelist()
    await whitelist.connect(acc10).addAddressToWhitelist()
    await whitelist.connect(acc11).addAddressToWhitelist()

    cryptoDevs.connect(acc1).presaleMint({ value: ethers.utils.parseEther("0.01")})
    cryptoDevs.connect(acc2).presaleMint({ value: ethers.utils.parseEther("0.01")})
    cryptoDevs.connect(acc3).presaleMint({ value: ethers.utils.parseEther("0.01")})
    cryptoDevs.connect(acc4).presaleMint({ value: ethers.utils.parseEther("0.01")})
    cryptoDevs.connect(acc5).presaleMint({ value: ethers.utils.parseEther("0.01")})
    cryptoDevs.connect(acc6).presaleMint({ value: ethers.utils.parseEther("0.01")})
    cryptoDevs.connect(acc7).presaleMint({ value: ethers.utils.parseEther("0.01")})
    cryptoDevs.connect(acc8).presaleMint({ value: ethers.utils.parseEther("0.01")})
    cryptoDevs.connect(acc9).presaleMint({ value: ethers.utils.parseEther("0.01")})
    cryptoDevs.connect(acc10).presaleMint({ value: ethers.utils.parseEther("0.01")})

    await expect(cryptoDevs.connect(acc11).presaleMint({ value: ethers.utils.parseEther("0.01")})).to.be.revertedWith("Exceeded maximum Cypto Devs supply");
  })
})

describe("CryptoDevs regular sale", function () {

  it('Should be able to mint a nft on the regular sale', async() => {
    const {  cryptoDevs, owner, otherAccount } = await loadFixture(deployCryptoDevsNftsAndWhitelist);

    const deployerAddress = owner.address;

    // start the pre sale period
    await cryptoDevs.startPresale()

    // make the time move in 5 mins so the pre-sale is over
    const FIVE_MINUTES_IN_SECS = 5 * 60
    const preSalePeriodEnd = (await time.latest()) + FIVE_MINUTES_IN_SECS;

    await time.increaseTo(preSalePeriodEnd);

    const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);

    // balance of is a function that comes form ERC721.sol on @openzeppelin, is from the standard, it retuns the number of NFTs of a particular wallet address
    const deployerBalanceBefore = await cryptoDevs.balanceOf(deployerAddress)
    expect(deployerBalanceBefore.toString()).to.be.equal("0")

    const transactionResponse = await cryptoDevs.mint({ value: ethers.utils.parseEther("0.01")})

    // extract the gas cost of the presaleMint transaction
    const transactionReceipt = await transactionResponse.wait()
    const { gasUsed, effectiveGasPrice } = transactionReceipt
    const gasCost = gasUsed.mul(effectiveGasPrice)

    const deployerBalanceAfter = await cryptoDevs.balanceOf(deployerAddress)
    const ownerOf = await cryptoDevs.ownerOf("1")

    // the owner now has 1 nft
    expect(deployerBalanceAfter.toString()).to.be.equal("1")

    // the owner of the nft with the tokenID 1 is the owner account
    expect(ownerOf).to.be.equal(deployerAddress)

    const contractBalance = await ethers.provider.getBalance(cryptoDevs.address);

    // the contract cryptoDevs has now 0.01eth of balance
    expect(contractBalance).to.be.equal(ethers.utils.parseEther("0.01"))

    const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);

    const finalOwnerBalanceMath = ownerBalanceBefore.sub(ethers.utils.parseEther("0.01")).sub(gasCost)

    expect(ownerBalanceAfter).to.be.equal(finalOwnerBalanceMath)
  })

  it('Should not be able to mint a nft on regular sale if not send the corrent amount', async() => {
    const {  cryptoDevs, owner, otherAccount } = await loadFixture(deployCryptoDevsNftsAndWhitelist);
    // start the pre sale period
    await cryptoDevs.startPresale()

    const FIVE_MINUTES_IN_SECS = 5 * 60
    const preSalePeriodEnd = (await time.latest()) + FIVE_MINUTES_IN_SECS;

    await time.increaseTo(preSalePeriodEnd);

    await expect(cryptoDevs.mint({ value: ethers.utils.parseEther("0.009")})).to.be.revertedWith("Ether sent is not correct");
  })

  it('Should not be able to mint a nft on regular sale if sale is paused', async() => {
    const {  cryptoDevs, owner, otherAccount } = await loadFixture(deployCryptoDevsNftsAndWhitelist);
    // start the pre sale period
    await cryptoDevs.startPresale()

    const FIVE_MINUTES_IN_SECS = 5 * 60
    const preSalePeriodEnd = (await time.latest()) + FIVE_MINUTES_IN_SECS;
    await time.increaseTo(preSalePeriodEnd);

    await cryptoDevs.setPaused(true)

    await expect(cryptoDevs.mint()).to.be.revertedWith("Contract currently paused");
  })

  it('Should not be able to mint a nft on regular sale if it is on pre-sale', async() => {
    const {  cryptoDevs, owner, otherAccount } = await loadFixture(deployCryptoDevsNftsAndWhitelist);
    // start the pre sale period
    await cryptoDevs.startPresale()

    await expect(cryptoDevs.mint()).to.be.revertedWith("Presale has not ended yet");
  })

  it('Should not be able mint on regular sale if more than supply', async() => {
    const {  cryptoDevs, whitelist } = await loadFixture(deployCryptoDevsNftsAndWhitelist);

    // calling this function again here so we can get multiple accounts
    // it would be better to pass the supply as argument on the constructor, so we could more easily test
    const [owner, acc1, acc2, acc3, acc4, acc5, acc6, acc7, acc8, acc9, acc10, acc11] = await ethers.getSigners();
    // start the pre sale period
    await cryptoDevs.startPresale()
    const FIVE_MINUTES_IN_SECS = 5 * 60
    const preSalePeriodEnd = (await time.latest()) + FIVE_MINUTES_IN_SECS;
    await time.increaseTo(preSalePeriodEnd);

    cryptoDevs.connect(acc1).mint({ value: ethers.utils.parseEther("0.01")})
    cryptoDevs.connect(acc2).mint({ value: ethers.utils.parseEther("0.01")})
    cryptoDevs.connect(acc3).mint({ value: ethers.utils.parseEther("0.01")})
    cryptoDevs.connect(acc4).mint({ value: ethers.utils.parseEther("0.01")})
    cryptoDevs.connect(acc5).mint({ value: ethers.utils.parseEther("0.01")})
    cryptoDevs.connect(acc6).mint({ value: ethers.utils.parseEther("0.01")})
    cryptoDevs.connect(acc7).mint({ value: ethers.utils.parseEther("0.01")})
    cryptoDevs.connect(acc8).mint({ value: ethers.utils.parseEther("0.01")})
    cryptoDevs.connect(acc9).mint({ value: ethers.utils.parseEther("0.01")})
    cryptoDevs.connect(acc10).mint({ value: ethers.utils.parseEther("0.01")})

    await expect(cryptoDevs.connect(acc11).mint({ value: ethers.utils.parseEther("0.01")})).to.be.revertedWith("Exceed maximum Cypto Devs supply");
  })
})

describe("CryptoDevs withdraw", function () {
  it('Should be able to withdraw all the money from the contract if its the owner', async() => {

    const {  cryptoDevs, owner, otherAccount } = await loadFixture(deployCryptoDevsNftsAndWhitelist);

    await cryptoDevs.startPresale()
    await cryptoDevs.presaleMint({ value: ethers.utils.parseEther("0.01")})

    const ownerBalanceBeforeWithdraw = await ethers.provider.getBalance(owner.address);

    const transactionResponse = await cryptoDevs.withdraw()

    // extract the gas cost of the withdraw transaction
    const transactionReceipt = await transactionResponse.wait()
    const { gasUsed, effectiveGasPrice } = transactionReceipt
    const gasCost = gasUsed.mul(effectiveGasPrice)

    const ownerBalanceAfterWidthdraw = await ethers.provider.getBalance(owner.address);

    const finalOwnerBalanceMath = ownerBalanceBeforeWithdraw.add(ethers.utils.parseEther("0.01")).sub(gasCost)

    expect(ownerBalanceAfterWidthdraw).to.be.equal(finalOwnerBalanceMath)

  })

  it('Should not be able to withdraw all the money from the contract if not the owner', async() => {

    const {  cryptoDevs, owner, otherAccount } = await loadFixture(deployCryptoDevsNftsAndWhitelist);

    await expect(cryptoDevs.connect(otherAccount).withdraw()).to.be.revertedWith("Ownable: caller is not the owner");

  })
})

describe("CryptoDevs setPaused", function () {
  it('Should not be able to pause sales if not the ownser', async() => {
    const {  cryptoDevs, owner, otherAccount } = await loadFixture(deployCryptoDevsNftsAndWhitelist);
    // start the pre sale period
    await cryptoDevs.startPresale()

    await expect(cryptoDevs.connect(otherAccount).setPaused(true)).to.be.revertedWith("Ownable: caller is not the owner");
  })
})