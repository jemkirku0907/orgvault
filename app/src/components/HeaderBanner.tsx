"use client";

import Link from "next/link";

interface HeaderBannerProps {
  orgName?: string;
  university?: string;
}

export default function HeaderBanner({ orgName, university }: HeaderBannerProps) {
  return (
    <header className="orgvault-header">
      <div className="bg-grid" />
      <div className="glow-orb" />
      <div className="dots-top-right" />
      <div className="dots-bottom-left" />

      {/* Animated Wave Lines */}
      <svg className="bg-waves" viewBox="0 0 600 120" preserveAspectRatio="none">
        <path
          className="wave-path-gold"
          d="M0,115 C120,75 180,105 300,65 C420,25 490,45 620,10"
        />
        <path
          className="wave-path-blue"
          d="M0,120 C140,95 220,110 340,75 C460,40 520,20 620,18"
        />
      </svg>

      <div className="header-inner">
        <div className="brand-group">
          {/* Animated Yellow Safe Mascot */}
          <div className="mascot-wrapper">
            <svg
              className="mascot-svg"
              viewBox="0 0 200 190"
              xmlns="http://www.w3.org/2000/svg"
              role="img"
              aria-label="OrgVault Animated Safe Mascot"
            >
              {/* Ground Shadow */}
              <ellipse cx="100" cy="174" rx="56" ry="7" fill="rgba(2, 6, 23, 0.55)" />

              {/* Sparkles */}
              <path
                className="sparkle-1"
                d="M24 72 L27 65 L30 72 L37 75 L30 78 L27 85 L24 78 L17 75 Z"
                fill="#facc15"
              />
              <path
                className="sparkle-2"
                d="M174 132 L177 125 L180 132 L187 135 L180 138 L177 145 L174 138 L167 135 Z"
                fill="#38bdf8"
              />
              <path
                className="sparkle-3"
                d="M22 140 L24 135 L26 140 L31 142 L26 144 L24 149 L22 144 L17 142 Z"
                fill="#facc15"
              />

              {/* Animated Safe Body */}
              <g className="safe-body">
                {/* Arms */}
                <g className="arm-left">
                  <path
                    d="M48 104 Q32 98 28 86"
                    fill="none"
                    stroke="#0f172a"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                  />
                  <path
                    d="M28 86 L23 81 M28 86 L28 79 M28 86 L33 82"
                    stroke="#0f172a"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                </g>
                <g className="arm-right">
                  <path
                    d="M152 104 Q168 98 172 86"
                    fill="none"
                    stroke="#0f172a"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                  />
                  <path
                    d="M172 86 L167 82 M172 86 L172 79 M172 86 L177 81"
                    stroke="#0f172a"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                </g>

                {/* Safe Feet */}
                <rect
                  x="60"
                  y="160"
                  width="18"
                  height="10"
                  rx="2"
                  fill="#d97706"
                  stroke="#0f172a"
                  strokeWidth="3"
                />
                <rect
                  x="122"
                  y="160"
                  width="18"
                  height="10"
                  rx="2"
                  fill="#d97706"
                  stroke="#0f172a"
                  strokeWidth="3"
                />

                {/* Outer Box */}
                <rect
                  x="48"
                  y="48"
                  width="104"
                  height="114"
                  rx="12"
                  fill="#facc15"
                  stroke="#0f172a"
                  strokeWidth="3.5"
                />

                {/* Inner Door Frame */}
                <rect
                  x="58"
                  y="58"
                  width="84"
                  height="94"
                  rx="7"
                  fill="#fde047"
                  stroke="#0f172a"
                  strokeWidth="2.5"
                />

                {/* Door Hinges */}
                <rect
                  x="139"
                  y="72"
                  width="6"
                  height="16"
                  rx="2"
                  fill="#94a3b8"
                  stroke="#0f172a"
                  strokeWidth="2"
                />
                <rect
                  x="139"
                  y="122"
                  width="6"
                  height="16"
                  rx="2"
                  fill="#94a3b8"
                  stroke="#0f172a"
                  strokeWidth="2"
                />

                {/* Face */}
                <g className="safe-eyes">
                  <circle cx="84" cy="83" r="4.5" fill="#0f172a" />
                  <circle cx="82.5" cy="81.5" r="1.4" fill="#ffffff" />
                  <circle cx="116" cy="83" r="4.5" fill="#0f172a" />
                  <circle cx="114.5" cy="81.5" r="1.4" fill="#ffffff" />
                </g>
                <path
                  d="M94 90 Q100 96 106 90"
                  fill="none"
                  stroke="#0f172a"
                  strokeWidth="2.8"
                  strokeLinecap="round"
                />

                {/* Combination Dial */}
                <g className="safe-dial">
                  <circle
                    cx="100"
                    cy="116"
                    r="18"
                    fill="#cbd5e1"
                    stroke="#0f172a"
                    strokeWidth="2.8"
                  />
                  <circle
                    cx="100"
                    cy="116"
                    r="11"
                    fill="#64748b"
                    stroke="#0f172a"
                    strokeWidth="2"
                  />
                  <circle
                    cx="100"
                    cy="116"
                    r="4"
                    fill="#cbd5e1"
                    stroke="#0f172a"
                    strokeWidth="1.5"
                  />
                  <line x1="100" y1="99" x2="100" y2="103" stroke="#0f172a" strokeWidth="2" />
                  <line x1="100" y1="129" x2="100" y2="133" stroke="#0f172a" strokeWidth="2" />
                  <line x1="83" y1="116" x2="87" y2="116" stroke="#0f172a" strokeWidth="2" />
                  <line x1="113" y1="116" x2="117" y2="116" stroke="#0f172a" strokeWidth="2" />
                </g>
              </g>

              {/* Floating Dollar Bills */}
              <g className="bill-1" transform="translate(36, 18) rotate(5)">
                <rect
                  width="28"
                  height="14"
                  rx="2"
                  fill="#22c55e"
                  stroke="#0f172a"
                  strokeWidth="1.8"
                />
                <text
                  x="14"
                  y="10.5"
                  fontSize="9"
                  fontWeight="800"
                  textAnchor="middle"
                  fill="#0f172a"
                >
                  $
                </text>
              </g>
              <g className="bill-2" transform="translate(42, 50) rotate(-14)">
                <rect
                  width="34"
                  height="17"
                  rx="2"
                  fill="#22c55e"
                  stroke="#0f172a"
                  strokeWidth="1.8"
                />
                <text
                  x="17"
                  y="12.5"
                  fontSize="10"
                  fontWeight="800"
                  textAnchor="middle"
                  fill="#0f172a"
                >
                  $
                </text>
              </g>
              <g className="bill-3" transform="translate(65, 76) rotate(-32)">
                <rect
                  width="30"
                  height="15"
                  rx="2"
                  fill="#22c55e"
                  stroke="#0f172a"
                  strokeWidth="1.8"
                />
                <text
                  x="15"
                  y="11"
                  fontSize="9"
                  fontWeight="800"
                  textAnchor="middle"
                  fill="#0f172a"
                >
                  $
                </text>
              </g>
              <g className="bill-4" transform="translate(115, 96) rotate(22)">
                <rect
                  width="34"
                  height="17"
                  rx="2"
                  fill="#22c55e"
                  stroke="#0f172a"
                  strokeWidth="1.8"
                />
                <text
                  x="17"
                  y="12.5"
                  fontSize="10"
                  fontWeight="800"
                  textAnchor="middle"
                  fill="#0f172a"
                >
                  $
                </text>
              </g>
              <g className="bill-5" transform="translate(82, 152) rotate(28)">
                <rect
                  width="32"
                  height="16"
                  rx="2"
                  fill="#22c55e"
                  stroke="#0f172a"
                  strokeWidth="1.8"
                />
                <text
                  x="16"
                  y="11.5"
                  fontSize="9.5"
                  fontWeight="800"
                  textAnchor="middle"
                  fill="#0f172a"
                >
                  $
                </text>
              </g>
            </svg>
          </div>

          {/* Text & Status Pills */}
          <div className="brand-text">
            <div className="brand-title-row">
              <div className="brand-title">
                <span className="word-org">Org</span>
                <span className="word-vault">Vault</span>
              </div>
              <span className="corner-bracket" aria-hidden="true" />
            </div>
            <p className="brand-subtitle">
              Smart treasury, instant team reimbursements, and transparent fund tracking.
            </p>
            <div className="badge-row">
              <span className="status-pill">
                <span className="status-dot" />
                Vault Active
              </span>
              <span className="status-pill payout-pill">
                Instant QR &amp; BSC Payouts
              </span>
              {orgName && (
                <span className="status-pill">
                  &#10003; {orgName}
                  {university ? ` · ${university}` : ""}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="cta-actions">
          <Link href="/pay-dues" className="cta-btn-secondary">
            <span className="cta-coin">₱</span>
            <span>Pay Dues</span>
          </Link>
          <Link href="/reimbursements" className="cta-btn">
            <span className="cta-coin">$</span>
            <span>+ New Claim</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
