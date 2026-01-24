import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface QuickActionCardProps {
  title: string;
  to: string;
  gradient?: string;
  className?: string;
}

const gradients = [
  "from-teal-400 via-cyan-500 to-blue-500",
  "from-purple-400 via-pink-500 to-red-400",
  "from-amber-400 via-orange-500 to-red-500",
  "from-green-400 via-emerald-500 to-teal-500",
  "from-blue-400 via-indigo-500 to-purple-500",
  "from-rose-400 via-fuchsia-500 to-purple-500",
];

export const QuickActionCard = ({
  title,
  to,
  gradient,
  className,
}: QuickActionCardProps) => {
  // Generate a consistent gradient based on title
  const index = title.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) % gradients.length;
  const bgGradient = gradient || gradients[index];

  return (
    <Link
      to={to}
      className={cn(
        "relative overflow-hidden rounded-xl p-4 h-24 flex items-end transition-transform hover:scale-[1.02] active:scale-[0.98]",
        className
      )}
    >
      {/* Background with gradient overlay */}
      <div className={cn("absolute inset-0 bg-gradient-to-br opacity-80", bgGradient)} />
      
      {/* Decorative circles */}
      <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full bg-white/20 blur-xl" />
      <div className="absolute top-1/2 -left-4 w-12 h-12 rounded-full bg-white/10 blur-lg" />
      
      {/* Content */}
      <span className="relative z-10 text-white font-medium text-sm drop-shadow-sm">
        {title}
      </span>
    </Link>
  );
};
