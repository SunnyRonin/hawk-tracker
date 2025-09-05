import * as React from "react";
import { cn } from "../lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
	variant?: "default" | "secondary" | "destructive" | "outline";
}

export function Badge({
	className,
	variant = "default",
	...props
}: BadgeProps) {
	const baseClasses =
		"inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none";

	const variantClasses: Record<NonNullable<BadgeProps["variant"]>, string> = {
		default: "bg-slate-900 text-white border-transparent dark:bg-slate-50 dark:text-slate-900",
		secondary:
			"bg-slate-100 text-slate-900 border-transparent dark:bg-slate-800 dark:text-slate-100",
		destructive:
			"bg-red-100 text-red-900 border-transparent dark:bg-red-900/30 dark:text-red-300",
		outline: "text-slate-900 dark:text-slate-100",
	};

	return (
		<div className={cn(baseClasses, variantClasses[variant], className)} {...props} />
	);
}

export default Badge;

