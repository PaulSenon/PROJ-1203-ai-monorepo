import * as React from "react";

export function Pulse2Icon({
  size = 24,
  color = "currentColor",
  strokeWidth = 2,
  className,
  ...props
}: React.SVGProps<SVGSVGElement> & {
  size?: number;
  color?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <circle cx="12" cy="12" r="0"><animate id="SVG0cdVlcnN" attributeName="r" begin="0;SVGftllRbIv.begin+0.9s" calcMode="spline" dur="1.8s" keySplines=".52,.6,.25,.99" values="0;11"/><animate attributeName="opacity" begin="0;SVGftllRbIv.begin+0.9s" calcMode="spline" dur="1.8s" keySplines=".52,.6,.25,.99" values="1;0"/></circle><circle cx="12" cy="12" r="0"><animate id="SVGftllRbIv" attributeName="r" begin="SVG0cdVlcnN.begin+0.9s" calcMode="spline" dur="1.8s" keySplines=".52,.6,.25,.99" values="0;11"/><animate attributeName="opacity" begin="SVG0cdVlcnN.begin+0.9s" calcMode="spline" dur="1.8s" keySplines=".52,.6,.25,.99" values="1;0"/></circle>
    </svg>
  );
}
