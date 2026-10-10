import { ethers } from "ethers";
import fs from "fs";
import path from "path";

export interface ScenarioFixtureData {
  chainId: number;
  oracleAddress: string;
  lendingPoolAddress: string;
  distributorAddress: string;
  wethAddress: string;
  usdcAddress: string;
  baselinePrice: string;
  faultyPrice: string;
  oracleUpdateTxHash: string;
  liquidationTxs: Array<{
    txHash: string;
    borrower: string;
    debtCovered: string;
    collateralSeized: string;
  }>;
  borrowers: Array<{
    address: string;
    initialCollateralWeth: string;
    initialDebtUsdc: string;
  }>;
}

export class DeFiIncidentSimulator {
  private provider: ethers.Provider;
  private deployer: ethers.Signer;
  private liquidator: ethers.Signer;
  private borrowers: ethers.Signer[] = [];

  constructor(provider: ethers.Provider, deployer: ethers.Signer, liquidator: ethers.Signer, borrowers: ethers.Signer[]) {
    this.provider = provider;
    this.deployer = deployer;
    this.liquidator = liquidator;
    this.borrowers = borrowers;
  }

  public static async createFromAnvil(rpcUrl = "http://127.0.0.1:8545"): Promise<DeFiIncidentSimulator> {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    // Anvil accounts
    const deployer = new ethers.Wallet("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", provider);
    const liquidator = new ethers.Wallet("0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d", provider);
    const borrowerWallets = [
      new ethers.Wallet("0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a", provider),
      new ethers.Wallet("0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6", provider),
      new ethers.Wallet("0x47e179ec197488593b100f8100d81f1e79a9477191d95444b0061e99fdd26ef2", provider),
      new ethers.Wallet("0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba", provider),
      new ethers.Wallet("0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e", provider)
    ];

    return new DeFiIncidentSimulator(provider, deployer, liquidator, borrowerWallets);
  }

  /**
   * Run the complete reproducible on-chain incident simulation
   */
  public async runFullScenario(): Promise<ScenarioFixtureData> {
    const contractsDir = path.resolve(process.cwd(), "contracts/out");

    const wethArtifact = JSON.parse(fs.readFileSync(path.join(contractsDir, "MockERC20.sol/MockERC20.json"), "utf8"));
    const oracleArtifact = JSON.parse(fs.readFileSync(path.join(contractsDir, "DemoOracle.sol/DemoOracle.json"), "utf8"));
    const poolArtifact = JSON.parse(fs.readFileSync(path.join(contractsDir, "DemoLendingPool.sol/DemoLendingPool.json"), "utf8"));
    const distArtifact = JSON.parse(fs.readFileSync(path.join(contractsDir, "RestitutionDistributor.sol/RestitutionDistributor.json"), "utf8"));

    // 1. Deploy Tokens
    const wethFactory = new ethers.ContractFactory(wethArtifact.abi, wethArtifact.bytecode.object, this.deployer);
    const weth = await wethFactory.deploy("Wrapped Ether", "WETH", 18);
    await weth.waitForDeployment();

    const usdcFactory = new ethers.ContractFactory(wethArtifact.abi, wethArtifact.bytecode.object, this.deployer);
    const usdc = await usdcFactory.deploy("USD Coin", "USDC", 6);
    await usdc.waitForDeployment();

    // 2. Deploy Oracle
    const oracleFactory = new ethers.ContractFactory(oracleArtifact.abi, oracleArtifact.bytecode.object, this.deployer);
    const oracle = await oracleFactory.deploy();
    await oracle.waitForDeployment();

    // Set Baseline Price: $2000.00 USD (2000 * 1e8)
    const baselinePrice = 200000000000n;
    const txBase = await (oracle as any).setAssetPrice(await weth.getAddress(), baselinePrice, "BASELINE");
    await txBase.wait();

    // 3. Deploy Lending Pool
    const poolFactory = new ethers.ContractFactory(poolArtifact.abi, poolArtifact.bytecode.object, this.deployer);
    const pool = await poolFactory.deploy(await weth.getAddress(), await usdc.getAddress(), await oracle.getAddress());
    await pool.waitForDeployment();

    // 4. Deploy Restitution Distributor
    const distFactory = new ethers.ContractFactory(distArtifact.abi, distArtifact.bytecode.object, this.deployer);
    const distributor = await distFactory.deploy();
    await distributor.waitForDeployment();

    // 5. Seed Pool & Liquidator with liquidity
    await (await (usdc as any).mint(await pool.getAddress(), ethers.parseUnits("1000000", 6))).wait();
    await (await (usdc as any).mint(await this.liquidator.getAddress(), ethers.parseUnits("500000", 6))).wait();
    await (await (usdc.connect(this.liquidator) as any).approve(await pool.getAddress(), ethers.MaxUint256)).wait();

    // 6. Seed Borrowers
    const borrowerConfigs = [
      { signer: this.borrowers[0], collateral: ethers.parseUnits("10", 18), borrow: ethers.parseUnits("15000", 6) },
      { signer: this.borrowers[1], collateral: ethers.parseUnits("5", 18), borrow: ethers.parseUnits("7500", 6) },
      { signer: this.borrowers[2], collateral: ethers.parseUnits("8", 18), borrow: ethers.parseUnits("12000", 6) },
      { signer: this.borrowers[3], collateral: ethers.parseUnits("10", 18), borrow: ethers.parseUnits("10000", 6) },
      { signer: this.borrowers[4], collateral: ethers.parseUnits("10", 18), borrow: ethers.parseUnits("15800", 6) }
    ];

    const seededBorrowers = [];
    for (const cfg of borrowerConfigs) {
      const bAddr = await cfg.signer.getAddress();
      await (await (weth as any).mint(bAddr, cfg.collateral)).wait();
      await (await (weth.connect(cfg.signer) as any).approve(await pool.getAddress(), cfg.collateral)).wait();
      await (await (pool.connect(cfg.signer) as any).deposit(cfg.collateral)).wait();
      await (await (pool.connect(cfg.signer) as any).borrow(cfg.borrow)).wait();

      seededBorrowers.push({
        address: bAddr,
        initialCollateralWeth: cfg.collateral.toString(),
        initialDebtUsdc: cfg.borrow.toString()
      });
    }

    // 7. Trigger the Faulty Oracle Price Drop (-10%: $1,800.00 USD)
    const faultyPrice = 180000000000n;
    const txFaulty = await (oracle as any).setAssetPrice(await weth.getAddress(), faultyPrice, "FAULTY_DROP_10PCT");
    const faultyReceipt = await txFaulty.wait();

    // 8. Execute Liquidations on underwater borrowers
    const liqTxs = [];
    for (let i = 0; i < 3; i++) {
      const victim = seededBorrowers[i];
      const liqTx = await (pool.connect(this.liquidator) as any).liquidate(victim.address, BigInt(victim.initialDebtUsdc));
      const receipt = await liqTx.wait();
      liqTxs.push({
        txHash: receipt.hash,
        borrower: victim.address,
        debtCovered: victim.initialDebtUsdc,
        collateralSeized: (BigInt(victim.initialDebtUsdc) * 105n / 100n * 10n ** 18n / faultyPrice * 100n).toString() // approximate seized
      });
    }

    return {
      chainId: Number((await this.provider.getNetwork()).chainId),
      oracleAddress: await oracle.getAddress(),
      lendingPoolAddress: await pool.getAddress(),
      distributorAddress: await distributor.getAddress(),
      wethAddress: await weth.getAddress(),
      usdcAddress: await usdc.getAddress(),
      baselinePrice: "200000000000",
      faultyPrice: "180000000000",
      oracleUpdateTxHash: faultyReceipt.hash,
      liquidationTxs: liqTxs,
      borrowers: seededBorrowers
    };
  }
}
