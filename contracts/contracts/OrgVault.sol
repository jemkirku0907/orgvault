// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/**
 * @title OrgVault
 * @notice Guarded student-organization treasury on BSC Testnet.
 *         An off-chain AI agent extracts receipt fields and a backend attestor
 *         signs an EIP-712 Expense struct; this contract enforces all rules
 *         (signature, expiry, duplicate receipt, vendor/officer allowlists,
 *         per-category budgets, officer caps, and vault balance) before paying.
 */
contract OrgVault is Ownable, Pausable, ReentrancyGuard, EIP712 {
    using SafeERC20 for IERC20;

    uint8 public constant KIND_VENDOR_PAYMENT = 0;
    uint8 public constant KIND_REIMBURSEMENT = 1;

    bytes32 public constant EXPENSE_TYPEHASH = keccak256(
        "Expense(address recipient,uint8 kind,uint256 amount,bytes32 category,bytes32 receiptHash,string memo,uint256 deadline)"
    );

    struct Expense {
        address recipient;
        uint8 kind;
        uint256 amount;
        bytes32 category;
        bytes32 receiptHash;
        string memo;
        uint256 deadline;
    }

    struct Budget {
        uint256 limit;
        uint256 spent;
    }

    struct Vendor {
        string label;
        bool approved;
    }

    struct VendorInfo {
        address addr;
        string label;
        bool approved;
    }

    struct Officer {
        string label;
        uint256 cap;
        uint256 reimbursed;
        bool registered;
    }

    struct OfficerInfo {
        address addr;
        string label;
        uint256 cap;
        uint256 reimbursed;
        bool registered;
    }

    IERC20 public immutable token;
    address public attestor;

    mapping(bytes32 => Budget) public budgets;
    mapping(address => Vendor) public vendors;
    address[] private vendorList;
    mapping(address => bool) private vendorSeen;

    mapping(address => Officer) public officers;
    address[] private officerList;
    mapping(address => bool) private officerSeen;

    mapping(bytes32 => bool) public usedReceipts;
    mapping(bytes32 => mapping(address => bool)) public hasPaidDuesForPeriod;

    error ContractPaused();
    error BadSignature();
    error Expired();
    error DuplicateReceipt();
    error DuplicateDuesPayment(bytes32 periodId, address member);
    error VendorNotApproved();
    error OfficerNotRegistered();
    error OverOfficerCap(uint256 requested, uint256 remainingCap);
    error InvalidKind();
    error OverCategoryBudget(bytes32 category, uint256 requested, uint256 remaining);
    error InsufficientVault(uint256 requested, uint256 available);
    error ZeroAmount();
    error ZeroAddress();

    event DuesPaid(address indexed member, uint256 amount);
    event DuesPaidForPeriod(address indexed member, bytes32 indexed periodId, uint256 amount);
    event ExpensePaid(
        uint8 indexed kind,
        address indexed recipient,
        uint256 amount,
        bytes32 indexed category,
        bytes32 receiptHash,
        string memo,
        uint256 spentInCategory
    );
    event BudgetSet(bytes32 indexed category, uint256 limit);
    event VendorSet(address indexed vendor, string label, bool approved);
    event OfficerSet(address indexed officer, string label, uint256 cap, bool registered);
    event AttestorSet(address indexed attestor);
    event Withdrawn(address indexed to, uint256 amount);

    constructor(address _token, address _attestor)
        Ownable(msg.sender)
        EIP712("OrgVault", "1")
    {
        if (_token == address(0) || _attestor == address(0)) revert ZeroAddress();
        token = IERC20(_token);
        attestor = _attestor;
        emit AttestorSet(_attestor);
    }

    // --- Member & Owner Actions ---

    function payDues(uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();
        token.safeTransferFrom(msg.sender, address(this), amount);
        emit DuesPaid(msg.sender, amount);
    }

    function payDuesForPeriod(bytes32 periodId, uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();
        if (hasPaidDuesForPeriod[periodId][msg.sender]) {
            revert DuplicateDuesPayment(periodId, msg.sender);
        }
        hasPaidDuesForPeriod[periodId][msg.sender] = true;
        token.safeTransferFrom(msg.sender, address(this), amount);
        emit DuesPaid(msg.sender, amount);
        emit DuesPaidForPeriod(msg.sender, periodId, amount);
    }

    function withdraw(uint256 amount) external onlyOwner nonReentrant {
        if (amount == 0) revert ZeroAmount();
        uint256 bal = token.balanceOf(address(this));
        if (bal < amount) revert InsufficientVault(amount, bal);
        token.safeTransfer(owner(), amount);
        emit Withdrawn(owner(), amount);
    }

    function setBudget(bytes32 category, uint256 limit) external onlyOwner {
        budgets[category].limit = limit;
        emit BudgetSet(category, limit);
    }

    function setVendor(address vendor, string calldata label, bool approved) external onlyOwner {
        if (vendor == address(0)) revert ZeroAddress();
        vendors[vendor] = Vendor({label: label, approved: approved});
        if (!vendorSeen[vendor]) {
            vendorSeen[vendor] = true;
            vendorList.push(vendor);
        }
        emit VendorSet(vendor, label, approved);
    }

    function setOfficer(address officer, string calldata label, uint256 cap) external onlyOwner {
        if (officer == address(0)) revert ZeroAddress();
        bool active = cap > 0;
        officers[officer] = Officer({
            label: label,
            cap: cap,
            reimbursed: officers[officer].reimbursed,
            registered: active
        });
        if (!officerSeen[officer]) {
            officerSeen[officer] = true;
            officerList.push(officer);
        }
        emit OfficerSet(officer, label, cap, active);
    }

    function setAttestor(address _attestor) external onlyOwner {
        if (_attestor == address(0)) revert ZeroAddress();
        attestor = _attestor;
        emit AttestorSet(_attestor);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // --- Guarded Expense Execution ---

    function executeExpense(Expense calldata e, bytes calldata signature) external nonReentrant {
        if (paused()) revert ContractPaused();
        if (block.timestamp > e.deadline) revert Expired();
        if (e.amount == 0) revert ZeroAmount();
        if (e.recipient == address(0)) revert ZeroAddress();

        bytes32 structHash = keccak256(
            abi.encode(
                EXPENSE_TYPEHASH,
                e.recipient,
                e.kind,
                e.amount,
                e.category,
                e.receiptHash,
                keccak256(bytes(e.memo)),
                e.deadline
            )
        );
        bytes32 digest = _hashTypedDataV4(structHash);
        (address recovered, ECDSA.RecoverError err, ) = ECDSA.tryRecover(digest, signature);
        if (err != ECDSA.RecoverError.NoError || recovered != attestor) {
            revert BadSignature();
        }

        if (usedReceipts[e.receiptHash]) revert DuplicateReceipt();

        if (e.kind == KIND_VENDOR_PAYMENT) {
            if (!vendors[e.recipient].approved) revert VendorNotApproved();
        } else if (e.kind == KIND_REIMBURSEMENT) {
            Officer storage off = officers[e.recipient];
            if (!off.registered) revert OfficerNotRegistered();
            uint256 remainingCap = off.cap > off.reimbursed ? off.cap - off.reimbursed : 0;
            if (e.amount > remainingCap) revert OverOfficerCap(e.amount, remainingCap);
        } else {
            revert InvalidKind();
        }

        Budget storage b = budgets[e.category];
        uint256 remainingBudget = b.limit > b.spent ? b.limit - b.spent : 0;
        if (e.amount > remainingBudget) {
            revert OverCategoryBudget(e.category, e.amount, remainingBudget);
        }

        uint256 bal = token.balanceOf(address(this));
        if (bal < e.amount) revert InsufficientVault(e.amount, bal);

        // Effects before interaction
        usedReceipts[e.receiptHash] = true;
        b.spent += e.amount;
        if (e.kind == KIND_REIMBURSEMENT) {
            officers[e.recipient].reimbursed += e.amount;
        }

        token.safeTransfer(e.recipient, e.amount);

        emit ExpensePaid(
            e.kind,
            e.recipient,
            e.amount,
            e.category,
            e.receiptHash,
            e.memo,
            b.spent
        );
    }

    // --- View Helpers ---

    function getBudget(bytes32 category)
        external
        view
        returns (uint256 limit, uint256 spent, uint256 remaining)
    {
        Budget storage b = budgets[category];
        limit = b.limit;
        spent = b.spent;
        remaining = b.limit > b.spent ? b.limit - b.spent : 0;
    }

    function vaultBalance() external view returns (uint256) {
        return token.balanceOf(address(this));
    }

    function getVendors() external view returns (VendorInfo[] memory result) {
        uint256 len = vendorList.length;
        result = new VendorInfo[](len);
        for (uint256 i = 0; i < len; i++) {
            address addr = vendorList[i];
            Vendor storage v = vendors[addr];
            result[i] = VendorInfo({addr: addr, label: v.label, approved: v.approved});
        }
    }

    function getOfficers() external view returns (OfficerInfo[] memory result) {
        uint256 len = officerList.length;
        result = new OfficerInfo[](len);
        for (uint256 i = 0; i < len; i++) {
            address addr = officerList[i];
            Officer storage o = officers[addr];
            result[i] = OfficerInfo({
                addr: addr,
                label: o.label,
                cap: o.cap,
                reimbursed: o.reimbursed,
                registered: o.registered
            });
        }
    }
}
