import { Bone, SkeletonHeader, SkeletonPage, SkeletonRows } from "@/components/admin/Skeleton";

export default function Loading() {
  return (
    <SkeletonPage>
      <SkeletonHeader action />
      <div className="flex gap-2">
        <Bone className="h-8 w-40 rounded-full" />
        <Bone className="h-8 w-24 rounded-full" />
        <Bone className="h-8 w-24 rounded-full" />
      </div>
      <div className="flex flex-wrap gap-2">
        <Bone className="h-10 min-w-[220px] flex-1" />
        <Bone className="h-10 w-40" />
        <Bone className="h-10 w-44" />
      </div>
      <SkeletonRows rows={8} />
    </SkeletonPage>
  );
}
