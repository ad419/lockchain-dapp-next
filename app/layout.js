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

export default function RootLayout({ children }) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <html lang="en" className="ltr main-body leftmenu">
      <head>
        <meta charSet="UTF-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, shrink-to-fit=no"
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
        <link
          href="/assets/plugins/select2/css/select2.min.css"
          rel="stylesheet"
        />
        <link
          href="/assets/plugins/multipleselect/multiple-select.css"
          rel="stylesheet"
        />
        <link
          href="/assets/plugins/datatable/css/dataTables.bootstrap5.css"
          rel="stylesheet"
        />
        <link
          href="/assets/plugins/datatable/css/buttons.bootstrap5.min.css"
          rel="stylesheet"
        />
        <link
          href="/assets/plugins/datatable/css/responsive.bootstrap5.css"
          rel="stylesheet"
        />
        <link href="/assets/switcher/css/switcher.css" rel="stylesheet" />
        <link href="/assets/switcher/demo.css" rel="stylesheet" />
        <meta httpEquiv="imagetoolbar" content="no" />
      </head>
      <body suppressHydrationWarning={true} className="ltr main-body leftmenu">
        <div className="horizontalMenucontainer">
          <SessionProvider
            refetchInterval={5 * 60}
            refetchOnWindowFocus={true}
            session={null}
          >
            <WagmiConfig config={wagmiConfig}>
              <ContextProvider>
                <Header />
                {children}
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
