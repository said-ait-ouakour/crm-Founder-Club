import Link from 'next/link';
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 p-4 text-center">
      <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
        404 - Page Not Found
      </h1>
      <p className="text-lg text-gray-600">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Button asChild>
        <Link href="/" className="mt-4">
          Go back home
        </Link>
      </Button>
    </div>
  );
}
