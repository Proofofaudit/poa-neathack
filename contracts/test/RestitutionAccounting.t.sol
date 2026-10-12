// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import "forge-std/Test.sol";
import "../src/MockERC20.sol";
import "../src/RestitutionDistributor.sol";
import "../src/CumulativeRestitutionDistributor.sol";
contract RestitutionAccountingTest is Test {
    MockERC20 token;
    RestitutionDistributor distributor;
    bytes32 constant A=bytes32(uint256(1));bytes32 constant B=bytes32(uint256(2));
    address constant victim=address(0x123);
    function setUp() public {token=new MockERC20("USD","USD",6);distributor=new RestitutionDistributor();token.mint(address(distributor),200);}
    function leaf(uint256 index,uint256 amount,bytes32 incident) internal pure returns(bytes32){return keccak256(bytes.concat(keccak256(abi.encode(index,victim,amount,incident))));}
    function setupIncidents() internal {
        bytes32 x=leaf(0,40,A);bytes32 y=leaf(1,60,A);
        bytes32 root=x<y?keccak256(abi.encodePacked(x,y)):keccak256(abi.encodePacked(y,x));
        distributor.registerIncident(A,root,100,address(token),"v2");
        vm.warp(block.timestamp+1 days);
        distributor.registerIncident(B,leaf(0,100,B),100,address(token),"v2");
    }
    function claimForty() internal {bytes32[] memory proof=new bytes32[](1);proof[0]=leaf(1,60,A);distributor.claim(A,0,victim,40,proof);}
    function test_PartialClaimSweepPreservesOtherIncident() public {
        setupIncidents();claimForty();vm.warp(block.timestamp+179 days);
        distributor.sweepExpiredIncident(A,address(this));
        assertEq(token.balanceOf(address(this)),60);assertEq(token.balanceOf(address(distributor)),100);
        assertEq(distributor.totalCommittedTokens(address(token)),100);
        // Another incident can still be paid before its own deadline.
        distributor.claim(B,0,victim,100,new bytes32[](0));assertEq(token.balanceOf(victim),140);
    }
    function test_CannotReregisterSweptIncident() public {
        setupIncidents();vm.warp(block.timestamp+180 days);distributor.sweepExpiredIncident(A,address(this));
        vm.expectRevert("Incident already registered and finalized");distributor.registerIncident(A,leaf(0,20,A),20,address(token),"v2");
    }
    function test_CannotSweepTwice() public {
        setupIncidents();vm.warp(block.timestamp+180 days);distributor.sweepExpiredIncident(A,address(this));
        vm.expectRevert("Incident manifest not finalized");distributor.sweepExpiredIncident(A,address(this));
    }
    function test_CannotOvercommitMultipleIncidents() public {
        distributor.registerIncident(A,leaf(0,150,A),150,address(token),"v2");
        vm.expectRevert("Distributor contract has insufficient uncommitted funding");distributor.registerIncident(B,leaf(0,100,B),100,address(token),"v2");
    }
    function test_ClaimCannotExceedIncidentBudgetEvenWithValidProof() public {
        distributor.registerIncident(A,leaf(0,150,A),100,address(token),"v2");
        vm.expectRevert("Claim exceeds incident balance");distributor.claim(A,0,victim,150,new bytes32[](0));
    }
    function test_ClaimAndSweepExpiryBoundary() public {
        setupIncidents();vm.expectRevert("Incident claim window not expired");distributor.sweepExpiredIncident(A,address(this));
        vm.warp(block.timestamp+180 days);vm.expectRevert("Incident claim window expired");claimForty();
        distributor.sweepExpiredIncident(A,address(this));assertEq(token.balanceOf(address(this)),100);
    }
    function test_NonOwnerCannotPublishOrSweep() public {
        setupIncidents();vm.prank(victim);vm.expectRevert();distributor.sweepExpiredIncident(A,victim);
        vm.prank(victim);vm.expectRevert();distributor.registerIncident(bytes32(uint256(3)),leaf(0,1,A),1,address(token),"v2");
    }
    function test_FuzzSweepOnlyUnclaimed(uint96 amount) public {
        uint256 value=bound(uint256(amount),1,199);bytes32 x=leaf(0,value,A);bytes32 y=leaf(1,200-value,A);
        distributor.registerIncident(A,x<y?keccak256(abi.encodePacked(x,y)):keccak256(abi.encodePacked(y,x)),200,address(token),"v2");
        bytes32[] memory proof=new bytes32[](1);proof[0]=y;distributor.claim(A,0,victim,value,proof);
        vm.warp(block.timestamp+180 days);distributor.sweepExpiredIncident(A,address(this));
        assertEq(token.balanceOf(victim)+token.balanceOf(address(this)),200);assertEq(distributor.totalCommittedTokens(address(token)),0);
    }
    function test_CumulativeEpochMustBeFundedAndMonotonic() public {
        CumulativeRestitutionDistributor cumulative=new CumulativeRestitutionDistributor(A,address(token));token.mint(address(cumulative),100);
        cumulative.publishEpoch(bytes32(uint256(4)),100,"v2");
        vm.expectRevert("Allocation cannot decrease");cumulative.publishEpoch(bytes32(uint256(5)),50,"v2");
        vm.expectRevert("Epoch insufficiently funded");cumulative.publishEpoch(bytes32(uint256(5)),101,"v2");
    }
}
