"use client";

import { WagmiConfig } from "wagmi";
import { Web3Modal } from "@web3modal/react";
import { ethereumClient, wagmiConfig } from "./hooks/wagmi";
import { PROJECT_ID } from "./hooks/constant";
import { ContextProvider } from "./context/context";
import Script from "next/script";
import Header from "./components/Header";
import { useState, useEffect } from "react";
import { SessionProvider } from "next-auth/react";
import { ToastProvider } from "./context/ToastContext";
import { WalletClaimProvider } from "./context/WalletClaimContext"; // Add this import
import { DataCacheProvider } from "./context/DataCacheContext";
import { GlobalMessagesProvider } from "./context/GlobalMessagesContext";
import GlobalMessageBubble from "./components/GlobalMessageBubble";
import { PriceProvider } from "./context/PriceContext";
import Footer from "./components/Footer";

export default function RootLayout({ children }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <html lang="en" className="ltr main-body leftmenu">
      <head>
        <meta charSet="UTF-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
        />
        <meta name="description" content="LockChain" />
        <meta name="keywords" content="LockChain" />
        <title>LockChain</title>
        {/* Favicon */}
        <link rel="icon" href="/favicon.ico" type="image/x-icon" />
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/apple-touch-icon.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/favicon-32x32.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href="/favicon-16x16.png"
        />
        {/* Stylesheets */}
        <link
          id="style"
          href="/assets/plugins/bootstrap/css/bootstrap.min.css"
          rel="stylesheet"
        />
        <link href="/assets/plugins/web-fonts/icons.css" rel="stylesheet" />
        <link
          href="/assets/plugins/web-fonts/font-awesome/font-awesome.min.css"
          rel="stylesheet"
        />
        <link href="/assets/plugins/web-fonts/plugin.css" rel="stylesheet" />
        <link href="/assets/css/style.css" rel="stylesheet" />
        {/* <link
          href="/assets/plugins/select2/css/select2.min.css"
          rel="stylesheet"
        /> */}
        <link
          href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&family=Montserrat:wght@400;700&family=Poppins:wght@400;700&family=Playfair+Display:wght@400;700&family=Pacifico&family=Fira+Code&family=Nunito:wght@400;700&family=Raleway:wght@400;700&family=Dancing+Script&family=Oswald&family=Space+Grotesk:wght@400;700&family=Caveat&display=swap"
          rel="stylesheet"
        />
        <link
          href="/assets/plugins/multipleselect/multiple-select.css"
          rel="stylesheet"
        />
        {/* <link
          href="/assets/plugins/datatable/css/dataTables.bootstrap5.css"
          rel="stylesheet"
        /> */}
        {/* <link
          href="/assets/plugins/datatable/css/buttons.bootstrap5.min.css"
          rel="stylesheet"
        /> */}
        {/* <link
          href="/assets/plugins/datatable/css/responsive.bootstrap5.css"
          rel="stylesheet"
        /> */}
        <link href="/assets/switcher/css/switcher.css" rel="stylesheet" />
        <link href="/assets/switcher/demo.css" rel="stylesheet" />
        <meta httpEquiv="imagetoolbar" content="no" />
        {/* Font Links */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Comic+Sans+MS&family=Courier+New&family=Georgia&family=Impact&family=Lucida+Console&family=Trebuchet+MS&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap"
          rel="stylesheet"
        />
      </head>
      <body suppressHydrationWarning={true} className="ltr main-body leftmenu">
        <div className="horizontalMenucontainer">
          <SessionProvider refetchInterval={0}>
            <WagmiConfig config={wagmiConfig}>
              <ContextProvider>
                <ToastProvider>
                  <WalletClaimProvider>
                    <DataCacheProvider>
                      <GlobalMessagesProvider>
                        <PriceProvider>
                          {mounted && <Header />}
                          {children}
                          {mounted && <Footer />}
                        </PriceProvider>
                        <GlobalMessageBubble />
                      </GlobalMessagesProvider>
                    </DataCacheProvider>
                  </WalletClaimProvider>
                </ToastProvider>
              </ContextProvider>
            </WagmiConfig>
          </SessionProvider>
          <Web3Modal
            projectId={PROJECT_ID}
            ethereumClient={ethereumClient}
            themeVariables={{
              "--w3m-accent-color": "#1353FF",
              "--w3m-background-color": "#1353FF",
            }}
          />
        </div>
        {/* Scripts */}
        <Script
          src="/assets/plugins/jquery/jquery.min.js"
          strategy="beforeInteractive"
        />
        <Script
          src="/assets/plugins/bootstrap/js/popper.min.js"
          strategy="beforeInteractive"
        />
        <Script
          src="/assets/plugins/bootstrap/js/bootstrap.min.js"
          strategy="beforeInteractive"
        />
        <Script
          src="/assets/plugins/perfect-scrollbar/perfect-scrollbar.min.js"
          strategy="afterInteractive"
        />
        <Script
          src="/assets/plugins/sidemenu/sidemenu.js"
          strategy="afterInteractive"
        />
        <Script src="/assets/js/themeColors.js" strategy="afterInteractive" />
        <Script src="/assets/js/sticky.js" strategy="afterInteractive" />
        <Script src="/assets/js/custom.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
