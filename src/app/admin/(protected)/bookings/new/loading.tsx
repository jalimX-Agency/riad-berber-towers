import { SkeletonCard, SkeletonHeader, SkeletonPage } from "@/components/admin/Skeleton";

export default function Loading() {
  return (
    <SkeletonPage className="max-w-3xl">
      <SkeletonHeader />
      <SkeletonCard lines={4} />
      <SkeletonCard lines={6} />
    </SkeletonPage>
  );
}
