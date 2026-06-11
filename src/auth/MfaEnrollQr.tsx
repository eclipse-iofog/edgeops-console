import React, { type FC } from "react";
import { QRCodeSVG } from "qrcode.react";

type MfaEnrollQrProps = {
  otpauthUrl: string;
  size?: number;
  className?: string;
};

const MfaEnrollQr: FC<MfaEnrollQrProps> = ({
  otpauthUrl,
  size = 180,
  className,
}) => {
  return (
    <div
      className={className}
      style={{
        display: "inline-flex",
        padding: 12,
        background: "#fff",
        borderRadius: 8,
      }}
    >
      <QRCodeSVG value={otpauthUrl} size={size} level="M" />
    </div>
  );
};

export default MfaEnrollQr;
