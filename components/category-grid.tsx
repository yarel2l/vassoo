"use client"

import { Card, CardContent } from "@/components/ui/card"
import { useLanguage } from "@/components/language-provider"
import { Wine, Zap, Beer, Martini } from "lucide-react"
import Link from "next/link"

export default function CategoryGrid() {
  const { t } = useLanguage()

  const categories = [
    {
      icon: Wine,
      title: t("categories.wines"),
      description: t("categories.wines.desc"),
      href: "/wines",
      gradient: "wine-gradient",
      iconColor: "text-red-100",
    },
    {
      icon: Zap,
      title: t("categories.spirits"),
      description: t("categories.spirits.desc"),
      href: "/spirits",
      gradient: "whiskey-gradient",
      iconColor: "text-amber-100",
    },
    {
      icon: Beer,
      title: t("categories.beers"),
      description: t("categories.beers.desc"),
      href: "/beers",
      gradient: "beer-gradient",
      iconColor: "text-yellow-100",
    },
    {
      icon: Martini,
      title: t("categories.cocktails"),
      description: t("categories.cocktails.desc"),
      href: "/cocktails",
      gradient: "cocktail-gradient",
      iconColor: "text-blue-100",
    },
  ]

  return (
    <section className="py-16 px-4">
      <div className="container mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">{t("categories.title")}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {categories.map((category) => {
            const IconComponent = category.icon
            return (
              <Link key={category.href} href={category.href}>
                <Card className="group cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl overflow-hidden">
                  <CardContent className="p-0">
                    <div className={`${category.gradient} p-8 text-center relative overflow-hidden`}>
                      <div className="absolute inset-0 bg-black/10"></div>
                      <div className="relative z-10">
                        <IconComponent className={`w-12 h-12 mx-auto mb-4 ${category.iconColor}`} />
                        <h3 className="text-xl font-bold text-white mb-2">{category.title}</h3>
                        <p className="text-white/90 text-sm">{category.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}
