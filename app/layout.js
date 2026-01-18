import './globals.css';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'MeetMind | AI Meeting Copilot',
  description: 'Turn data into decisions.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-black text-white selection:bg-green-700 selection:text-white`}>
        {children}
      </body>
    </html>
  );
}