import React from "react";
import ApexCharts from "react-apexcharts";
import type { Props as ApexChartProps } from "react-apexcharts";

type ResponsiveApexChartProps = Omit<ApexChartProps, "width"> & {
  className?: string;
};

export default function ResponsiveApexChart({
  className,
  ...chartProps
}: ResponsiveApexChartProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [width, setWidth] = React.useState(0);

  React.useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const updateWidth = () => {
      const nextWidth = element.getBoundingClientRect().width;
      setWidth(nextWidth > 0 ? nextWidth : 0);
    };

    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className={className ?? "w-full"}>
      {width > 0 && <ApexCharts {...chartProps} width={width} />}
    </div>
  );
}
