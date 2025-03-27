import React, { useState, useEffect, useContext } from "react";
import { useAccountStats } from "../hooks/useAccount";
import { formatPrice } from "../hooks/contractHelper";
import {
  afterDate,
  api_key,
  contract,
  dateFormat,
  DEFAULT_CHAIN,
  formatDateWithZone,
  SUPPORTED_CHAIN,
  userTransactionQuery,
} from "../hooks/constant";
import { trimAddress } from "./Transcations";
import ClipLoader from "react-spinners/ClipLoader";
import { useAccount, useNetwork } from "wagmi";

export default function UserTransaction() {
  const { address } = useAccount();
  const { chain } = useNetwork();
  const accStats = useAccountStats(1);
  const [loading1, setLoading1] = useState(false);
  const [dexData, setDexData] = useState([]);
  let currentChain =
    chain && chain.id
      ? SUPPORTED_CHAIN.includes(chain.id)
        ? chain.id
        : DEFAULT_CHAIN
      : DEFAULT_CHAIN;

  const override = {
    display: "block",
    position: "absolute",
    top: "60%",
    left: "50%",
  };

  useEffect(() => {
    if (address) {
      try {
        const variables = {
          limit: 10,
          offset: 0,
          network: contract[currentChain].networkQuery,
          token: contract[currentChain].TOKEN_ADDRESS,
          after: afterDate,
          dateFormat: dateFormat,
          user: address ? address : "",
          weth: contract[currentChain].WETH,
        };

        var config = {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API-KEY": api_key,
          },
          body: JSON.stringify({
            query: userTransactionQuery,
            variables: variables,
          }),
        };

        fetch("https://graphql.bitquery.io", config)
          .then((response) => response.json())
          .then((response) => {
            if (response.data) {
              console.log(response.data);
              setDexData(response.data.ethereum.dexTrades);

              setLoading1(false);
            } else {
              console.log(response);
            }
          })
          .catch(function (error) {
            console.log(error);
          });
      } catch (err) {
        console.log(err.message);
      }
    }
    // eslint-disable-next-line
  }, [address, chain]);

  return (
    <div className="default-height bg-primary-gradient">
      <div className="main-content side-content pt-0">
        <div className="main-container container-fluid">
          <div className="inner-body">
            <div
              className="page-header"
              style={{ paddingTop: "2rem", marginBottom: "2rem" }}
            >
              <div>
                <h2 className="main-content-title tx-24 mg-b-5">
                  Welcome To Account
                </h2>
              </div>
            </div>
            <div className="row row-sm">
              <div className="col-md-12 col-lg-12 col-xl-12">
                <div className="card custom-card transcation-crypto">
                  <div className="card-header border-bottom-0">
                    <div className="main-content-label">
                      Your Transaction History
                    </div>
                  </div>
                  <div className="card-body">
                    <div className="table-responsive">
                      <table className="table text-nowrap text-md-nowrap  table-bordered">
                        <thead>
                          <tr role="row">
                            <th>Transaction Hash</th>
                            <th>Timestamp</th>
                            <th>Action</th>
                            <th>Price (USD)</th>
                            <th>Token Amount</th>
                            <th>Total Value (USD)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {!loading1 && dexData && dexData.length > 0 ? (
                            dexData.map((rowdata, index) => {
                              return (
                                <tr className="border-bottom odd" key={index}>
                                  <td>
                                    <a
                                      target="_balnk"
                                      className="text-white"
                                      href={`${
                                        contract[currentChain].EXPLORE
                                      }/tx/${
                                        rowdata.transaction.hash
                                          ? rowdata.transaction.hash
                                          : ""
                                      }`}
                                    >
                                      {trimAddress(
                                        rowdata.transaction.hash
                                          ? rowdata.transaction.hash
                                          : ""
                                      )}
                                    </a>
                                  </td>
                                  <td>
                                    {rowdata.block.timestamp.time
                                      ? formatDateWithZone(
                                          rowdata.block.timestamp.time
                                        )
                                      : " - "}
                                  </td>
                                  <td>
                                    {rowdata.buyCurrency.symbol ? (
                                      rowdata.buyCurrency.symbol ===
                                      "LockChain" ? (
                                        <>
                                          SELL{" "}
                                          <i className="fas fa-level-down-alt ms-2 text-danger m-l-10"></i>
                                        </>
                                      ) : (
                                        <>
                                          BUY{" "}
                                          <i className="fas fa-level-up-alt ms-2 text-success m-l-10"></i>
                                        </>
                                      )
                                    ) : (
                                      "-"
                                    )}
                                  </td>
                                  <td>
                                    $
                                    {rowdata.base_amount_usd &&
                                    rowdata.buyAmount &&
                                    rowdata.buyCurrency.symbol
                                      ? rowdata.buyCurrency.symbol ===
                                        "LockChain"
                                        ? formatPrice(
                                            parseFloat(
                                              rowdata.base_amount_usd
                                            ) / parseFloat(rowdata.buyAmount)
                                          )
                                        : formatPrice(
                                            parseFloat(
                                              rowdata.quote_amount_usd
                                            ) / parseFloat(rowdata.sellAmount)
                                          )
                                      : 0}
                                  </td>
                                  <td>
                                    {rowdata.buyCurrency.symbol
                                      ? rowdata.buyCurrency.symbol ===
                                        "LockChain"
                                        ? parseFloat(rowdata.buyAmount).toFixed(
                                            3
                                          )
                                        : parseFloat(
                                            rowdata.sellAmount
                                          ).toFixed(3)
                                      : "-"}{" "}
                                    LockChain
                                  </td>
                                  <td>
                                    $
                                    {accStats &&
                                      accStats.token_price &&
                                      (rowdata.buyCurrency.symbol
                                        ? rowdata.buyCurrency.symbol ===
                                          "LockChain"
                                          ? parseFloat(
                                              rowdata.buyAmount *
                                                accStats.token_price
                                            ).toFixed(3)
                                          : parseFloat(
                                              rowdata.sellAmount *
                                                accStats.token_price
                                            ).toFixed(3)
                                        : "-")}
                                  </td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr className="border-bottom odd">
                              <td colSpan={6} className="text-center">
                                No record Found
                              </td>
                            </tr>
                          )}
                          {loading1 && (
                            <tr className="text-center">
                              <td colspan="6" height={300}>
                                <ClipLoader
                                  color="#000"
                                  loading={true}
                                  cssOverride={override}
                                  size={50}
                                  // className="spinner"
                                />
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
