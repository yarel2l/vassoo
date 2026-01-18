import FavoritesClientPage from "./FavoritesClientPage"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "My Favorites - Premium Beverages | Vassoo",
  description:
    "View and manage your favorite wines, spirits, beers and cocktails. Save products for later and never lose track of your preferred beverages.",
  openGraph: {
    title: "My Favorites - Premium Beverages | Vassoo",
    description: "View and manage your favorite wines, spirits, beers and cocktails.",
  },
}

export default function FavoritesPage() {
  return <FavoritesClientPage />
}
