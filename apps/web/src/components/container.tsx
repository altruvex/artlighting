import { cn } from "@/lib/utils"

interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode
    className?: string
}

export function Container({
    children,
    className = "",
    ...props
}: ContainerProps) {
    return (
        <div className={cn("mx-auto w-full max-w-screen-2xl px-4 sm:px-6 lg:px-10", className ?? "")} {...props}>
            {children}
        </div>
    )
}
