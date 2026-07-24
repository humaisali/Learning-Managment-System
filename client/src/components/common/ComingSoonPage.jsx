import { Construction } from "lucide-react";

export default function ComingSoonPage({ title = "This page", description }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="mb-4 rounded-full bg-gray-100 p-4">
        <Construction className="h-8 w-8 text-gray-400" />
      </div>
      <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
      <p className="mt-2 max-w-md text-sm text-gray-500">
        {description || "This section is under development and will be available soon. Check back later."}
      </p>
    </div>
  );
}
