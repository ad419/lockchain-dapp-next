import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import ContentPasteIcon from "@mui/icons-material/ContentPaste";
import React, { useEffect, useState } from "react";
import { CopyToClipboard } from "react-copy-to-clipboard";
import { useAccount } from "wagmi";
import styles from "../styles/referral.module.css";

export default function ReferralShare() {
  const { address } = useAccount();
  const [referrallink, setReferrallink] = useState(
    "Please connect your wallet"
  );
  const [refcopy, setRefcopy] = useState(false);
  let base_url = `${window.location.origin}/swap?ref=`;

  useEffect(() => {
    if (address) {
      setReferrallink(`${base_url}${address}`);
    } else {
      setReferrallink("Please connect your wallet");
    }
  }, [address, base_url]);

  return (
    <div className="row mt-4 mb-5 d-flex justify-content-center">
      <div className="col-md-8 col-lg-6">
        <div
          className={`card ${styles.referralCard}`}
          style={{
            background: "transparent",
            border: "1px solid rgba(255, 255, 255, 0.066)",
          }}
        >
          <div
            className="ref-main text-center text-white"
            style={{ background: "transparent" }}
          >
            <article className="presentation">
              <h2 className="page-title text-website">
                Refer Friends.Earn Reward
              </h2>
              <p className="description">
                Earn up to 3% commission on every swap.
              </p>
            </article>
            <div className="input-group mx-3 my-3 d-flex justify-content-center">
              <input
                type="text"
                className="ref-input"
                value={referrallink}
                readOnly={true}
                style={{
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  color: "white",
                }}
              />
              <span
                className="input-group-text"
                id="basic-addon2"
                style={{
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  cursor: "pointer",
                }}
              >
                <CopyToClipboard
                  text={`${base_url}${address}`}
                  onCopy={() => {
                    setRefcopy(true);
                    setTimeout(() => {
                      setRefcopy(false);
                    }, 2000);
                  }}
                >
                  {refcopy ? (
                    <ContentPasteIcon sx={{ color: "#fff" }} fontSize="small" />
                  ) : (
                    <ContentCopyIcon sx={{ color: "#fff" }} fontSize="small" />
                  )}
                </CopyToClipboard>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
