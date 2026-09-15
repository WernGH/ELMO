import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ELMO — AI Workforce Operating System",
  description: "Secure Command Center for ELMO AI CEO and Autonomous Specialist Workforce.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-background text-elmo-text antialiased min-h-screen selection:bg-elmo-cyan selection:text-black">
        {children}
      </body>
    </html>
  );
}
