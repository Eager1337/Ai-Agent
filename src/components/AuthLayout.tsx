import { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface AuthLayoutProps {
  children: ReactNode
  className?: string
}

export function AuthLayout({ children, className }: AuthLayoutProps) {
  return (
    <div className={cn("min-h-screen grid place-items-center grid-bg px-4 py-12", className)}>
      <div className="w-full max-w-md">
        {children}
      </div>
    </div>
  )
}
