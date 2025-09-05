import * as React from "react";
import { cn } from "../lib/utils";

type SelectOnChange = (value: string) => void;

export interface SelectRootProps {
	value: string;
	onValueChange: SelectOnChange;
	children: React.ReactNode;
	className?: string;
	ariaLabel?: string;
}

export interface SelectItemProps {
	value: string;
	children: React.ReactNode;
}

export interface SelectValueProps {
	placeholder?: string;
}

// Phantom components used only for structure compatibility
export function SelectTrigger({ className, children }: { className?: string; children?: React.ReactNode }) {
	return <div className={className}>{children}</div>;
}
SelectTrigger.displayName = "SelectTrigger";

export function SelectValue({ placeholder }: SelectValueProps) {
	return <span data-placeholder={placeholder} />;
}
SelectValue.displayName = "SelectValue";

export function SelectContent({ children }: { children?: React.ReactNode }) {
	return <div>{children}</div>;
}
SelectContent.displayName = "SelectContent";

export function SelectItem({ value, children }: SelectItemProps) {
	return <div data-select-item value={value}>{children}</div>;
}
SelectItem.displayName = "SelectItem";

// Helper: extract placeholder and items from the composed children
function extractData(children: React.ReactNode) {
	let placeholder: string | undefined;
	const items: Array<{ value: string; label: string }> = [];

	React.Children.forEach(children as React.ReactNode, (child) => {
		if (!React.isValidElement(child)) return;
		if ((child.type as any).displayName === "SelectTrigger") {
			React.Children.forEach(child.props.children, (sub: any) => {
				if (React.isValidElement(sub) && (sub.type as any).displayName === "SelectValue") {
					placeholder = sub.props.placeholder;
				}
			});
		}
		if ((child.type as any).displayName === "SelectContent") {
			React.Children.forEach(child.props.children, (item: any) => {
				if (React.isValidElement(item) && (item.type as any).displayName === "SelectItem") {
					const value = item.props.value;
					const label = typeof item.props.children === "string" ? item.props.children : String(item.props.children);
					items.push({ value, label });
				}
			});
		}
	});

	return { placeholder: placeholder ?? "请选择", items };
}

export function Select({ value, onValueChange, children, className, ariaLabel }: SelectRootProps) {
	const { placeholder, items } = extractData(children);

	return (
		<div className={cn("inline-block", className)}>
			<select
				aria-label={ariaLabel || placeholder}
				className={cn(
					"h-10 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm",
					"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
					"disabled:cursor-not-allowed disabled:opacity-50"
				)}
				value={value}
				onChange={(e) => onValueChange(e.target.value)}
			>
				<option value="" disabled>{placeholder}</option>
				{items.map((it) => (
					<option key={it.value} value={it.value}>{it.label}</option>
				))}
			</select>
		</div>
	);
}

export default Select;
