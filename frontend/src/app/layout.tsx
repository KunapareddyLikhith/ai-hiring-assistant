import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "HunarHire | AI Recruitment Search, Reachout & Attendance System",
  description: "Advanced hiring assistant platform. Match candidates from Job Descriptions using Apollo/Proxycurl/PDL, initiate automated Voice AI screening via Hunar.AI, and track attendance conceptually via smart IVR.",
  authors: [{ name: "Antigravity AI Agent" }],
  keywords: ["AI Recruiter", "Hunar.AI", "Voice Calling", "Candidate Search", "People Data Labs", "Apollo.io", "Attendance System"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-gray-950 text-gray-100 font-sans">
        {children}
      </body>
    </html>
  );
}
