// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./DemoOracle.sol";

contract DemoLendingPool is Ownable {
    using SafeERC20 for IERC20;

    IERC20 public immutable collateralToken; // e.g. WETH (18 decimals)
    IERC20 public immutable debtToken;       // e.g. USDC (6 decimals)
    DemoOracle public oracle;

    // Basis points: 10000 = 100%
    uint256 public constant BPS_DENOMINATOR = 10000;
    uint256 public constant LIQUIDATION_THRESHOLD_BPS = 8000; // 80% LTV threshold
    uint256 public constant LIQUIDATION_BONUS_BPS = 500;       // 5% bonus to liquidator

    mapping(address => uint256) public userCollateral;
    mapping(address => uint256) public userDebt;

    event Deposit(address indexed user, uint256 amount);
    event Borrow(address indexed user, uint256 amount);
    event Repay(address indexed user, uint256 amount);
    event LiquidationCall(
        address indexed liquidator,
        address indexed user,
        uint256 debtToCover,
        uint256 collateralSeized,
        uint256 oraclePriceUsed
    );
    event OracleUpdated(address indexed oldOracle, address indexed newOracle);

    constructor(
        address _collateralToken,
        address _debtToken,
        address _oracle
    ) Ownable(msg.sender) {
        collateralToken = IERC20(_collateralToken);
        debtToken = IERC20(_debtToken);
        oracle = DemoOracle(_oracle);
    }

    function setOracle(address _oracle) external onlyOwner {
        address old = address(oracle);
        oracle = DemoOracle(_oracle);
        emit OracleUpdated(old, _oracle);
    }

    function deposit(uint256 amount) external {
        require(amount > 0, "Amount must be > 0");
        collateralToken.safeTransferFrom(msg.sender, address(this), amount);
        userCollateral[msg.sender] += amount;
        emit Deposit(msg.sender, amount);
    }

    function borrow(uint256 amount) external {
        require(amount > 0, "Amount must be > 0");
        userDebt[msg.sender] += amount;

        (uint256 healthFactor, ) = getHealthFactor(msg.sender);
        require(healthFactor >= 1e18, "Insufficient collateral ratio");

        debtToken.safeTransfer(msg.sender, amount);
        emit Borrow(msg.sender, amount);
    }

    function repay(uint256 amount) external {
        require(amount > 0, "Amount must be > 0");
        require(userDebt[msg.sender] >= amount, "Repay exceeds debt");

        debtToken.safeTransferFrom(msg.sender, address(this), amount);
        userDebt[msg.sender] -= amount;
        emit Repay(msg.sender, amount);
    }

    /**
     * @notice Returns (healthFactor in 1e18 format, oraclePrice in 1e8)
     * If user has no debt, returns (type(uint256).max, price)
     * Health factor = (Collateral Value in USD * Liquidation Threshold) / Debt Value in USD
     */
    function getHealthFactor(address user) public view returns (uint256 healthFactor, uint256 price) {
        (price, , ) = oracle.getAssetPrice(address(collateralToken));
        uint256 debt = userDebt[user];
        if (debt == 0) {
            return (type(uint256).max, price);
        }

        uint256 collateral = userCollateral[user];

        // Collateral value in 8 decimals USD (price is 8 decimals, collateral is 18 decimals)
        uint256 collateralValueUsd = (collateral * price) / 1e18;

        // Max borrow capacity in 8 decimals USD
        uint256 maxBorrowCapacityUsd = (collateralValueUsd * LIQUIDATION_THRESHOLD_BPS) / BPS_DENOMINATOR;

        // Debt value in 8 decimals USD (debtToken has 6 decimals, so multiply by 1e2 to get 8 decimals)
        uint256 debtValueUsd = debt * 100;

        // Health factor scaled to 1e18: (maxBorrowCapacityUsd * 1e18) / debtValueUsd
        healthFactor = (maxBorrowCapacityUsd * 1e18) / debtValueUsd;
    }

    /**
     * @notice Execute liquidation when user health factor drops below 1.0 (1e18)
     */
    function liquidate(address user, uint256 debtToCover) external {
        require(debtToCover > 0, "debtToCover must be > 0");
        require(userDebt[user] >= debtToCover, "debtToCover exceeds user debt");

        (uint256 healthFactor, uint256 price) = getHealthFactor(user);
        require(healthFactor < 1e18, "Position is not liquidatable");

        // Debt value to cover in USD (8 decimals)
        uint256 debtCoverUsd = debtToCover * 100;

        // Required collateral value to seize with 5% bonus (8 decimals)
        uint256 collateralValueToSeizeUsd = (debtCoverUsd * (BPS_DENOMINATOR + LIQUIDATION_BONUS_BPS)) / BPS_DENOMINATOR;

        // Collateral amount in 18 decimals: (collateralValueToSeizeUsd * 1e18) / price
        uint256 collateralToSeize = (collateralValueToSeizeUsd * 1e18) / price;

        if (collateralToSeize > userCollateral[user]) {
            collateralToSeize = userCollateral[user];
        }

        // Transfer debt from liquidator to pool
        debtToken.safeTransferFrom(msg.sender, address(this), debtToCover);
        userDebt[user] -= debtToCover;

        // Deduct collateral from user and send to liquidator
        userCollateral[user] -= collateralToSeize;
        collateralToken.safeTransfer(msg.sender, collateralToSeize);

        emit LiquidationCall(msg.sender, user, debtToCover, collateralToSeize, price);
    }
}
