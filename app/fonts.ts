import { Bebas_Neue, Lugrasimo } from "next/font/google"
import localFont from "next/font/local"

export const bebasNeue = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  variable: "--font-bebas-neue",
})

export const lugrasimo = Lugrasimo({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  variable: "--font-lugrasimo",
})

export const legendScript = localFont({
  src: [
    {
      path: "../public/fonts/LegendScript.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/fonts/LegendScript.woff",
      weight: "400",
      style: "normal",
    },
  ],
  variable: "--font-legend-script",
  display: "swap",
})
