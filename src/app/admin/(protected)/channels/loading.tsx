import { SkeletonCard, SkeletonHeader, SkeletonPage } from "@/components/admin/Skeleton";

export default function Loading() {
  return (
    <SkeletonPage className="max-w-5xl gap-8">
      <SkeletonHeader action />
      <SkeletonCard lines={3} />
      <SkeletonCard lines={5} />
      <SkeletonCard lines={5} />
    </SkeletonPage>
  );
}
