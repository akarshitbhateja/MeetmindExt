import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="app-bg font-sans text-white">
        {children}
      </body>
    </html>
  );
}
