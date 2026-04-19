import React, {PropsWithChildren} from 'react';
import Image from 'next/image';
import Script from 'next/script';

import {MiroSDKInit} from '../components/SDKInit';
import {Export} from '../components/Export';

export default function RootLayout({children}: PropsWithChildren) {
  return (
    <html>
      <body>
        <Script
          src="https://miro.com/app/static/sdk/v2/miro.js"
          strategy="beforeInteractive"
        />
        <MiroSDKInit />
        <div id="root">
          <div className="grid">
            <div className="cs1 ce12">{children}</div>
            <hr className="cs1 ce12" />
          </div>
        </div>
      </body>
    </html>
  );
}
