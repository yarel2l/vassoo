"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, ShoppingCart, User, ShoppingBag } from "lucide-react"
import { useLanguage } from "@/components/language-provider"
import { useCart } from "@/contexts/cart-context"

export default function MobileBottomNav() {
  const pathname = usePathname()
  const { t } = useLanguage()
  const { totalItems } = useCart()

  const navItems = [
    {
      href: "/",
      icon: Home,
      label: t("mobile.explorer"),
      isActive: pathname === "/",
    },
    {
      href: "/cart",
      icon: ShoppingCart,
      label: t("mobile.cart"),
      isActive: pathname === "/cart",
      badge: totalItems > 0 ? totalItems : undefined,
    },
    {
      href: "/purchases",
      icon: ShoppingBag,
      label: t("mobile.purchases"),
      isActive: pathname === "/purchases",
    },
    {
      href: "/account",
      icon: User,
      label: "Account",
      isActive: pathname === "/account",
    },
  ]

  return (
    <>
      {/* Mobile Bottom Navigation */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t">
        <div className="grid grid-cols-4 h-16">
          {/* Navigation Items */}
          {navItems.map((item) => {
            const IconComponent = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center space-y-1 transition-colors relative ${
                  item.isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <div className="relative">
                  <IconComponent className="h-5 w-5" />
                  {item.badge && (
                    <span className="absolute -top-2 -right-2 h-4 w-4 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">
                      {item.badge > 99 ? "99+" : item.badge}
                    </span>
                  )}
                </div>
                <span className="text-xs font-medium">{item.label}</span>
                {item.isActive && (
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full"></div>
                )}
              </Link>
            )
          })}
        </div>
      </div>

      {/* Spacer for mobile bottom nav */}
      <div className="sm:hidden h-16"></div>
    </>
  )
}
