import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";
import { keccak256, parseEther, toHex, zeroAddress, type Address, type Hex } from "viem";

const FOOD_CAT = keccak256(toHex("Food"));
const PRINTING_CAT = keccak256(toHex("Printing"));

const EXPENSE_TYPES = {
  Expense: [
    { name: "recipient", type: "address" },
    { name: "kind", type: "uint8" },
    { name: "amount", type: "uint256" },
    { name: "category", type: "bytes32" },
    { name: "receiptHash", type: "bytes32" },
    { name: "memo", type: "string" },
    { name: "deadline", type: "uint256" },
  ],
} as const;

describe("MockPHP and OrgVault", async function () {
  async function deployFixture() {
    const { viem, networkHelpers } = await network.create();
    const publicClient = await viem.getPublicClient();
    const [owner, attestor, relayer, vendor, unapprovedVendor, officer, member] =
      await viem.getWalletClients();

    const mockPhp = await viem.deployContract("MockPHP");
    const orgVault = await viem.deployContract("OrgVault", [
      mockPhp.address,
      attestor.account.address,
    ]);

    const chainId = await publicClient.getChainId();

    // Seed initial member dues (₱5,000), Food budget (₱1,000), approved vendor, and officer
    const initialDues = parseEther("5000");
    await mockPhp.write.mint([member.account.address, initialDues]);
    await mockPhp.write.approve([orgVault.address, initialDues], {
      account: member.account,
    });
    await orgVault.write.payDues([initialDues], { account: member.account });

    await orgVault.write.setBudget([FOOD_CAT, parseEther("1000")]);
    await orgVault.write.setBudget([PRINTING_CAT, parseEther("500")]);
    await orgVault.write.setVendor([vendor.account.address, "Canteen", true]);
    await orgVault.write.setOfficer([officer.account.address, "Jemkirk", parseEther("2000")]);

    async function signExpense(
      signer: typeof attestor,
      expense: {
        recipient: Address;
        kind: number;
        amount: bigint;
        category: Hex;
        receiptHash: Hex;
        memo: string;
        deadline: bigint;
      },
    ) {
      return signer.signTypedData({
        domain: {
          name: "OrgVault",
          version: "1",
          chainId,
          verifyingContract: orgVault.address,
        },
        types: EXPENSE_TYPES,
        primaryType: "Expense",
        message: expense,
      });
    }

    async function futureDeadline(seconds = 600n) {
      const block = await publicClient.getBlock();
      return block.timestamp + seconds;
    }

    return {
      viem,
      networkHelpers,
      publicClient,
      owner,
      attestor,
      relayer,
      vendor,
      unapprovedVendor,
      officer,
      member,
      mockPhp,
      orgVault,
      signExpense,
      futureDeadline,
    };
  }

  it("MockPHP mints within cap and blocks over-cap / invalid calls", async function () {
    const { viem, mockPhp, member } = await deployFixture();
    await mockPhp.write.mint([member.account.address, parseEther("10000")]);
    await viem.assertions.revertWithCustomError(
      mockPhp.write.mint([member.account.address, parseEther("10001")]),
      mockPhp,
      "ExceedsMintCap",
    );
    await viem.assertions.revertWithCustomError(
      mockPhp.write.mint([zeroAddress, parseEther("10")]),
      mockPhp,
      "ZeroAddress",
    );
    await viem.assertions.revertWithCustomError(
      mockPhp.write.mint([member.account.address, 0n]),
      mockPhp,
      "ZeroAmount",
    );
  });

  it("payDues transfers tokens, emits DuesPaid, and rejects zero amount", async function () {
    const { viem, mockPhp, orgVault, member } = await deployFixture();
    const extraDues = parseEther("500");
    await mockPhp.write.mint([member.account.address, extraDues]);
    await mockPhp.write.approve([orgVault.address, extraDues], {
      account: member.account,
    });

    await viem.assertions.emitWithArgs(
      orgVault.write.payDues([extraDues], { account: member.account }),
      orgVault,
      "DuesPaid",
      [member.account.address, extraDues],
    );

    assert.equal(await orgVault.read.vaultBalance(), parseEther("5500"));

    await viem.assertions.revertWithCustomError(
      orgVault.write.payDues([0n], { account: member.account }),
      orgVault,
      "ZeroAmount",
    );
  });

  it("payDuesForPeriod records period payment and blocks duplicate payment for the same period", async function () {
    const { viem, mockPhp, orgVault, member } = await deployFixture();
    const sem1Period = keccak256(toHex("Computer Science Society:1st Semester AY 2026-2027"));
    const sem2Period = keccak256(toHex("Computer Science Society:2nd Semester AY 2026-2027"));
    const duesAmount = parseEther("1");

    await mockPhp.write.mint([member.account.address, parseEther("10")]);
    await mockPhp.write.approve([orgVault.address, parseEther("10")], {
      account: member.account,
    });

    await viem.assertions.emitWithArgs(
      orgVault.write.payDuesForPeriod([sem1Period, duesAmount], { account: member.account }),
      orgVault,
      "DuesPaidForPeriod",
      [member.account.address, sem1Period, duesAmount],
    );

    assert.equal(
      await orgVault.read.hasPaidDuesForPeriod([sem1Period, member.account.address]),
      true,
    );

    // Duplicate payment for the same period reverts
    await viem.assertions.revertWithCustomErrorWithArgs(
      orgVault.write.payDuesForPeriod([sem1Period, duesAmount], { account: member.account }),
      orgVault,
      "DuplicateDuesPayment",
      [sem1Period, member.account.address],
    );

    // Paying for a different period succeeds
    await orgVault.write.payDuesForPeriod([sem2Period, duesAmount], { account: member.account });
    assert.equal(
      await orgVault.read.hasPaidDuesForPeriod([sem2Period, member.account.address]),
      true,
    );
  });

  it("executes valid vendor payment via relayer and updates budget & receipt status", async function () {
    const { viem, orgVault, mockPhp, attestor, relayer, vendor, signExpense, futureDeadline } =
      await deployFixture();

    const receiptHash = keccak256(toHex("receipt-1-canteen-450"));
    const expense = {
      recipient: vendor.account.address,
      kind: 0,
      amount: parseEther("450"),
      category: FOOD_CAT,
      receiptHash,
      memo: "Canteen lunch order",
      deadline: await futureDeadline(),
    };
    const sig = await signExpense(attestor, expense);

    await viem.assertions.emitWithArgs(
      orgVault.write.executeExpense([expense, sig], { account: relayer.account }),
      orgVault,
      "ExpensePaid",
      [0, vendor.account.address, expense.amount, FOOD_CAT, receiptHash, expense.memo, expense.amount],
    );

    assert.equal(await mockPhp.read.balanceOf([vendor.account.address]), parseEther("450"));
    assert.equal(await orgVault.read.vaultBalance(), parseEther("4550"));
    assert.equal(await orgVault.read.usedReceipts([receiptHash]), true);

    const [limit, spent, remaining] = await orgVault.read.getBudget([FOOD_CAT]);
    assert.equal(limit, parseEther("1000"));
    assert.equal(spent, parseEther("450"));
    assert.equal(remaining, parseEther("550"));
  });

  it("rejects bad signature, wrong signer, and expired deadline", async function () {
    const { viem, orgVault, attestor, relayer, vendor, member, signExpense, futureDeadline } =
      await deployFixture();

    const expense = {
      recipient: vendor.account.address,
      kind: 0,
      amount: parseEther("100"),
      category: FOOD_CAT,
      receiptHash: keccak256(toHex("receipt-sig-test")),
      memo: "Snacks",
      deadline: await futureDeadline(),
    };

    // Garbage / tampered signature
    await viem.assertions.revertWithCustomError(
      orgVault.write.executeExpense([expense, "0x1234"], { account: relayer.account }),
      orgVault,
      "BadSignature",
    );

    // Wrong signer
    const wrongSig = await signExpense(member, expense);
    await viem.assertions.revertWithCustomError(
      orgVault.write.executeExpense([expense, wrongSig], { account: relayer.account }),
      orgVault,
      "BadSignature",
    );

    // Expired deadline
    const expiredExpense = { ...expense, deadline: 1n };
    const expiredSig = await signExpense(attestor, expiredExpense);
    await viem.assertions.revertWithCustomError(
      orgVault.write.executeExpense([expiredExpense, expiredSig], {
        account: relayer.account,
      }),
      orgVault,
      "Expired",
    );
  });

  it("blocks duplicate receipts, unapproved vendors, invalid kind, zero amount, and over-budget", async function () {
    const {
      viem,
      orgVault,
      attestor,
      relayer,
      vendor,
      unapprovedVendor,
      signExpense,
      futureDeadline,
    } = await deployFixture();

    const receiptHash = keccak256(toHex("receipt-dup"));
    const first = {
      recipient: vendor.account.address,
      kind: 0,
      amount: parseEther("500"),
      category: FOOD_CAT,
      receiptHash,
      memo: "First order",
      deadline: await futureDeadline(),
    };
    const firstSig = await signExpense(attestor, first);
    await orgVault.write.executeExpense([first, firstSig], { account: relayer.account });

    // Duplicate receipt
    await viem.assertions.revertWithCustomError(
      orgVault.write.executeExpense([first, firstSig], { account: relayer.account }),
      orgVault,
      "DuplicateReceipt",
    );

    // Unapproved vendor
    const badVendorExp = {
      recipient: unapprovedVendor.account.address,
      kind: 0,
      amount: parseEther("100"),
      category: FOOD_CAT,
      receiptHash: keccak256(toHex("receipt-bad-vendor")),
      memo: "Unapproved",
      deadline: await futureDeadline(),
    };
    await viem.assertions.revertWithCustomError(
      orgVault.write.executeExpense(
        [badVendorExp, await signExpense(attestor, badVendorExp)],
        { account: relayer.account },
      ),
      orgVault,
      "VendorNotApproved",
    );

    // Invalid kind
    const badKindExp = {
      ...badVendorExp,
      recipient: vendor.account.address,
      kind: 2,
      receiptHash: keccak256(toHex("receipt-bad-kind")),
    };
    await viem.assertions.revertWithCustomError(
      orgVault.write.executeExpense(
        [badKindExp, await signExpense(attestor, badKindExp)],
        { account: relayer.account },
      ),
      orgVault,
      "InvalidKind",
    );

    // Zero amount
    const zeroExp = {
      ...first,
      amount: 0n,
      receiptHash: keccak256(toHex("receipt-zero")),
    };
    await viem.assertions.revertWithCustomError(
      orgVault.write.executeExpense([zeroExp, await signExpense(attestor, zeroExp)], {
        account: relayer.account,
      }),
      orgVault,
      "ZeroAmount",
    );

    // Over category budget: 500 remaining, request 1000 -> OverCategoryBudget(..., 1000e18, 500e18)
    const overExp = {
      recipient: vendor.account.address,
      kind: 0,
      amount: parseEther("1000"),
      category: FOOD_CAT,
      receiptHash: keccak256(toHex("receipt-over-budget")),
      memo: "Over by 500",
      deadline: await futureDeadline(),
    };
    await viem.assertions.revertWithCustomErrorWithArgs(
      orgVault.write.executeExpense([overExp, await signExpense(attestor, overExp)], {
        account: relayer.account,
      }),
      orgVault,
      "OverCategoryBudget",
      [FOOD_CAT, parseEther("1000"), parseEther("500")],
    );
  });

  it("enforces officer reimbursement caps (Tier 2) and unregistered officer rejection", async function () {
    const { viem, orgVault, mockPhp, attestor, relayer, officer, member, signExpense, futureDeadline } =
      await deployFixture();

    await orgVault.write.setBudget([FOOD_CAT, parseEther("3000")]);

    const okReimb = {
      recipient: officer.account.address,
      kind: 1,
      amount: parseEther("1200"),
      category: FOOD_CAT,
      receiptHash: keccak256(toHex("reimb-1")),
      memo: "Officer lunch advance",
      deadline: await futureDeadline(),
    };
    await orgVault.write.executeExpense([okReimb, await signExpense(attestor, okReimb)], {
      account: relayer.account,
    });
    assert.equal(await mockPhp.read.balanceOf([officer.account.address]), parseEther("1200"));

    // Cap is 2000, remaining cap is 800, requesting 900 reverts OverOfficerCap
    const overCap = {
      ...okReimb,
      amount: parseEther("900"),
      receiptHash: keccak256(toHex("reimb-2")),
    };
    await viem.assertions.revertWithCustomErrorWithArgs(
      orgVault.write.executeExpense([overCap, await signExpense(attestor, overCap)], {
        account: relayer.account,
      }),
      orgVault,
      "OverOfficerCap",
      [parseEther("900"), parseEther("800")],
    );

    // Unregistered officer
    const unreg = {
      ...okReimb,
      recipient: member.account.address,
      amount: parseEther("100"),
      receiptHash: keccak256(toHex("reimb-3")),
    };
    await viem.assertions.revertWithCustomError(
      orgVault.write.executeExpense([unreg, await signExpense(attestor, unreg)], {
        account: relayer.account,
      }),
      orgVault,
      "OfficerNotRegistered",
    );
  });

  it("enforces owner-only controls, pause/unpause, withdraw, and InsufficientVault", async function () {
    const { viem, orgVault, mockPhp, owner, attestor, relayer, vendor, member, signExpense, futureDeadline } =
      await deployFixture();

    // Non-owner calls revert
    await viem.assertions.revertWithCustomError(
      orgVault.write.setBudget([FOOD_CAT, parseEther("9999")], { account: member.account }),
      orgVault,
      "OwnableUnauthorizedAccount",
    );
    await viem.assertions.revertWithCustomError(
      orgVault.write.setVendor([vendor.account.address, "X", false], { account: member.account }),
      orgVault,
      "OwnableUnauthorizedAccount",
    );
    await viem.assertions.revertWithCustomError(
      orgVault.write.setAttestor([member.account.address], { account: member.account }),
      orgVault,
      "OwnableUnauthorizedAccount",
    );
    await viem.assertions.revertWithCustomError(
      orgVault.write.pause({ account: member.account }),
      orgVault,
      "OwnableUnauthorizedAccount",
    );
    await viem.assertions.revertWithCustomError(
      orgVault.write.withdraw([parseEther("100")], { account: member.account }),
      orgVault,
      "OwnableUnauthorizedAccount",
    );

    // Pause blocks executeExpense; unpause restores it
    await orgVault.write.pause();
    const exp = {
      recipient: vendor.account.address,
      kind: 0,
      amount: parseEther("200"),
      category: FOOD_CAT,
      receiptHash: keccak256(toHex("pause-test")),
      memo: "Paused check",
      deadline: await futureDeadline(),
    };
    const sig = await signExpense(attestor, exp);
    await viem.assertions.revertWithCustomError(
      orgVault.write.executeExpense([exp, sig], { account: relayer.account }),
      orgVault,
      "ContractPaused",
    );

    await orgVault.write.unpause();

    // Owner withdraws almost everything so vault has only 50 left, triggering InsufficientVault
    await orgVault.write.withdraw([parseEther("4950")]);
    assert.equal(await mockPhp.read.balanceOf([owner.account.address]), parseEther("4950"));
    assert.equal(await orgVault.read.vaultBalance(), parseEther("50"));

    await viem.assertions.revertWithCustomErrorWithArgs(
      orgVault.write.executeExpense([exp, sig], { account: relayer.account }),
      orgVault,
      "InsufficientVault",
      [parseEther("200"), parseEther("50")],
    );

    // View helpers check
    const vendorsList = await orgVault.read.getVendors();
    assert.equal(vendorsList.length, 1);
    assert.equal(vendorsList[0].label, "Canteen");

    const officersList = await orgVault.read.getOfficers();
    assert.equal(officersList.length, 1);
    assert.equal(officersList[0].label, "Jemkirk");
  });
});
