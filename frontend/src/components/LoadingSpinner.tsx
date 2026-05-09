interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizes = {
  sm: "w-4 h-4 border-2",
  md: "w-6 h-6 border-2",
  lg: "w-10 h-10 border-3",
};

export default function LoadingSpinner({
  size = "md",
  className = "",
}: LoadingSpinnerProps) {
  return (
    <div
      className={`
        ${sizes[size]} rounded-full
        border-gray-200 border-t-[#0D1B2A]
        animate-spin ${className}
      `}
      role="status"
      aria-label="Loading"
    />
  );
}
