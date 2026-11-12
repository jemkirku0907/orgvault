// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockPHP
 * @notice Testnet-only demo stablecoin unit where 1 token (1e18 wei) = ₱1.00.
 *         Not a token launch; exists solely so OrgVault amounts stay in pesos.
 */
contract MockPHP is ERC20 {
    uint256 public constant MAX_MINT_PER_CALL = 10_000 ether;

    error ZeroAddress();
    error ZeroAmount();
    error ExceedsMintCap(uint256 requested, uint256 cap);

    constructor() ERC20("Mock Philippine Peso", "mPHP") {}

    function mint(address to, uint256 amount) external {
        if (to == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        if (amount > MAX_MINT_PER_CALL) {
            revert ExceedsMintCap(amount, MAX_MINT_PER_CALL);
        }
        _mint(to, amount);
    }
}
