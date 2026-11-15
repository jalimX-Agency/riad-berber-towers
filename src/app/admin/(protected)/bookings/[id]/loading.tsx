import { Bone, SkeletonCard, SkeletonPage } from "@/components/admin/Skeleton";

export default function Loading() {
  return (
    <SkeletonPage>
      <Bone className="h-4 w-28" />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="grid gap-2">
          <Bone className="h-4 w-44" />
          <Bone className="h-10 w-72" />
          <Bone className="h-4 w-60" />
        </div>
        <Bone className="h-7 w-32 rounded-full" />
      </div>
      <Bone className="h-20 w-full rounded-[10px]" />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="grid content-start gap-6">
          <SkeletonCard lines={6} />
          <SkeletonCard lines={3} />
        </div>
        <div className="grid content-start gap-6">
          <SkeletonCard lines={5} />
          <SkeletonCard lines={4} />
        </div>
      </div>
    </SkeletonPage>
  );
}
