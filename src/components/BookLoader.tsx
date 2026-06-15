import { cn } from "@/lib/utils";
import LoaderSVG from "@/animations/Book Loader.svg?react";

interface BookLoaderProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeMap: Record<string, string> = {
  xs: "h-4 w-4",
  sm: "h-10 w-10",
  md: "h-16 w-16",
  lg: "h-20 w-20",
  xl: "h-[110px] w-[110px]",
};

export default function BookLoader({ size = "md", className }: BookLoaderProps) {
  return <LoaderSVG className={cn(sizeMap[size], className)} />;
}
