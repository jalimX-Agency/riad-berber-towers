import { Bone, SkeletonCard, SkeletonPage } from "@/components/admin/Skeleton";

// Dashboard
export default function Loading() {
  return (
    <SkeletonPage className="gap-8">
      <div className="grid gap-2">
        <Bone className="h-3 w-48" />
        <Bone className="h-9 w-56" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="grid gap-3 rounded-[10px] border border-rule bg-snow p-5">
            <Bone className="h-4 w-36" />
            <Bone className="h-9 w-16" />
          </div>
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <SkeletonCard lines={3} />
        <SkeletonCard lines={3} />
      </div>
      <SkeletonCard lines={4} />
    </SkeletonPage>
  );
}
