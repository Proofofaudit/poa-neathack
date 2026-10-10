export interface BorrowerPosition {
  account: string;
  collateralBase: bigint; // 18 decimals WETH
  debtBase: bigint;       // 6 decimals USDC
}

export interface LiquidationEventRecord {
  txHash: string;
  blockNumber: number;
  liquidator: string;
  borrower: string;
  debtCovered: bigint;     // 6 decimals USDC
  collateralSeized: bigint;// 18 decimals WETH
  oraclePriceUsed: bigint; // 8 decimals USD
}

export interface RestitutionClaimResult {
  claimIndex: number;
  borrower: string;
  initialCollateralWeth: string;
  initialDebtUsdc: string;
  collateralSeizedWeth: string;
  debtRepaidUsdc: string;
  baselinePriceUsd: string;
  faultyPriceUsd: string;
  baselineHealthFactor: string;
  faultyHealthFactor: string;
  observedNetEquityUsd: string;
  counterfactualNetEquityUsd: string;
  restitutionAmountUsdc: bigint;
  status: "VERIFIED" | "NEEDS_REVIEW" | "EXCLUDED_LEGITIMATE";
  reason: string;
}

export class CounterfactualReplayEngine {
  public static readonly BPS_DENOMINATOR = 10000n;
  public static readonly LIQUIDATION_THRESHOLD_BPS = 8000n; // 80% LTV
  public static readonly REFERENCE_BASELINE_PRICE = 200000000000n; // $2,000.00 in 8 decimals (2000 * 1e8)

  /**
   * Calculate health factor scaled by 1e18
   * HF = (Collateral Value * Threshold) / Debt Value
   */
  public static calculateHealthFactor(
    collateralWeth: bigint,
    debtUsdc: bigint,
    priceUsd8Dec: bigint
  ): bigint {
    if (debtUsdc === 0n) {
      return 115792089237316195423570985008687907853269984665640564039457584007913129639935n; // max uint256
    }
    // Collateral value in 8 decimals USD
    const collateralValueUsd = (collateralWeth * priceUsd8Dec) / 10n ** 18n;
    const maxBorrowUsd = (collateralValueUsd * this.LIQUIDATION_THRESHOLD_BPS) / this.BPS_DENOMINATOR;
    const debtValueUsd = debtUsdc * 100n; // 6 decimals to 8 decimals
    return (maxBorrowUsd * 10n ** 18n) / debtValueUsd;
  }

  /**
   * Reconstruct Net Equity valued at baseline reference price
   * Net Equity = (Collateral * RefPrice) - Debt
   */
  public static calculateNetEquity(
    collateralWeth: bigint,
    debtUsdc: bigint,
    refPriceUsd8Dec: bigint
  ): bigint {
    const collateralValueUsd = (collateralWeth * refPriceUsd8Dec) / 10n ** 18n;
    const debtValueUsd = debtUsdc * 100n;
    return collateralValueUsd - debtValueUsd;
  }

  /**
   * Replay incident and compute provable restitution
   */
  public static analyzeBorrowerIncident(
    claimIndex: number,
    initialPos: BorrowerPosition,
    liqEvent?: LiquidationEventRecord,
    faultyPriceUsd8Dec = 180000000000n // $1,800.00
  ): RestitutionClaimResult {
    const baselineHF = this.calculateHealthFactor(
      initialPos.collateralBase,
      initialPos.debtBase,
      this.REFERENCE_BASELINE_PRICE
    );

    // If borrower did not experience a liquidation
    if (!liqEvent) {
      return {
        claimIndex,
        borrower: initialPos.account,
        initialCollateralWeth: initialPos.collateralBase.toString(),
        initialDebtUsdc: initialPos.debtBase.toString(),
        collateralSeizedWeth: "0",
        debtRepaidUsdc: "0",
        baselinePriceUsd: "2000.00",
        faultyPriceUsd: "1800.00",
        baselineHealthFactor: (Number(baselineHF) / 1e18).toFixed(4),
        faultyHealthFactor: (Number(this.calculateHealthFactor(initialPos.collateralBase, initialPos.debtBase, faultyPriceUsd8Dec)) / 1e18).toFixed(4),
        observedNetEquityUsd: (Number(this.calculateNetEquity(initialPos.collateralBase, initialPos.debtBase, this.REFERENCE_BASELINE_PRICE)) / 1e8).toFixed(2),
        counterfactualNetEquityUsd: (Number(this.calculateNetEquity(initialPos.collateralBase, initialPos.debtBase, this.REFERENCE_BASELINE_PRICE)) / 1e8).toFixed(2),
        restitutionAmountUsdc: 0n,
        status: "EXCLUDED_LEGITIMATE",
        reason: "Position maintained healthy collateral buffer; no liquidation occurred."
      };
    }

    // Baseline health check: was the position safe under the true reference oracle?
    const wasSafeAtBaseline = baselineHF >= 10n ** 18n;

    // Remaining positions after liquidation
    const remainingCollateral = initialPos.collateralBase - liqEvent.collateralSeized;
    const remainingDebt = initialPos.debtBase - liqEvent.debtCovered;

    // Equity comparison at true baseline price
    const counterfactualEquity = this.calculateNetEquity(
      initialPos.collateralBase,
      initialPos.debtBase,
      this.REFERENCE_BASELINE_PRICE
    );

    const observedEquity = this.calculateNetEquity(
      remainingCollateral,
      remainingDebt,
      this.REFERENCE_BASELINE_PRICE
    );

    // Equity loss attributable to the incident
    const equityLoss8Dec = counterfactualEquity > observedEquity ? counterfactualEquity - observedEquity : 0n;

    // Restitution in USDC (convert 8 decimals USD equity delta to 6 decimals USDC)
    const restitutionUsdc = equityLoss8Dec / 100n;

    if (!wasSafeAtBaseline) {
      return {
        claimIndex,
        borrower: initialPos.account,
        initialCollateralWeth: initialPos.collateralBase.toString(),
        initialDebtUsdc: initialPos.debtBase.toString(),
        collateralSeizedWeth: liqEvent.collateralSeized.toString(),
        debtRepaidUsdc: liqEvent.debtCovered.toString(),
        baselinePriceUsd: "2000.00",
        faultyPriceUsd: "1800.00",
        baselineHealthFactor: (Number(baselineHF) / 1e18).toFixed(4),
        faultyHealthFactor: (Number(this.calculateHealthFactor(initialPos.collateralBase, initialPos.debtBase, faultyPriceUsd8Dec)) / 1e18).toFixed(4),
        observedNetEquityUsd: (Number(observedEquity) / 1e8).toFixed(2),
        counterfactualNetEquityUsd: (Number(counterfactualEquity) / 1e8).toFixed(2),
        restitutionAmountUsdc: 0n,
        status: "EXCLUDED_LEGITIMATE",
        reason: "Position was already undercollateralized at baseline ($2000). Liquidation was economically legitimate."
      };
    }

    return {
      claimIndex,
      borrower: initialPos.account,
      initialCollateralWeth: initialPos.collateralBase.toString(),
      initialDebtUsdc: initialPos.debtBase.toString(),
      collateralSeizedWeth: liqEvent.collateralSeized.toString(),
      debtRepaidUsdc: liqEvent.debtCovered.toString(),
      baselinePriceUsd: "2000.00",
      faultyPriceUsd: "1800.00",
      baselineHealthFactor: (Number(baselineHF) / 1e18).toFixed(4),
      faultyHealthFactor: (Number(this.calculateHealthFactor(initialPos.collateralBase, initialPos.debtBase, faultyPriceUsd8Dec)) / 1e18).toFixed(4),
      observedNetEquityUsd: (Number(observedEquity) / 1e8).toFixed(2),
      counterfactualNetEquityUsd: (Number(counterfactualEquity) / 1e8).toFixed(2),
      restitutionAmountUsdc: restitutionUsdc,
      status: "VERIFIED",
      reason: `Wrongful liquidation triggered by faulty oracle drop. Provable net equity loss: ${(Number(equityLoss8Dec) / 1e8).toFixed(2)} USD.`
    };
  }
}
