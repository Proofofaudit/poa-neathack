// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/MockERC20.sol";
import "../src/DemoOracle.sol";
import "../src/DemoLendingPool.sol";
import "../src/RestitutionDistributor.sol";

contract LendingAndRestitutionTest is Test {
    MockERC20 public weth;
    MockERC20 public usdc;
    DemoOracle public oracle;
    DemoLendingPool public pool;
    RestitutionDistributor public distributor;

    address public owner = address(0x1);
    address public liquidator = address(0x2);
    address public borrower1 = address(0x101); // Wrongful liquidation victim 1
    address public borrower2 = address(0x102); // Wrongful liquidation victim 2
    address public borrower3 = address(0x103); // Wrongful liquidation victim 3
    address public borrower4 = address(0x104); // Healthy (safe buffer)
    address public borrower5 = address(0x105); // Borderline safe borrower

    uint256 public constant BASELINE_PRICE = 2000 * 1e8; // $2,000.00
    uint256 public constant FAULTY_PRICE = 1800 * 1e8;   // $1,800.00 (-10% faulty flash crash)

    function setUp() public {
        vm.startPrank(owner);

        weth = new MockERC20("Wrapped Ether", "WETH", 18);
        usdc = new MockERC20("USD Coin", "USDC", 6);
        oracle = new DemoOracle();
        pool = new DemoLendingPool(address(weth), address(usdc), address(oracle));
        distributor = new RestitutionDistributor();

        // Configure baseline price: 1 WETH = $2000 USD
        oracle.setAssetPrice(address(weth), BASELINE_PRICE, "BASELINE");

        // Fund lending pool with USDC liquidity
        usdc.mint(address(pool), 1_000_000 * 1e6); // 1,000,000 USDC

        // Fund liquidator with USDC
        usdc.mint(liquidator, 500_000 * 1e6);

        // Setup borrowers: (Collateral WETH, Borrowed USDC)
        _setupBorrower(borrower1, 10 * 1e18, 15_000 * 1e6); // Baseline HF: 1.066 -> Faulty HF: 0.960 (WRONGFUL LIQ)
        _setupBorrower(borrower2, 5 * 1e18, 7_500 * 1e6);   // Baseline HF: 1.066 -> Faulty HF: 0.960 (WRONGFUL LIQ)
        _setupBorrower(borrower3, 8 * 1e18, 12_000 * 1e6);  // Baseline HF: 1.066 -> Faulty HF: 0.960 (WRONGFUL LIQ)
        _setupBorrower(borrower4, 10 * 1e18, 10_000 * 1e6); // Baseline HF: 1.600 -> Faulty HF: 1.440 (HEALTHY)
        _setupBorrower(borrower5, 10 * 1e18, 15_800 * 1e6); // Baseline HF: 1.012 -> Faulty HF: 0.911 (BORDERLINE)

        vm.stopPrank();

        // Liquidator approves lending pool
        vm.prank(liquidator);
        usdc.approve(address(pool), type(uint256).max);
    }

    function _setupBorrower(address borrower, uint256 collateral, uint256 borrowAmount) internal {
        weth.mint(borrower, collateral);
        vm.startPrank(borrower);
        weth.approve(address(pool), collateral);
        pool.deposit(collateral);
        if (borrowAmount > 0) {
            pool.borrow(borrowAmount);
        }
        vm.stopPrank();
    }

    function test_BaselineHealthFactors() public view {
        (uint256 hf1, ) = pool.getHealthFactor(borrower1);
        (uint256 hf2, ) = pool.getHealthFactor(borrower2);
        (uint256 hf3, ) = pool.getHealthFactor(borrower3);
        (uint256 hf4, ) = pool.getHealthFactor(borrower4);

        assertGt(hf1, 1e18, "Borrower 1 must be healthy at baseline");
        assertGt(hf2, 1e18, "Borrower 2 must be healthy at baseline");
        assertGt(hf3, 1e18, "Borrower 3 must be healthy at baseline");
        assertGt(hf4, 1e18, "Borrower 4 must be healthy at baseline");
    }

    function test_CannotLiquidateHealthyBorrower() public {
        vm.prank(liquidator);
        vm.expectRevert("Position is not liquidatable");
        pool.liquidate(borrower1, 5_000 * 1e6);
    }

    function test_FaultyOracleDropAndLiquidations() public {
        // Trigger faulty update
        vm.prank(owner);
        oracle.setAssetPrice(address(weth), FAULTY_PRICE, "FAULTY_DROP_10PCT");

        // Verify borrowers 1, 2, 3 are now underwater
        (uint256 hf1, ) = pool.getHealthFactor(borrower1);
        (uint256 hf2, ) = pool.getHealthFactor(borrower2);
        (uint256 hf3, ) = pool.getHealthFactor(borrower3);
        (uint256 hf4, ) = pool.getHealthFactor(borrower4);

        assertLt(hf1, 1e18, "Borrower 1 should be liquidatable");
        assertLt(hf2, 1e18, "Borrower 2 should be liquidatable");
        assertLt(hf3, 1e18, "Borrower 3 should be liquidatable");
        assertGt(hf4, 1e18, "Borrower 4 must remain safe");

        // Execute liquidations
        uint256 wethBefore = weth.balanceOf(liquidator);
        vm.startPrank(liquidator);
        pool.liquidate(borrower1, 15_000 * 1e6);
        pool.liquidate(borrower2, 7_500 * 1e6);
        pool.liquidate(borrower3, 12_000 * 1e6);
        vm.stopPrank();

        uint256 wethAfter = weth.balanceOf(liquidator);
        assertGt(wethAfter, wethBefore, "Liquidator should have seized collateral");
    }

    function test_RestitutionDistributorMerkleClaim() public {
        bytes32 incidentId = keccak256("INCIDENT_2026_ORACLE_FLASH_001");
        uint256 claimAmount = 1_500 * 1e6; // 1,500 USDC compensation
        uint256 claimIndex = 0;

        // Build 1-leaf tree for test
        bytes32 leaf = keccak256(bytes.concat(keccak256(abi.encode(claimIndex, borrower1, claimAmount, incidentId))));
        bytes32 merkleRoot = leaf; // Root of single leaf is the leaf itself
        bytes32[] memory proof = new bytes32[](0);

        vm.startPrank(owner);
        // Fund distributor
        usdc.mint(address(distributor), claimAmount);
        distributor.registerIncident(incidentId, merkleRoot, claimAmount, address(usdc), "POLICY_V1_EQUITY_DELTA");
        vm.stopPrank();

        // Borrower claims restitution
        uint256 balBefore = usdc.balanceOf(borrower1);
        distributor.claim(incidentId, claimIndex, borrower1, claimAmount, proof);
        uint256 balAfter = usdc.balanceOf(borrower1);

        assertEq(balAfter - balBefore, claimAmount, "Claimant must receive exact restitution amount");
        assertTrue(distributor.isClaimed(incidentId, claimIndex), "Claim must be marked as executed");

        // Duplicate claim must be rejected
        vm.expectRevert("Claim has already been executed");
        distributor.claim(incidentId, claimIndex, borrower1, claimAmount, proof);
    }

    function test_TamperedClaimIsRejected() public {
        bytes32 incidentId = keccak256("INCIDENT_2026_ORACLE_FLASH_001");
        uint256 claimAmount = 1_500 * 1e6;
        uint256 claimIndex = 0;

        bytes32 leaf = keccak256(bytes.concat(keccak256(abi.encode(claimIndex, borrower1, claimAmount, incidentId))));
        bytes32 merkleRoot = leaf;
        bytes32[] memory proof = new bytes32[](0);

        vm.startPrank(owner);
        usdc.mint(address(distributor), claimAmount);
        distributor.registerIncident(incidentId, merkleRoot, claimAmount, address(usdc), "POLICY_V1_EQUITY_DELTA");
        vm.stopPrank();

        // Adversary tries to claim with increased amount
        vm.expectRevert("Invalid Merkle proof for restitution claim");
        distributor.claim(incidentId, claimIndex, borrower1, claimAmount + 500 * 1e6, proof);

        // Adversary tries to claim to wrong recipient
        vm.expectRevert("Invalid Merkle proof for restitution claim");
        distributor.claim(incidentId, claimIndex, address(0x999), claimAmount, proof);
    }
}
