// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

contract DemoOracle is Ownable {
    uint8 public constant DECIMALS = 8;

    struct PriceData {
        uint256 price;       // Scaled by 10^8 (e.g. 2000 * 1e8 = $2000.00)
        uint256 timestamp;
        string configTag;    // "BASELINE", "FAULTY_DROP_10PCT", "RECOVERED"
    }

    mapping(address => PriceData) public assetPrices;

    event PriceUpdated(
        address indexed asset,
        uint256 price,
        uint256 timestamp,
        string configTag
    );

    constructor() Ownable(msg.sender) {}

    function setAssetPrice(
        address asset,
        uint256 price,
        string calldata configTag
    ) external onlyOwner {
        require(price > 0, "Price must be greater than zero");
        assetPrices[asset] = PriceData({
            price: price,
            timestamp: block.timestamp,
            configTag: configTag
        });

        emit PriceUpdated(asset, price, block.timestamp, configTag);
    }

    function getAssetPrice(address asset) external view returns (uint256, uint256, string memory) {
        PriceData memory data = assetPrices[asset];
        require(data.price > 0, "Price not configured");
        return (data.price, data.timestamp, data.configTag);
    }
}
