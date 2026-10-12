export interface BorrowerPosition {
  account: string;
  collateralBase: bigint; // 18 decimals WETH
  debtBase: bigint; // 6 decimals USDC
}

export interface LiquidationEventRecord {
  txHash: string;
  blockNumber: number;
  logIndex?: number;
  liquidator: string;
  borrower: string;
  debtCovered: bigint; // 6 decimals USDC
  collateralSeized: bigint; // 18 decimals WETH
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

export interface IncidentAnalysisConfig {
  collateralDecimals?: number;
  debtDecimals?: number;
  liquidationThresholdBps?: bigint;
  baselinePriceUsd8Dec?: bigint;
  faultyPriceUsd8Dec?: bigint;
  debtPriceUsd8Dec?: bigint;
}

export class CounterfactualReplayEngine {
  public static readonly BPS_DENOMINATOR = 10000n;
  public static readonly DEFAULT_LIQUIDATION_THRESHOLD_BPS = 8000n; // 80% LTV
  public static readonly DEFAULT_BASELINE_PRICE = 200000000000n; // $2,000.00 in 8 decimals (2000 * 1e8)

  /**
   * Scale debt amount to 8 decimals USD
   */
  public static scaleDebtToUsd8Dec(
    debtAmount: bigint,
    debtDecimals = 6,
  ): bigint {
    const dec = BigInt(debtDecimals);
    if (dec <= 8n) {
      return debtAmount * 10n ** (8n - dec);
    }
    return debtAmount / 10n ** (dec - 8n);
  }

  /**
   * Scale 8-decimal USD equity delta back to debt token units
   */
  public static scaleUsd8DecToDebtTokens(
    usd8Dec: bigint,
    debtDecimals = 6,
  ): bigint {
    const dec = BigInt(debtDecimals);
    if (dec <= 8n) {
      return usd8Dec / 10n ** (8n - dec);
    }
    return usd8Dec * 10n ** (dec - 8n);
  }

  /**
   * Calculate health factor scaled by 1e18
   * HF = (Collateral Value * Threshold) / Debt Value
   */
  public static calculateHealthFactor(
    collateralAmount: bigint,
    debtAmount: bigint,
    priceUsd8Dec: bigint,
    thresholdBps = 8000n,
    collateralDecimals = 18,
    debtDecimals = 6,
  ): bigint {
    if (debtAmount === 0n) {
      return 115792089237316195423570985008687907853269984665640564039457584007913129639935n; // max uint256
    }
    // Collateral value in 8 decimals USD
    const collateralValueUsd =
      (collateralAmount * priceUsd8Dec) / 10n ** BigInt(collateralDecimals);
    const maxBorrowUsd =
      (collateralValueUsd * thresholdBps) / this.BPS_DENOMINATOR;
    const debtValueUsd = this.scaleDebtToUsd8Dec(debtAmount, debtDecimals);
    if (debtValueUsd === 0n)
      return 115792089237316195423570985008687907853269984665640564039457584007913129639935n;
    return (maxBorrowUsd * 10n ** 18n) / debtValueUsd;
  }

  /**
   * Reconstruct Net Equity valued at baseline reference price
   * Net Equity = (Collateral * RefPrice) - Debt
   */
  public static calculateNetEquity(
    collateralAmount: bigint,
    debtAmount: bigint,
    refPriceUsd8Dec: bigint,
    collateralDecimals = 18,
    debtDecimals = 6,
  ): bigint {
    const collateralValueUsd =
      (collateralAmount * refPriceUsd8Dec) / 10n ** BigInt(collateralDecimals);
    const debtValueUsd = this.scaleDebtToUsd8Dec(debtAmount, debtDecimals);
    return collateralValueUsd - debtValueUsd;
  }

  /**
   * Replay incident and compute provable restitution
   */
  public static analyzeBorrowerIncident(
    claimIndex: number,
    initialPos: BorrowerPosition,
    liqEvent?: LiquidationEventRecord,
    configOrFaultyPrice?: bigint | IncidentAnalysisConfig,
  ): RestitutionClaimResult {
    // Normalizing config arguments
    let baselinePrice = this.DEFAULT_BASELINE_PRICE;
    let faultyPrice = 180000000000n;
    let thresholdBps = this.DEFAULT_LIQUIDATION_THRESHOLD_BPS;
    let collateralDec = 18;
    let debtDec = 6;

    if (typeof configOrFaultyPrice === "bigint") {
      faultyPrice = configOrFaultyPrice;
    } else if (configOrFaultyPrice && typeof configOrFaultyPrice === "object") {
      if (configOrFaultyPrice.baselinePriceUsd8Dec !== undefined)
        baselinePrice = configOrFaultyPrice.baselinePriceUsd8Dec;
      if (configOrFaultyPrice.faultyPriceUsd8Dec !== undefined)
        faultyPrice = configOrFaultyPrice.faultyPriceUsd8Dec;
      if (configOrFaultyPrice.liquidationThresholdBps !== undefined)
        thresholdBps = configOrFaultyPrice.liquidationThresholdBps;
      if (configOrFaultyPrice.collateralDecimals !== undefined)
        collateralDec = configOrFaultyPrice.collateralDecimals;
      if (configOrFaultyPrice.debtDecimals !== undefined)
        debtDec = configOrFaultyPrice.debtDecimals;
    }

    if (
      !Number.isInteger(collateralDec) ||
      collateralDec < 0 ||
      collateralDec > 36 ||
      !Number.isInteger(debtDec) ||
      debtDec < 0 ||
      debtDec > 36 ||
      baselinePrice <= 0n ||
      faultyPrice <= 0n ||
      thresholdBps <= 0n ||
      thresholdBps > 10000n ||
      initialPos.collateralBase < 0n ||
      initialPos.debtBase < 0n
    ) {
      throw new Error("Invalid asset configuration or position");
    }
    // This policy pays a USD-pegged debt token only. Decimals alone cannot price another asset.
    if (
      typeof configOrFaultyPrice === "object" &&
      configOrFaultyPrice.debtPriceUsd8Dec !== undefined &&
      configOrFaultyPrice.debtPriceUsd8Dec !== 100000000n
    ) {
      throw new Error(
        "Unsupported debt price: this policy requires a USD-pegged debt token",
      );
    }
    const baselineHF = this.calculateHealthFactor(
      initialPos.collateralBase,
      initialPos.debtBase,
      baselinePrice,
      thresholdBps,
      collateralDec,
      debtDec,
    );

    const baselinePriceStr = (Number(baselinePrice) / 1e8).toFixed(2);
    const faultyPriceStr = (Number(faultyPrice) / 1e8).toFixed(2);

    // If borrower did not experience a liquidation
    if (!liqEvent) {
      return {
        claimIndex,
        borrower: initialPos.account,
        initialCollateralWeth: initialPos.collateralBase.toString(),
        initialDebtUsdc: initialPos.debtBase.toString(),
        collateralSeizedWeth: "0",
        debtRepaidUsdc: "0",
        baselinePriceUsd: baselinePriceStr,
        faultyPriceUsd: faultyPriceStr,
        baselineHealthFactor: (Number(baselineHF) / 1e18).toFixed(4),
        faultyHealthFactor: (
          Number(
            this.calculateHealthFactor(
              initialPos.collateralBase,
              initialPos.debtBase,
              faultyPrice,
              thresholdBps,
              collateralDec,
              debtDec,
            ),
          ) / 1e18
        ).toFixed(4),
        observedNetEquityUsd: (
          Number(
            this.calculateNetEquity(
              initialPos.collateralBase,
              initialPos.debtBase,
              baselinePrice,
              collateralDec,
              debtDec,
            ),
          ) / 1e8
        ).toFixed(2),
        counterfactualNetEquityUsd: (
          Number(
            this.calculateNetEquity(
              initialPos.collateralBase,
              initialPos.debtBase,
              baselinePrice,
              collateralDec,
              debtDec,
            ),
          ) / 1e8
        ).toFixed(2),
        restitutionAmountUsdc: 0n,
        status: "EXCLUDED_LEGITIMATE",
        reason:
          "No liquidation observed; no realized loss is eligible under this policy.",
      };
    }

    // Baseline health check: was the position safe under the true reference oracle?
    const wasSafeAtBaseline = baselineHF >= 10n ** 18n;

    const faultyHF = this.calculateHealthFactor(
      initialPos.collateralBase,
      initialPos.debtBase,
      faultyPrice,
      thresholdBps,
      collateralDec,
      debtDec,
    );
    const invalidEvent =
      liqEvent.borrower.toLowerCase() !== initialPos.account.toLowerCase() ||
      liqEvent.debtCovered <= 0n ||
      liqEvent.collateralSeized <= 0n ||
      liqEvent.debtCovered > initialPos.debtBase ||
      liqEvent.collateralSeized > initialPos.collateralBase ||
      liqEvent.oraclePriceUsed !== faultyPrice ||
      faultyPrice >= baselinePrice ||
      (wasSafeAtBaseline && faultyHF >= 10n ** 18n);
    if (invalidEvent) {
      const result = this.analyzeBorrowerIncident(
        claimIndex,
        initialPos,
        undefined,
        configOrFaultyPrice,
      );
      return {
        ...result,
        status: "NEEDS_REVIEW",
        reason:
          "Liquidation evidence is inconsistent, exceeds the position, or does not cross the liquidation threshold under the disputed price.",
      };
    }

    // Remaining positions after liquidation
    const remainingCollateral =
      initialPos.collateralBase - liqEvent.collateralSeized;
    const remainingDebt = initialPos.debtBase - liqEvent.debtCovered;

    // Equity comparison at true baseline price
    const counterfactualEquity = this.calculateNetEquity(
      initialPos.collateralBase,
      initialPos.debtBase,
      baselinePrice,
      collateralDec,
      debtDec,
    );

    const observedEquity = this.calculateNetEquity(
      remainingCollateral,
      remainingDebt,
      baselinePrice,
      collateralDec,
      debtDec,
    );

    // Equity loss attributable to the incident
    const equityLoss8Dec =
      counterfactualEquity > observedEquity
        ? counterfactualEquity - observedEquity
        : 0n;

    // Restitution in debt tokens
    const restitutionAmount = this.scaleUsd8DecToDebtTokens(
      equityLoss8Dec,
      debtDec,
    );

    if (!wasSafeAtBaseline) {
      return {
        claimIndex,
        borrower: initialPos.account,
        initialCollateralWeth: initialPos.collateralBase.toString(),
        initialDebtUsdc: initialPos.debtBase.toString(),
        collateralSeizedWeth: liqEvent.collateralSeized.toString(),
        debtRepaidUsdc: liqEvent.debtCovered.toString(),
        baselinePriceUsd: baselinePriceStr,
        faultyPriceUsd: faultyPriceStr,
        baselineHealthFactor: (Number(baselineHF) / 1e18).toFixed(4),
        faultyHealthFactor: (
          Number(
            this.calculateHealthFactor(
              initialPos.collateralBase,
              initialPos.debtBase,
              faultyPrice,
              thresholdBps,
              collateralDec,
              debtDec,
            ),
          ) / 1e18
        ).toFixed(4),
        observedNetEquityUsd: (Number(observedEquity) / 1e8).toFixed(2),
        counterfactualNetEquityUsd: (
          Number(counterfactualEquity) / 1e8
        ).toFixed(2),
        restitutionAmountUsdc: 0n,
        status: "EXCLUDED_LEGITIMATE",
        reason: `Position was already undercollateralized at baseline ($${baselinePriceStr}). Liquidation was economically legitimate.`,
      };
    }

    return {
      claimIndex,
      borrower: initialPos.account,
      initialCollateralWeth: initialPos.collateralBase.toString(),
      initialDebtUsdc: initialPos.debtBase.toString(),
      collateralSeizedWeth: liqEvent.collateralSeized.toString(),
      debtRepaidUsdc: liqEvent.debtCovered.toString(),
      baselinePriceUsd: baselinePriceStr,
      faultyPriceUsd: faultyPriceStr,
      baselineHealthFactor: (Number(baselineHF) / 1e18).toFixed(4),
      faultyHealthFactor: (
        Number(
          this.calculateHealthFactor(
            initialPos.collateralBase,
            initialPos.debtBase,
            faultyPrice,
            thresholdBps,
            collateralDec,
            debtDec,
          ),
        ) / 1e18
      ).toFixed(4),
      observedNetEquityUsd: (Number(observedEquity) / 1e8).toFixed(2),
      counterfactualNetEquityUsd: (Number(counterfactualEquity) / 1e8).toFixed(
        2,
      ),
      restitutionAmountUsdc: restitutionAmount,
      status: "VERIFIED",
      reason: `Wrongful liquidation triggered by faulty oracle drop. Provable net equity loss: ${(Number(equityLoss8Dec) / 1e8).toFixed(2)} USD.`,
    };
  }
}
